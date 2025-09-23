from fastapi import APIRouter, HTTPException, status, Depends, Request
from typing import Any
from sqlalchemy.orm import Session

from app.schemas.auth import (
    UserRegister,
    UserLogin,
    AuthResponse,
    UserResponse,
    Token,
    LoginResponseData,
    PasswordResetRequest,
    PasswordResetResponse,
    PasswordResetConfirm
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


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserRegister,
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    """
    Register a new user with enhanced account structure.

    - **email**: User's email address (required)
    - **password**: Strong password (required, min 8 characters)
    - **phone_number**: Phone number (optional)
    - **user_type**: farmer, wholesaler, or admin (default: farmer)
    - **name**: Full name (optional)
    - **address**: Address (optional)
    """
    try:
        # Prepare additional attributes
        additional_attributes = {}
        if user_data.name:
            additional_attributes["name"] = user_data.name
        if user_data.address:
            additional_attributes["address"] = user_data.address

        # Register user with account structure
        auth_service = get_auth_service_with_db(db)
        result = await auth_service.register_user(
            email=user_data.email,
            password=user_data.password,
            phone_number=user_data.phone_number,
            account_type=user_data.user_type,
            **additional_attributes
        )

        user_response = UserResponse(
            user_id=result["user_id"],
            user_sub=result["user_sub"],
            email=result["email"],
            user_type=result["account_type"],
            phone_number=result["phone_number"],
            status=result["status"]
        )

        return AuthResponse(
            message="Account registered successfully",
            data=None  # Registration doesn't include tokens
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


@router.post("/login", response_model=AuthResponse)
async def login(
    credentials: UserLogin,
    request: Request,
    db: Session = Depends(get_db)
) -> Any:
    """
    Authenticate user with enhanced tracking.

    - **username**: User's email address
    - **password**: User's password
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
    Initiate password reset process.

    - **email**: User's email address
    """
    try:
        auth_service = get_auth_service_with_db(db)
        result = await auth_service.reset_password(request.email)

        return PasswordResetResponse(
            delivery_medium=result["delivery_medium"],
            destination=result["destination"],
            message="Password reset code sent successfully"
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

    - **email**: User's email address
    - **confirmation_code**: Code received via email/SMS
    - **new_password**: New password
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
    Logout user with activity logging.

    For complete security, implement token blacklisting if needed.
    """
    try:
        # Log logout activity
        from app.services.account_service import AccountService
        from app.models import AccountActivityLog, ActivityTypeEnum

        account_service = AccountService(db)
        account = account_service.get_account_by_cognito_sub(current_account.cognito_sub)

        if account:
            activity_log = AccountActivityLog(
                account_id=account.id,
                activity_type=ActivityTypeEnum.LOGOUT,
                description="User logged out"
            )
            db.add(activity_log)
            db.commit()

        return AuthResponse(
            message="Logout successful. Please remove tokens from client storage.",
            data=None
        )

    except Exception:
        # Don't fail logout if logging fails
        return AuthResponse(
            message="Logout successful. Please remove tokens from client storage.",
            data=None
        )