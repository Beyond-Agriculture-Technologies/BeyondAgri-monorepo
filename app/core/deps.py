import logging
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.schemas.auth import TokenData
from app.schemas.account import AccountProfile
from app.services.authentication import auth_service, get_auth_service_with_db, AuthenticationError
from app.services.account_service import AccountService
from app.db.session import get_db
from app.models.account import AccountTypeEnum, AccountStatusEnum

logger = logging.getLogger(__name__)

security = HTTPBearer()


# Account-based dependencies
async def get_current_account(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> AccountProfile:
    """
    Dependency to get the current authenticated account from JWT token.
    Uses the new account structure with enhanced profiles.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials

    try:
        # Validate token with auth service
        auth_service_instance = get_auth_service_with_db(db)
        user_info = await auth_service_instance.validate_token(token)

        # Get account data from local database
        account_service = AccountService(db)
        account = account_service.get_account_by_external_auth_id(user_info["user_sub"])

        if account:
            return AccountProfile.from_account(account)
        else:
            # Account not found in local database
            logger.warning(f"Account not found in local database for user_sub={user_info.get('user_sub')}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found in local database"
            )

    except AuthenticationError as e:
        logger.debug(f"Authentication error validating token: {e}")
        raise credentials_exception
    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error retrieving account: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred while retrieving account"
        )
    except Exception as e:
        logger.error(f"Unexpected error retrieving account: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving account"
        )


async def get_current_active_account(
    current_account: AccountProfile = Depends(get_current_account)
) -> AccountProfile:
    """
    Dependency to get the current active account.
    Ensures the account is active and not disabled.
    """
    # Use enum values for comparison (UPPERCASE)
    inactive_statuses = [AccountStatusEnum.DISABLED.value, AccountStatusEnum.SUSPENDED.value]
    if not current_account.is_active or current_account.status in inactive_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive or disabled"
        )
    return current_account


async def get_current_farmer_account(
    current_account: AccountProfile = Depends(get_current_active_account)
) -> AccountProfile:
    """
    Dependency to ensure the current account is a farmer.
    """
    if current_account.account_type != AccountTypeEnum.FARMER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Farmer account required."
        )
    return current_account


async def get_current_wholesaler_account(
    current_account: AccountProfile = Depends(get_current_active_account)
) -> AccountProfile:
    """
    Dependency to ensure the current account is a wholesaler.
    """
    if current_account.account_type != AccountTypeEnum.WHOLESALER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Wholesaler account required."
        )
    return current_account


async def get_current_admin_account(
    current_account: AccountProfile = Depends(get_current_active_account)
) -> AccountProfile:
    """
    Dependency to ensure the current account is an admin.
    """
    if current_account.account_type != AccountTypeEnum.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin account required."
        )
    return current_account


async def get_current_business_account(
    current_account: AccountProfile = Depends(get_current_active_account)
) -> AccountProfile:
    """
    Dependency to ensure the current account is a business (wholesaler or admin).
    """
    business_types = [AccountTypeEnum.WHOLESALER.value, AccountTypeEnum.ADMIN.value]
    if current_account.account_type not in business_types:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Business account required."
        )
    return current_account


async def get_optional_current_account(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
) -> Optional[AccountProfile]:
    """
    Dependency to optionally get the current account.
    Returns None if no valid token is provided.
    """
    if not credentials:
        return None

    try:
        return await get_current_account(credentials)
    except HTTPException:
        return None


async def get_current_account_with_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> tuple[Optional[AccountProfile], Optional[str]]:
    """
    Dependency to optionally get the current account with access token.
    Returns (account_profile, access_token) tuple, or (None, None) if not authenticated.
    Used for endpoints that behave differently for authenticated vs unauthenticated users.
    """
    if not credentials:
        return (None, None)

    try:
        access_token = credentials.credentials
        account = await get_current_account(credentials, db)
        return (account, access_token)
    except HTTPException:
        return (None, None)
