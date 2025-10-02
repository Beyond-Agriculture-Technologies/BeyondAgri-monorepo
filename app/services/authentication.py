import boto3
import logging
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.account_service import AccountService
from app.utils.phone_validation import normalize_phone_number

logger = logging.getLogger(__name__)


class AuthenticationError(Exception):
    """Base exception for authentication errors"""
    pass


class UserNotFoundError(AuthenticationError):
    """Raised when user is not found"""
    pass


class InvalidCredentialsError(AuthenticationError):
    """Raised when credentials are invalid"""
    pass


class UserAlreadyExistsError(AuthenticationError):
    """Raised when user already exists"""
    pass


class AuthenticationService:
    """
    Authentication service working with the account structure.
    """

    def __init__(self, db: Optional[Session] = None):
        client_config = {
            'region_name': settings.AUTH_REGION or settings.AWS_REGION,
            'aws_access_key_id': settings.AWS_ACCESS_KEY_ID,
            'aws_secret_access_key': settings.AWS_SECRET_ACCESS_KEY
        }

        self.client = boto3.client('cognito-idp', **client_config)
        self.user_pool_id = settings.AUTH_USER_POOL_ID
        self.client_id = settings.AUTH_CLIENT_ID
        self.db = db
        self.account_service = AccountService(db) if db else None

    async def register_user(
        self,
        email: str,
        password: str,
        phone_number: str,
        account_type: str = "farmer",
        **additional_attributes
    ) -> Dict[str, Any]:
        """
        Register a new user with enhanced account structure.
        """
        try:
            # Prepare Cognito attributes
            user_attributes = [
                {'Name': 'email', 'Value': email},
                {'Name': 'name', 'Value': additional_attributes.get('name', email.split('@')[0])},
                {'Name': 'address', 'Value': additional_attributes.get('address', 'N/A')},
                {'Name': 'zoneinfo', 'Value': additional_attributes.get('zoneinfo', 'Africa/Johannesburg')},
                {'Name': 'profile', 'Value': f'{{"account_type": "{account_type}"}}'}
            ]

            # Normalize phone number to E.164 format for Cognito
            normalized_phone = normalize_phone_number(phone_number)
            user_attributes.append({'Name': 'phone_number', 'Value': normalized_phone})

            # Add additional standard attributes
            for key, value in additional_attributes.items():
                if key in ['given_name', 'family_name', 'middle_name', 'nickname', 'gender', 'birthdate', 'locale', 'website', 'picture']:
                    user_attributes.append({'Name': key, 'Value': str(value)})

            # Create user in Cognito
            response = self.client.admin_create_user(
                UserPoolId=self.user_pool_id,
                Username=email,
                UserAttributes=user_attributes,
                TemporaryPassword=password,
                MessageAction='SUPPRESS',
                ForceAliasCreation=True
            )

            # Set permanent password
            self.client.admin_set_user_password(
                UserPoolId=self.user_pool_id,
                Username=email,
                Password=password,
                Permanent=True
            )

            # Extract user_sub
            user_sub = next(
                attr['Value'] for attr in response['User']['Attributes']
                if attr['Name'] == 'sub'
            )

            # Create local account record
            account = None
            if self.account_service:
                try:
                    account = self.account_service.create_account_from_auth_provider(
                        external_auth_id=user_sub,
                        email=email,
                        account_type=account_type,
                        **additional_attributes
                    )
                except Exception as e:
                    logger.warning(f"Failed to create local account record: {e}")

            return {
                'user_id': response['User']['Username'],
                'user_sub': user_sub,
                'email': email,
                'account_type': account_type,
                'phone_number': normalized_phone,
                'status': response['User']['UserStatus'],
                'account': account
            }

        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'UsernameExistsException':
                raise UserAlreadyExistsError(f"User with email {email} already exists")
            else:
                logger.error(f"Registration error: {e}")
                raise AuthenticationError(f"Registration failed: {e}")

    async def authenticate_user(
        self,
        username: str,
        password: str,
        ip_address: str = None,
        user_agent: str = None
    ) -> Dict[str, Any]:
        """
        Authenticate user and update login tracking.
        """
        try:
            # Authenticate with Cognito
            response = self.client.admin_initiate_auth(
                UserPoolId=self.user_pool_id,
                ClientId=self.client_id,
                AuthFlow='ADMIN_NO_SRP_AUTH',
                AuthParameters={
                    'USERNAME': username,
                    'PASSWORD': password
                }
            )

            # Get user details
            user_response = self.client.admin_get_user(
                UserPoolId=self.user_pool_id,
                Username=username
            )

            user_attributes = {
                attr['Name']: attr['Value']
                for attr in user_response['UserAttributes']
            }

            # Extract account_type from profile field
            profile_data = user_attributes.get('profile', '{}')
            try:
                import json
                profile_json = json.loads(profile_data)
                account_type = profile_json.get('account_type', 'unknown')
            except:
                account_type = 'unknown'

            # Update local account record
            account = None
            if self.account_service:
                try:
                    account = self.account_service.get_account_by_external_auth_id(
                        user_attributes.get('sub')
                    )
                    if account:
                        account = self.account_service.update_last_login(
                            account, ip_address, user_agent
                        )
                except Exception as e:
                    logger.warning(f"Failed to update last login: {e}")

            return {
                'access_token': response['AuthenticationResult']['AccessToken'],
                'id_token': response['AuthenticationResult']['IdToken'],
                'refresh_token': response['AuthenticationResult']['RefreshToken'],
                'token_type': response['AuthenticationResult']['TokenType'],
                'expires_in': response['AuthenticationResult']['ExpiresIn'],
                'user_id': user_response['Username'],
                'user_sub': user_attributes.get('sub'),
                'email': user_attributes.get('email'),
                'account_type': account_type,
                'phone_number': user_attributes.get('phone_number'),
                'account': account
            }

        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NotAuthorizedException':
                raise InvalidCredentialsError("Invalid username or password")
            elif error_code == 'UserNotFoundException':
                raise UserNotFoundError(f"User {username} not found")
            else:
                logger.error(f"Authentication error: {e}")
                raise AuthenticationError(f"Authentication failed: {e}")

    async def reset_password(self, username: str) -> Dict[str, Any]:
        """Initiate password reset for user."""
        try:
            response = self.client.forgot_password(
                ClientId=self.client_id,
                Username=username
            )

            return {
                'delivery_medium': response['CodeDeliveryDetails']['DeliveryMedium'],
                'destination': response['CodeDeliveryDetails']['Destination']
            }

        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'UserNotFoundException':
                raise UserNotFoundError(f"User {username} not found")
            else:
                logger.error(f"Password reset error: {e}")
                raise AuthenticationError(f"Password reset failed: {e}")

    async def confirm_password_reset(
        self,
        username: str,
        confirmation_code: str,
        new_password: str
    ) -> Dict[str, Any]:
        """Confirm password reset with code."""
        try:
            self.client.confirm_forgot_password(
                ClientId=self.client_id,
                Username=username,
                ConfirmationCode=confirmation_code,
                Password=new_password
            )

            return {'status': 'success'}

        except ClientError as e:
            logger.error(f"Password reset confirmation error: {e}")
            raise AuthenticationError(f"Password reset confirmation failed: {e}")

    async def validate_token(self, access_token: str) -> Dict[str, Any]:
        """Validate access token and return account info."""
        try:
            response = self.client.get_user(AccessToken=access_token)

            user_attributes = {
                attr['Name']: attr['Value']
                for attr in response['UserAttributes']
            }

            # Extract account_type from profile field
            profile_data = user_attributes.get('profile', '{}')
            try:
                import json
                profile_json = json.loads(profile_data)
                account_type = profile_json.get('account_type', 'unknown')
            except:
                account_type = 'unknown'

            # Get local account data
            account = None
            if self.account_service:
                try:
                    account = self.account_service.get_account_by_external_auth_id(
                        user_attributes.get('sub')
                    )
                except Exception as e:
                    logger.warning(f"Failed to get account: {e}")

            return {
                'user_id': response['Username'],
                'user_sub': user_attributes.get('sub'),
                'email': user_attributes.get('email'),
                'account_type': account_type,
                'phone_number': user_attributes.get('phone_number'),
                'account': account
            }

        except ClientError as e:
            logger.error(f"Token validation error: {e}")
            raise AuthenticationError(f"Token validation failed: {e}")

    async def disable_user(self, external_auth_id: str) -> Dict[str, Any]:
        """
        Disable user in Cognito (soft delete - can be re-enabled).

        Args:
            external_auth_id: The user's external auth ID (Cognito sub)

        Returns:
            Dict with status
        """
        try:
            # Get user by sub to find username
            if self.account_service:
                account = self.account_service.get_account_by_external_auth_id(external_auth_id)
                if account:
                    username = account.email
                else:
                    raise UserNotFoundError(f"Account with auth ID {external_auth_id} not found")
            else:
                raise AuthenticationError("Database session required for this operation")

            # Disable user in Cognito
            self.client.admin_disable_user(
                UserPoolId=self.user_pool_id,
                Username=username
            )

            logger.info(f"User {username} disabled in Cognito")
            return {"status": "disabled", "username": username}

        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'UserNotFoundException':
                raise UserNotFoundError(f"User not found in Cognito")
            else:
                logger.error(f"Error disabling user: {e}")
                raise AuthenticationError(f"Failed to disable user: {e}")

    async def delete_user_permanently(self, external_auth_id: str) -> Dict[str, Any]:
        """
        Permanently delete user from Cognito (hard delete - cannot be recovered).

        Args:
            external_auth_id: The user's external auth ID (Cognito sub)

        Returns:
            Dict with status
        """
        try:
            # Get user by sub to find username
            if self.account_service:
                account = self.account_service.get_account_by_external_auth_id(external_auth_id)
                if account:
                    username = account.email
                else:
                    raise UserNotFoundError(f"Account with auth ID {external_auth_id} not found")
            else:
                raise AuthenticationError("Database session required for this operation")

            # Permanently delete user from Cognito
            self.client.admin_delete_user(
                UserPoolId=self.user_pool_id,
                Username=username
            )

            logger.info(f"User {username} permanently deleted from Cognito")
            return {"status": "deleted", "username": username}

        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'UserNotFoundException':
                # User already deleted from Cognito, that's okay
                logger.warning(f"User not found in Cognito during deletion")
                return {"status": "already_deleted"}
            else:
                logger.error(f"Error deleting user: {e}")
                raise AuthenticationError(f"Failed to delete user: {e}")


def get_auth_service_with_db(db: Session) -> AuthenticationService:
    """
    Get authentication service instance with database session.
    """
    return AuthenticationService(db)


# Singleton instance (without DB for backward compatibility)
auth_service = AuthenticationService()