import boto3
import logging
from datetime import datetime
from typing import Dict, Any
from sqlalchemy.orm import Session
from botocore.exceptions import ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)


class PhoneVerificationError(Exception):
    """Base exception for phone verification errors"""
    pass


class SMSSendError(PhoneVerificationError):
    """Raised when SMS sending fails"""
    pass


class OTPError(Exception):
    """Base exception for OTP errors"""
    pass


class OTPExpiredError(OTPError):
    """Raised when OTP has expired"""
    pass


class OTPInvalidError(OTPError):
    """Raised when OTP is invalid"""
    pass


class OTPLimitExceededError(OTPError):
    """Raised when too many attempts made"""
    pass


class PhoneVerificationService:
    """Service for phone verification via SMS OTP"""

    def __init__(self, db: Session):
        self.db = db

        # Initialize AWS Cognito client only
        client_config = {
            'region_name': settings.AWS_REGION,
            'aws_access_key_id': settings.AWS_ACCESS_KEY_ID,
            'aws_secret_access_key': settings.AWS_SECRET_ACCESS_KEY
        }
        self.cognito_client = boto3.client('cognito-idp', **client_config)

    async def send_verification_otp_cognito(
        self,
        access_token: str
    ) -> Dict[str, Any]:
        """
        Send OTP via Cognito for registered users.

        Args:
            access_token: User's Cognito access token

        Returns:
            Dict with delivery details

        Raises:
            PhoneVerificationError: If sending fails
        """
        try:
            response = self.cognito_client.get_user_attribute_verification_code(
                AccessToken=access_token,
                AttributeName='phone_number'
            )

            logger.info(f"Cognito OTP sent via {response['CodeDeliveryDetails']['DeliveryMedium']}")

            return {
                'status': 'success',
                'message': 'Verification code sent successfully',
                'delivery_medium': response['CodeDeliveryDetails']['DeliveryMedium'],
                'destination': response['CodeDeliveryDetails']['Destination'],
                'expires_in_minutes': 3  # Cognito OTPs expire in 3 minutes
            }

        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']

            logger.error(f"Cognito OTP send failed: {error_code} - {error_message}")

            if error_code == 'InvalidParameterException':
                raise PhoneVerificationError("Phone number not set for this account")
            elif error_code == 'LimitExceededException':
                raise OTPLimitExceededError("Too many OTP requests. Please wait before requesting another code.")
            else:
                raise PhoneVerificationError(f"Failed to send verification code: {error_message}")

    async def verify_otp_cognito(
        self,
        access_token: str,
        otp_code: str
    ) -> Dict[str, Any]:
        """
        Verify OTP via Cognito for registered users.

        Args:
            access_token: User's Cognito access token
            otp_code: 6-digit verification code

        Returns:
            Dict with verification status

        Raises:
            OTPInvalidError: If OTP is invalid
            OTPExpiredError: If OTP has expired
            OTPLimitExceededError: If too many attempts
            PhoneVerificationError: Other verification errors
        """
        try:
            # Verify with Cognito
            self.cognito_client.verify_user_attribute(
                AccessToken=access_token,
                AttributeName='phone_number',
                Code=otp_code
            )

            # Get user info to update local DB
            user = self.cognito_client.get_user(AccessToken=access_token)
            user_sub = next(
                (attr['Value'] for attr in user['UserAttributes'] if attr['Name'] == 'sub'),
                None
            )

            if not user_sub:
                logger.error("Could not extract user_sub from Cognito response")
                raise PhoneVerificationError("Failed to verify phone number")

            # Update local database
            from app.services.account_service import AccountService
            account_service = AccountService(self.db)
            account = account_service.get_account_by_external_auth_id(user_sub)

            if account:
                account.phone_verified_at = datetime.utcnow()
                self.db.commit()
                logger.info(f"Phone verified for account: {account.email}")

                # Get phone number from user attributes
                phone_number = next(
                    (attr['Value'] for attr in user['UserAttributes'] if attr['Name'] == 'phone_number'),
                    None
                )

                return {
                    'status': 'success',
                    'message': 'Phone number verified successfully',
                    'phone_number': self._mask_phone(phone_number) if phone_number else '***',
                    'account_found': True,
                    'account': {
                        'email': account.email,
                        'account_type': account.account_type.value,
                        'phone_verified': True,
                        'phone_verified_at': account.phone_verified_at.isoformat()
                    }
                }
            else:
                logger.warning(f"Phone verified but account not found for user_sub: {user_sub}")
                return {
                    'status': 'success',
                    'message': 'Phone number verified successfully',
                    'phone_number': '***',
                    'account_found': False
                }

        except ClientError as e:
            error_code = e.response['Error']['Code']
            error_message = e.response['Error']['Message']

            logger.error(f"Cognito OTP verification failed: {error_code} - {error_message}")

            if error_code == 'CodeMismatchException':
                raise OTPInvalidError("Invalid verification code")
            elif error_code == 'ExpiredCodeException':
                raise OTPExpiredError("Verification code has expired. Please request a new one.")
            elif error_code == 'LimitExceededException':
                raise OTPLimitExceededError("Too many attempts. Please request a new code.")
            else:
                raise PhoneVerificationError(f"Verification failed: {error_message}")

    def _mask_phone(self, phone_number: str) -> str:
        """
        Mask phone number for privacy.

        Args:
            phone_number: Full phone number

        Returns:
            Masked phone number (e.g., +27***4567)
        """
        if len(phone_number) <= 6:
            return phone_number

        # Show first 3 chars and last 4 chars
        return f"{phone_number[:3]}***{phone_number[-4:]}"


def get_phone_verification_service(db: Session) -> PhoneVerificationService:
    """Get phone verification service instance with database session."""
    return PhoneVerificationService(db)
