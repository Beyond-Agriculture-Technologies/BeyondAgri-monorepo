import boto3
import logging
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError
from app.core.config import settings

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
    """Abstract authentication service layer"""
    
    def __init__(self):
        self.client = boto3.client(
            'cognito-idp',
            region_name=settings.AUTH_REGION or settings.AWS_REGION,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY
        )
        self.user_pool_id = settings.AUTH_USER_POOL_ID
        self.client_id = settings.AUTH_CLIENT_ID
    
    async def register_user(
        self, 
        email: str, 
        password: str, 
        phone_number: Optional[str] = None,
        user_type: str = "farmer",
        **additional_attributes
    ) -> Dict[str, Any]:
        """
        Register a new user
        
        Args:
            email: User's email address
            password: User's password
            phone_number: Optional phone number
            user_type: User type (farmer/wholesaler)
            **additional_attributes: Additional user attributes
            
        Returns:
            Dict containing user registration info
            
        Raises:
            UserAlreadyExistsError: If user already exists
            AuthenticationError: For other registration errors
        """
        try:
            user_attributes = [
                {'Name': 'email', 'Value': email},
                {'Name': 'custom:user_type', 'Value': user_type}
            ]
            
            if phone_number:
                user_attributes.append({'Name': 'phone_number', 'Value': phone_number})
            
            # Add any additional custom attributes
            for key, value in additional_attributes.items():
                if key.startswith('custom:'):
                    user_attributes.append({'Name': key, 'Value': str(value)})
                else:
                    user_attributes.append({'Name': f'custom:{key}', 'Value': str(value)})
            
            response = self.client.admin_create_user(
                UserPoolId=self.user_pool_id,
                Username=email,
                UserAttributes=user_attributes,
                TemporaryPassword=password,
                MessageAction='SUPPRESS',  # Don't send welcome email
                ForceAliasCreation=True
            )
            
            # Set permanent password
            self.client.admin_set_user_password(
                UserPoolId=self.user_pool_id,
                Username=email,
                Password=password,
                Permanent=True
            )
            
            return {
                'user_id': response['User']['Username'],
                'user_sub': next(
                    attr['Value'] for attr in response['User']['Attributes'] 
                    if attr['Name'] == 'sub'
                ),
                'email': email,
                'user_type': user_type,
                'status': response['User']['UserStatus']
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
        password: str
    ) -> Dict[str, Any]:
        """
        Authenticate user with username/password
        
        Args:
            username: Username (email or phone)
            password: User's password
            
        Returns:
            Dict containing authentication tokens and user info
            
        Raises:
            InvalidCredentialsError: If credentials are invalid
            UserNotFoundError: If user doesn't exist
            AuthenticationError: For other auth errors
        """
        try:
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
            
            return {
                'access_token': response['AuthenticationResult']['AccessToken'],
                'id_token': response['AuthenticationResult']['IdToken'],
                'refresh_token': response['AuthenticationResult']['RefreshToken'],
                'token_type': response['AuthenticationResult']['TokenType'],
                'expires_in': response['AuthenticationResult']['ExpiresIn'],
                'user_id': user_response['Username'],
                'user_sub': user_attributes.get('sub'),
                'email': user_attributes.get('email'),
                'user_type': user_attributes.get('custom:user_type'),
                'phone_number': user_attributes.get('phone_number')
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
        Initiate password reset for user
        
        Args:
            username: Username (email or phone)
            
        Returns:
            Dict containing reset info
            
        Raises:
            UserNotFoundError: If user doesn't exist
            AuthenticationError: For other errors
        """
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
        """
        Confirm password reset with code
        
        Args:
            username: Username (email or phone)
            confirmation_code: Reset code received
            new_password: New password
            
        Returns:
            Dict containing confirmation info
            
        Raises:
            AuthenticationError: For errors
        """
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
        """
        Validate access token
        
        Args:
            access_token: JWT access token
            
        Returns:
            Dict containing user info from token
            
        Raises:
            AuthenticationError: If token is invalid
        """
        try:
            response = self.client.get_user(AccessToken=access_token)
            
            user_attributes = {
                attr['Name']: attr['Value'] 
                for attr in response['UserAttributes']
            }
            
            return {
                'user_id': response['Username'],
                'user_sub': user_attributes.get('sub'),
                'email': user_attributes.get('email'),
                'user_type': user_attributes.get('custom:user_type'),
                'phone_number': user_attributes.get('phone_number')
            }
            
        except ClientError as e:
            logger.error(f"Token validation error: {e}")
            raise AuthenticationError(f"Token validation failed: {e}")


# Singleton instance
auth_service = AuthenticationService()