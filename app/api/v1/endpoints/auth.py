from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Any
from pydantic import EmailStr
from sqlalchemy.orm import Session
import logging

from app.schemas.auth import (
    UserRegister,
    UserLogin,
    AuthResponse,
    UserResponse,
    Token,
    LoginResponseData,
    PasswordResetRequest,
    PasswordResetResponse,
    PasswordResetConfirm,
    ConfirmRegistrationRequest,
    RegistrationResponse,
    VerifyOTPRequest,
    OTPResponse,
    VerifyOTPResponse
)
from app.schemas.account import AccountProfile
from app.core.deps import get_current_account
from app.db.session import get_db
from app.services.authentication import (
    get_auth_service_with_db,
    AuthenticationError,
    UserAlreadyExistsError,
    UserNotFoundError,
    InvalidCredentialsError
)

router = APIRouter()
security = HTTPBearer()
logger = logging.getLogger(__name__)


@router.post("/register", response_model=RegistrationResponse, status_code=status.HTTP_202_ACCEPTED)
async def register(
    user_data: UserRegister,
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    """
    Initiate user registration with phone verification via SMS.

    Sends a 6-digit verification code to the provided phone number.
    User must call /confirm-registration with the code to complete registration.

    - **email**: User's email address (required)
    - **password**: Strong password (required, min 8 characters)
    - **phone_number**: Phone number in E.164 or SA format (required)
    - **user_type**: farmer, wholesaler, or admin (default: farmer)
    - **name**: Full name (optional)
    - **address**: Address (optional)

    Returns delivery details for the verification code sent via SMS.
    """
    try:
        # Prepare additional attributes
        additional_attributes = {}
        if user_data.name:
            additional_attributes["name"] = user_data.name
        if user_data.address:
            additional_attributes["address"] = user_data.address

        # Register user with Cognito SignUp API (sends verification code)
        auth_service = get_auth_service_with_db(db)
        result = await auth_service.sign_up_user(
            email=user_data.email,
            password=user_data.password,
            phone_number=user_data.phone_number,
            account_type=user_data.user_type,
            **additional_attributes
        )

        return RegistrationResponse(
            user_sub=result["user_sub"],
            code_delivery_medium=result["code_delivery_medium"],
            code_delivery_destination=result["code_delivery_destination"],
            message=result["message"]
        )

    except UserAlreadyExistsError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/confirm-registration", response_model=AuthResponse)
async def confirm_registration(
    confirmation_data: ConfirmRegistrationRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Confirm user registration with the verification code sent via SMS.

    - **email**: Email address used during registration
    - **confirmation_code**: 6-digit verification code received via SMS

    After successful confirmation, the account is fully created and the user can login.
    """
    try:
        auth_service = get_auth_service_with_db(db)
        result = await auth_service.confirm_sign_up_user(
            email=confirmation_data.email,
            confirmation_code=confirmation_data.confirmation_code
        )

        return AuthResponse(
            message=result["message"],
            data=None
        )

    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/resend-confirmation", response_model=RegistrationResponse)
async def resend_confirmation(
    email: EmailStr,
    db: Session = Depends(get_db)
) -> Any:
    """
    Resend registration confirmation code to user's phone.

    Use this if the original verification code expired (codes expire in ~3 minutes).

    - **email**: Email address used during registration

    Returns new delivery details with the resent verification code.
    """
    try:
        auth_service = get_auth_service_with_db(db)
        result = await auth_service.resend_confirmation_code(email)

        return RegistrationResponse(
            user_sub="",  # Not returned by resend
            code_delivery_medium=result['code_delivery_medium'],
            code_delivery_destination=result['code_delivery_destination'],
            message="Verification code resent to your phone"
        )

    except UserNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except AuthenticationError as e:
        # Handle both rate limit and other errors
        if "Too many requests" in str(e):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/login", response_model=AuthResponse)
async def login(
    credentials: UserLogin,
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    """
    Authenticate user with email or phone number.

    - **username**: Email OR phone number
      - Email: farmer@example.com
      - Phone (E.164): +27821234567
      - Phone (SA format): 0821234567
    - **password**: User's password

    Note: Phone number must be verified before use for login.
    """
    try:
        # Extract request info for logging
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("User-Agent")

        # Authenticate with account structure
        auth_service = get_auth_service_with_db(db)
        result = await auth_service.authenticate_user(
            username=credentials.username,
            password=credentials.password,
            ip_address=ip_address,
            user_agent=user_agent
        )

        user_response = UserResponse(
            user_id=result["user_id"],
            user_sub=result["user_sub"],
            email=result["email"],
            user_type=result["account_type"],
            phone_number=result.get("phone_number", ""),
            status="CONFIRMED"
        )

        login_data = LoginResponseData(
            access_token=result["access_token"],
            id_token=result["id_token"],
            refresh_token=result["refresh_token"],
            user=user_response
        )

        return AuthResponse(
            data=login_data,
            message="Login successful"
        )

    except InvalidCredentialsError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"}
        )
    except UserNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/password-reset", response_model=PasswordResetResponse)
async def request_password_reset(
    request: PasswordResetRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Initiate password reset process with email or phone number.

    - **email**: Email OR phone number
      - Email: farmer@example.com
      - Phone (E.164): +27821234567
      - Phone (SA format): 0821234567

    Note: Phone number must be verified before use for password reset.
    """
    try:
        auth_service = get_auth_service_with_db(db)
        result = await auth_service.reset_password(request.email)

        return PasswordResetResponse(
            delivery_medium=result["delivery_medium"],
            destination=result["destination"],
            message="Password reset code sent successfully"
        )

    except InvalidCredentialsError as e:
        # Phone not verified
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except UserNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/confirm-password-reset", response_model=AuthResponse)
async def confirm_password_reset(
    request: PasswordResetConfirm,
    db: Session = Depends(get_db)
) -> Any:
    """
    Confirm password reset with verification code.

    - **email**: Email OR phone number (same as used to request reset)
      - Email: farmer@example.com
      - Phone (E.164): +27821234567
      - Phone (SA format): 0821234567
    - **confirmation_code**: Code received via email/SMS
    - **new_password**: New password (min 8 characters)
    """
    try:
        auth_service = get_auth_service_with_db(db)
        await auth_service.confirm_password_reset(
            username=request.email,
            confirmation_code=request.confirmation_code,
            new_password=request.new_password
        )

        return AuthResponse(
            message="Password reset successful",
            data=None
        )

    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/send-otp", response_model=OTPResponse)
async def send_phone_verification_otp(
    current_account: AccountProfile = Depends(get_current_account),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Any:
    """
    Send OTP to authenticated user's phone number via AWS Cognito.

    **Authentication Required:** Yes (JWT access token)
    **Phone Source:** From authenticated user's Cognito profile
    **Expiry:** 3 minutes (Cognito default)

    The OTP code will be sent via SMS to the phone number associated with the authenticated user's account.
    """
    from app.services.phone_verification_service import (
        get_phone_verification_service,
        PhoneVerificationError,
        OTPLimitExceededError
    )

    try:
        phone_service = get_phone_verification_service(db)
        access_token = credentials.credentials

        logger.info(f"Sending Cognito OTP for user: {current_account.email}")
        result = await phone_service.send_verification_otp_cognito(access_token)

        return OTPResponse(**result)

    except OTPLimitExceededError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e)
        )
    except PhoneVerificationError as e:
        logger.error(f"Failed to send OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error sending OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send verification code. Please try again later."
        )


@router.post("/verify-otp", response_model=VerifyOTPResponse)
async def verify_phone_otp(
    request: VerifyOTPRequest,
    current_account: AccountProfile = Depends(get_current_account),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Any:
    """
    Verify OTP code via AWS Cognito.

    **Authentication Required:** Yes (JWT access token)
    **Request Body:** Only otp_code needed (phone from authenticated user's Cognito profile)

    - **otp_code**: 6-digit OTP code received via SMS

    On successful verification, the account's phone_verified_at will be set.
    """
    from app.services.phone_verification_service import (
        get_phone_verification_service,
        PhoneVerificationError,
        OTPExpiredError,
        OTPInvalidError,
        OTPLimitExceededError
    )

    try:
        phone_service = get_phone_verification_service(db)
        access_token = credentials.credentials

        logger.info(f"Verifying Cognito OTP for user: {current_account.email}")
        result = await phone_service.verify_otp_cognito(access_token, request.otp_code)

        return VerifyOTPResponse(**result)

    except OTPExpiredError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except OTPInvalidError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except OTPLimitExceededError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e)
        )
    except PhoneVerificationError as e:
        logger.error(f"Failed to verify OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error verifying OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify code. Please try again later."
        )


@router.post("/resend-otp", response_model=OTPResponse)
async def resend_phone_verification_otp(
    current_account: AccountProfile = Depends(get_current_account),
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> Any:
    """
    Resend OTP via AWS Cognito (generates new code).

    **Authentication Required:** Yes (JWT access token)
    **Phone Source:** From authenticated user's Cognito profile

    This will invalidate any previous OTP codes and send a new one.
    """
    from app.services.phone_verification_service import (
        get_phone_verification_service,
        PhoneVerificationError,
        OTPLimitExceededError
    )

    try:
        phone_service = get_phone_verification_service(db)
        access_token = credentials.credentials

        logger.info(f"Resending Cognito OTP for user: {current_account.email}")
        result = await phone_service.send_verification_otp_cognito(access_token)

        return OTPResponse(**result)

    except OTPLimitExceededError as e:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(e)
        )
    except PhoneVerificationError as e:
        logger.error(f"Failed to resend OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Unexpected error resending OTP: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend verification code. Please try again later."
        )


@router.get("/me", response_model=AccountProfile)
async def get_current_account_info(
    current_account: AccountProfile = Depends(get_current_account)
) -> Any:
    """
    Get current authenticated account information with all profiles.

    Requires valid JWT token in Authorization header.
    """
    return current_account


@router.post("/logout", response_model=AuthResponse)
async def logout(
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
) -> Any:
    """
    Logout user.

    For complete security, implement token blacklisting if needed.
    """
    return AuthResponse(
        message="Logout successful. Please remove tokens from client storage.",
        data=None
    )