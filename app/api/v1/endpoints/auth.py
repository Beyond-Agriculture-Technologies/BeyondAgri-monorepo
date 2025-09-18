from fastapi import APIRouter, HTTPException, status, Depends
from typing import Any
from sqlalchemy.orm import Session

from app.schemas.auth import (
    UserRegister,
    UserLogin,
    AuthResponse,
    UserResponse,
    Token,
    PasswordResetRequest,
    PasswordResetResponse,
    PasswordResetConfirm
)
from app.schemas.user import UserProfile
from app.core.deps import get_current_user
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
    db: Session = Depends(get_db)
) -> Any:
    """
    Register a new user with AWS Cognito.

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

        # Register user with Cognito and sync to local DB
        auth_service_with_db = get_auth_service_with_db(db)
        result = await auth_service_with_db.register_user(
            email=user_data.email,
            password=user_data.password,
            phone_number=user_data.phone_number,
            user_type=user_data.user_type,
            **additional_attributes
        )

        user_response = UserResponse(
            user_id=result["user_id"],
            user_sub=result["user_sub"],
            email=result["email"],
            user_type=result["user_type"],
            status=result["status"]
        )

        return AuthResponse(
            message="User registered successfully",
            user=user_response
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
    db: Session = Depends(get_db)
) -> Any:
    """
    Authenticate user and return JWT tokens.

    - **username**: User's email address
    - **password**: User's password
    """
    try:
        # Authenticate with Cognito and update local login tracking
        auth_service_with_db = get_auth_service_with_db(db)
        result = await auth_service_with_db.authenticate_user(
            username=credentials.username,
            password=credentials.password
        )

        tokens = Token(
            access_token=result["access_token"],
            id_token=result["id_token"],
            refresh_token=result["refresh_token"],
            token_type=result["token_type"],
            expires_in=result["expires_in"]
        )

        user_response = UserResponse(
            user_id=result["user_id"],
            user_sub=result["user_sub"],
            email=result["email"],
            user_type=result["user_type"],
            phone_number=result.get("phone_number"),
            status="CONFIRMED"
        )

        return AuthResponse(
            message="Login successful",
            user=user_response,
            tokens=tokens
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
async def request_password_reset(request: PasswordResetRequest) -> Any:
    """
    Initiate password reset process.

    - **email**: User's email address
    """
    try:
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
async def confirm_password_reset(request: PasswordResetConfirm) -> Any:
    """
    Confirm password reset with verification code.

    - **email**: User's email address
    - **confirmation_code**: Code received via email/SMS
    - **new_password**: New password
    """
    try:
        await auth_service.confirm_password_reset(
            username=request.email,
            confirmation_code=request.confirmation_code,
            new_password=request.new_password
        )

        return AuthResponse(
            message="Password reset successful"
        )

    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/me", response_model=UserProfile)
async def get_current_user_info(
    current_user: UserProfile = Depends(get_current_user)
) -> Any:
    """
    Get current authenticated user information.

    Requires valid JWT token in Authorization header.
    """
    return current_user


@router.post("/logout", response_model=AuthResponse)
async def logout(
    current_user: UserProfile = Depends(get_current_user)
) -> Any:
    """
    Logout user (token invalidation handled client-side for JWT).

    For complete security, implement token blacklisting if needed.
    """
    return AuthResponse(
        message="Logout successful. Please remove tokens from client storage."
    )