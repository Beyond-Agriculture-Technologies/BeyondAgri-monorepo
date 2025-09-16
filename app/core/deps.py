from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.schemas.auth import TokenData
from app.schemas.user import UserProfile
from app.services.authentication import auth_service, get_auth_service_with_db, AuthenticationError
from app.services.user_service import UserService
from app.db.session import get_db

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> UserProfile:
    """
    Dependency to get the current authenticated user from JWT token.

    This function validates the JWT token and returns the user information,
    preferring local database data when available.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials

    try:
        # Validate token with Cognito
        user_info = await auth_service.validate_token(token)

        # Try to get enhanced user data from local database
        user_service = UserService(db)
        local_user = user_service.get_user_by_cognito_sub(user_info["user_sub"])

        if local_user:
            # Return enhanced profile from local database
            return user_service.to_user_profile(local_user)
        else:
            # Fallback to Cognito data only
            return UserProfile(
                user_id=user_info["user_id"],
                user_sub=user_info["user_sub"],
                email=user_info["email"],
                user_type=user_info["user_type"],
                phone_number=user_info.get("phone_number"),
                status="CONFIRMED"  # If token is valid, user is confirmed
            )

    except AuthenticationError:
        # If Cognito token validation fails, try local JWT validation
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )
            username: str = payload.get("sub")
            if username is None:
                raise credentials_exception
            token_data = TokenData(username=username)
        except JWTError:
            raise credentials_exception

        # For local JWT tokens, we would need to fetch user from database
        # For now, since we're using Cognito, this is a fallback
        raise credentials_exception


async def get_current_active_user(
    current_user: UserProfile = Depends(get_current_user)
) -> UserProfile:
    """
    Dependency to get the current active user.
    Ensures the user account is confirmed and active.
    """
    if current_user.status != "CONFIRMED":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account"
        )
    return current_user


async def get_current_farmer(
    current_user: UserProfile = Depends(get_current_active_user)
) -> UserProfile:
    """
    Dependency to ensure the current user is a farmer.
    """
    if current_user.user_type != "farmer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Farmer account required."
        )
    return current_user


async def get_current_wholesaler(
    current_user: UserProfile = Depends(get_current_active_user)
) -> UserProfile:
    """
    Dependency to ensure the current user is a wholesaler.
    """
    if current_user.user_type != "wholesaler":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Wholesaler account required."
        )
    return current_user


async def get_current_admin(
    current_user: UserProfile = Depends(get_current_active_user)
) -> UserProfile:
    """
    Dependency to ensure the current user is an admin.
    """
    if current_user.user_type != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin account required."
        )
    return current_user


async def get_current_admin_or_wholesaler(
    current_user: UserProfile = Depends(get_current_active_user)
) -> UserProfile:
    """
    Dependency to ensure the current user is an admin or wholesaler.
    """
    if current_user.user_type not in ["admin", "wholesaler"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin or wholesaler account required."
        )
    return current_user


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[UserProfile]:
    """
    Dependency to optionally get the current user.
    Returns None if no valid token is provided.
    """
    if not credentials:
        return None

    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None