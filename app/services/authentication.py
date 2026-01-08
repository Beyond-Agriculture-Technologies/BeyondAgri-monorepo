import boto3
import json
import logging
from datetime import datetime
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
                    # Include phone_number in account creation
                    account_data = {
                        'phone_number': normalized_phone,
                        **additional_attributes
                    }
                    account = self.account_service.create_account_from_auth_provider(
                        external_auth_id=user_sub,
                        email=email,
                        account_type=account_type,
                        **account_data
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

    async def sign_up_user(
        self,
        email: str,
        password: str,
        phone_number: str,
        account_type: str = "farmer",
        **additional_attributes
    ) -> Dict[str, Any]:
        """
        Register user using Cognito's SignUp API with phone verification.
        User will receive verification code via SMS and must confirm before account is created.

        Returns:
            Dict with user_sub and delivery details
        """
        try:
            # Normalize phone number
            normalized_phone = normalize_phone_number(phone_number)

            # Prepare user attributes
            user_attributes = [
                {'Name': 'email', 'Value': email},
                {'Name': 'phone_number', 'Value': normalized_phone},
                {'Name': 'name', 'Value': additional_attributes.get('name', email.split('@')[0])},
                {'Name': 'profile', 'Value': f'{{"account_type": "{account_type}"}}'}
            ]

            if 'address' in additional_attributes:
                user_attributes.append({'Name': 'address', 'Value': additional_attributes['address']})

            # Call Cognito SignUp (sends verification code to phone)
            response = self.client.sign_up(
                ClientId=self.client_id,
                Username=email,
                Password=password,
                UserAttributes=user_attributes
            )

            logger.info(f"User signed up: {email}, code sent to {normalized_phone[:6]}***")

            return {
                'user_sub': response['UserSub'],
                'user_confirmed': response['UserConfirmed'],  # Will be False
                'code_delivery_medium': response['CodeDeliveryDetails']['DeliveryMedium'],
                'code_delivery_destination': response['CodeDeliveryDetails']['Destination'],
                'message': 'Verification code sent to your phone. Please confirm to complete registration.'
            }

        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'UsernameExistsException':
                raise UserAlreadyExistsError(f"User with email {email} already exists")
            elif error_code == 'InvalidPasswordException':
                raise AuthenticationError("Password must be at least 8 characters")
            elif error_code == 'InvalidParameterException':
                raise AuthenticationError("Invalid phone number or email format")
            else:
                logger.error(f"Sign up error: {e}")
                raise AuthenticationError(f"Registration failed: {str(e)}")

    async def confirm_sign_up_user(
        self,
        email: str,
        confirmation_code: str
    ) -> Dict[str, Any]:
        """
        Confirm user sign-up with verification code.
        Creates local account record after successful confirmation.

        Returns:
            Dict with user info
        """
        try:
            # Confirm sign up with Cognito
            self.client.confirm_sign_up(
                ClientId=self.client_id,
                Username=email,
                ConfirmationCode=confirmation_code
            )

            logger.info(f"User confirmed: {email}")

            # Get user details from Cognito (now confirmed)
            user_response = self.client.admin_get_user(
                UserPoolId=self.user_pool_id,
                Username=email
            )

            # Extract attributes
            user_attributes = {attr['Name']: attr['Value'] for attr in user_response['UserAttributes']}
            user_sub = user_attributes.get('sub')
            phone_number = user_attributes.get('phone_number')

            # Parse account_type from profile
            profile_data = json.loads(user_attributes.get('profile', '{}'))
            account_type = profile_data.get('account_type', 'farmer')

            # Create local account record
            if self.account_service:
                try:
                    account = self.account_service.create_account_from_auth_provider(
                        external_auth_id=user_sub,
                        email=email,
                        account_type=account_type,
                        phone_number=phone_number,
                        name=user_attributes.get('name'),
                        address=user_attributes.get('address')
                    )

                    # Mark phone as verified (Cognito already verified it)
                    account.phone_verified_at = datetime.utcnow()
                    self.db.commit()

                    logger.info(f"Local account created for {email}")

                except Exception as e:
                    logger.error(f"Failed to create local account: {e}")
                    raise AuthenticationError(f"Account creation failed: {str(e)}")

            return {
                'user_id': email,
                'user_sub': user_sub,
                'email': email,
                'account_type': account_type,
                'phone_number': phone_number,
                'status': 'CONFIRMED',
                'message': 'Registration completed. You can now log in.'
            }

        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'CodeMismatchException':
                raise AuthenticationError("Invalid verification code")
            elif error_code == 'ExpiredCodeException':
                raise AuthenticationError("Verification code expired. Please request a new code or register again.")
            elif error_code == 'NotAuthorizedException':
                raise AuthenticationError("User already confirmed")
            else:
                logger.error(f"Confirmation error: {e}")
                raise AuthenticationError(f"Confirmation failed: {str(e)}")

    async def authenticate_user(
        self,
        username: str,
        password: str,
        ip_address: str = None,
        user_agent: str = None
    ) -> Dict[str, Any]:
        """
        Authenticate user with email or phone number.

        Args:
            username: Email address OR phone number (E.164 or SA format)
            password: User's password
            ip_address: Optional IP address for login tracking
            user_agent: Optional user agent for login tracking

        Returns:
            Dict containing tokens and user information

        Raises:
            InvalidCredentialsError: Invalid credentials or unverified phone
            UserNotFoundError: User not found
            AuthenticationError: Other authentication errors
        """
        from app.utils.phone_validation import detect_login_identifier_type

        try:
            # Detect what type of identifier was provided (returns normalized value for phones)
            identifier_type, normalized_value = detect_login_identifier_type(username)

            cognito_username = username  # Default to the input

            if identifier_type == "phone":
                # Phone number login: lookup email from database
                if not self.account_service:
                    raise AuthenticationError(
                        "Phone number login requires database access. Please contact support."
                    )

                # normalized_value already contains the E.164 formatted phone
                normalized_phone = normalized_value

                # Lookup account by phone number
                account = self.account_service.get_account_by_phone(normalized_phone)

                if not account:
                    # User not found with this phone number
                    logger.warning(f"Login attempt with unregistered phone: {normalized_phone}")
                    raise UserNotFoundError(
                        "No account found. Please check your credentials or register."
                    )

                # Check if phone is verified
                if not account.phone_verified_at:
                    logger.warning(f"Login attempt with unverified phone: {normalized_phone}")
                    raise InvalidCredentialsError(
                        "Please verify your phone number before logging in"
                    )

                # Use the account's email for Cognito authentication
                cognito_username = account.email
                logger.info(f"Phone login: {normalized_phone[:6]}*** -> {account.email}")

            elif identifier_type == "email":
                # Email login: use directly
                cognito_username = normalized_value

            else:
                # Unknown identifier type (invalid email or phone format)
                logger.warning(f"Invalid login identifier format: {username}")
                raise InvalidCredentialsError("Invalid username or password")

            # Authenticate with Cognito using email (Cognito username)
            response = self.client.admin_initiate_auth(
                UserPoolId=self.user_pool_id,
                ClientId=self.client_id,
                AuthFlow='ADMIN_NO_SRP_AUTH',
                AuthParameters={
                    'USERNAME': cognito_username,  # Always email for Cognito
                    'PASSWORD': password
                }
            )

            # Get user details
            user_response = self.client.admin_get_user(
                UserPoolId=self.user_pool_id,
                Username=cognito_username  # Use cognito_username (email) not original username
            )

            user_attributes = {
                attr['Name']: attr['Value']
                for attr in user_response['UserAttributes']
            }

            # Extract account_type from profile field
            profile_data = user_attributes.get('profile', '{}')
            try:
                profile_json = json.loads(profile_data)
                account_type = profile_json.get('account_type', 'unknown')
            except (json.JSONDecodeError, KeyError, TypeError):
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
        """
        Initiate password reset for user with email or phone number.

        Args:
            username: Email address OR phone number (E.164 or SA format)

        Returns:
            Dict with delivery_medium and destination

        Raises:
            UserNotFoundError: User not found
            InvalidCredentialsError: Phone not verified
            AuthenticationError: Other errors
        """
        from app.utils.phone_validation import detect_login_identifier_type

        try:
            # Detect identifier type (returns normalized value for phones)
            identifier_type, normalized_value = detect_login_identifier_type(username)

            cognito_username = username  # Default to input

            if identifier_type == "phone":
                # Phone number password reset: lookup email from database
                if not self.account_service:
                    raise AuthenticationError(
                        "Phone number password reset requires database access. Please contact support."
                    )

                # normalized_value already contains the E.164 formatted phone
                normalized_phone = normalized_value

                # Lookup account by phone
                account = self.account_service.get_account_by_phone(normalized_phone)

                if not account:
                    logger.warning(f"Password reset attempt with unregistered phone: {normalized_phone}")
                    raise UserNotFoundError("No account found. Please check your credentials or register.")

                # Check if phone is verified (required for password reset)
                if not account.phone_verified_at:
                    logger.warning(f"Password reset attempt with unverified phone: {normalized_phone}")
                    raise InvalidCredentialsError(
                        "Please verify your phone number before resetting password"
                    )

                # Use account's email for Cognito
                cognito_username = account.email
                logger.info(f"Phone password reset: {normalized_phone[:6]}*** -> {account.email}")

            elif identifier_type == "email":
                # Email password reset: use directly
                cognito_username = normalized_value

            else:
                # Unknown identifier type (invalid email or phone format)
                logger.warning(f"Invalid password reset identifier: {username}")
                raise UserNotFoundError("No account found. Please check your credentials or register.")

            # Initiate password reset with Cognito
            response = self.client.forgot_password(
                ClientId=self.client_id,
                Username=cognito_username
            )

            return {
                'delivery_medium': response['CodeDeliveryDetails']['DeliveryMedium'],
                'destination': response['CodeDeliveryDetails']['Destination']
            }

        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'UserNotFoundException':
                raise UserNotFoundError("No account found. Please check your credentials or register.")
            else:
                logger.error(f"Password reset error: {e}")
                raise AuthenticationError(f"Password reset failed: {e}")

    async def confirm_password_reset(
        self,
        username: str,
        confirmation_code: str,
        new_password: str
    ) -> Dict[str, Any]:
        """
        Confirm password reset with code (supports email or phone).

        Args:
            username: Email address OR phone number (E.164 or SA format)
            confirmation_code: Confirmation code received
            new_password: New password

        Returns:
            Dict with status

        Raises:
            AuthenticationError: Confirmation failed
        """
        from app.utils.phone_validation import detect_login_identifier_type

        try:
            # Detect identifier type (returns normalized value for phones)
            identifier_type, normalized_value = detect_login_identifier_type(username)

            cognito_username = username  # Default to input

            if identifier_type == "phone":
                # Phone number: lookup email from database
                if not self.account_service:
                    raise AuthenticationError(
                        "Phone number password reset requires database access. Please contact support."
                    )

                # normalized_value already contains the E.164 formatted phone
                normalized_phone = normalized_value

                # Lookup account
                account = self.account_service.get_account_by_phone(normalized_phone)

                if not account:
                    raise AuthenticationError("Account not found")

                # Use account's email for Cognito
                cognito_username = account.email

            elif identifier_type == "email":
                # Email: use directly
                cognito_username = normalized_value

            else:
                raise AuthenticationError("Invalid username format")

            # Confirm password reset with Cognito
            self.client.confirm_forgot_password(
                ClientId=self.client_id,
                Username=cognito_username,
                ConfirmationCode=confirmation_code,
                Password=new_password
            )

            return {'status': 'success'}

        except ClientError as e:
            logger.error(f"Password reset confirmation error: {e}")
            raise AuthenticationError(f"Password reset confirmation failed: {e}")

    async def resend_confirmation_code(self, email: str) -> Dict[str, Any]:
        """
        Resend registration confirmation code to user's phone.

        Args:
            email: User's email address

        Returns:
            Dict with delivery details

        Raises:
            UserNotFoundError: User not found
            AuthenticationError: Rate limit or other errors
        """
        try:
            response = self.client.resend_confirmation_code(
                ClientId=self.client_id,
                Username=email
            )

            return {
                'code_delivery_medium': response['CodeDeliveryDetails']['DeliveryMedium'],
                'code_delivery_destination': response['CodeDeliveryDetails']['Destination']
            }

        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'UserNotFoundException':
                raise UserNotFoundError("User not found. Please register first.")
            elif error_code == 'LimitExceededException':
                raise AuthenticationError("Too many requests. Please wait before requesting another code.")
            elif error_code == 'InvalidParameterException':
                raise AuthenticationError("User is already confirmed.")
            else:
                logger.error(f"Resend confirmation error: {e}")
                raise AuthenticationError(f"Failed to resend code: {str(e)}")

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
                profile_json = json.loads(profile_data)
                account_type = profile_json.get('account_type', 'unknown')
            except (json.JSONDecodeError, KeyError, TypeError):
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