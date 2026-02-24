import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from typing import Any, List, Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from app.schemas.account import (
    AccountProfile,
    AccountProfileUpdate,
    VerificationSubmission,
    VerificationResponse,
    RoleResponse
)
from app.core.deps import get_current_account
from app.db.session import get_db
from app.services.account_service import AccountService
from app.models import VerificationTypeEnum, Account, AccountStatusEnum, AccountTypeEnum
from app.services.authentication import get_auth_service_with_db, AuthenticationError

logger = logging.getLogger(__name__)

router = APIRouter()


def _get_account_or_404(
    account_service: AccountService,
    external_auth_id: str
) -> Account:
    """
    Helper function to get account by external auth ID or raise 404.
    Eliminates repeated lookup pattern across endpoints.
    """
    account = account_service.get_account_by_external_auth_id(external_auth_id)
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found"
        )
    return account


@router.get("/profile", response_model=AccountProfile, status_code=status.HTTP_200_OK)
async def get_account_profile(
    current_account: AccountProfile = Depends(get_current_account)
) -> Any:
    """
    Get detailed account profile including all associated profiles.
    """
    logger.info(f"Fetching profile for account_id={current_account.id}")
    return current_account


@router.put("/profile", response_model=AccountProfile, status_code=status.HTTP_200_OK)
async def update_account_profile(
    profile_update: AccountProfileUpdate,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
) -> Any:
    """
    Update account profile information.
    """
    try:
        account_service = AccountService(db)
        account = _get_account_or_404(account_service, current_account.external_auth_id)

        # Prepare update data
        update_data = profile_update.dict(exclude_unset=True)

        # Update account
        updated_account = account_service.update_profile(account, update_data)
        logger.info(f"Updated profile for account_id={account.id}")

        # Return updated profile
        return AccountProfile.from_account(updated_account)

    except HTTPException:
        raise
    except IntegrityError as e:
        logger.error(f"Integrity error updating profile for account_id={current_account.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Profile update failed due to a data conflict"
        )
    except SQLAlchemyError as e:
        logger.error(f"Database error updating profile for account_id={current_account.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred. Please try again."
        )


@router.post("/verification/submit", response_model=VerificationResponse, status_code=status.HTTP_201_CREATED)
async def submit_verification(
    verification: VerificationSubmission,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
) -> Any:
    """
    Submit verification documents for account.
    """
    try:
        account_service = AccountService(db)
        account = _get_account_or_404(account_service, current_account.external_auth_id)

        verification_record = account_service.submit_verification(
            account=account,
            verification_type=VerificationTypeEnum(verification.verification_type.upper()),
            documents=verification.documents,
            metadata=verification.verification_metadata
        )

        logger.info(f"Verification submitted for account_id={account.id}, type={verification.verification_type}")

        return VerificationResponse(
            id=verification_record.id,
            verification_type=verification_record.verification_type.value,
            status=verification_record.status.value,
            submitted_at=verification_record.submitted_at,
            message="Verification submitted successfully"
        )

    except HTTPException:
        raise
    except ValueError as e:
        logger.warning(f"Invalid verification type for account_id={current_account.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification type"
        )
    except IntegrityError as e:
        logger.error(f"Integrity error submitting verification for account_id={current_account.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Verification submission failed due to a conflict"
        )
    except SQLAlchemyError as e:
        logger.error(f"Database error submitting verification for account_id={current_account.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred. Please try again."
        )


@router.get("/verification/status", response_model=Dict[str, str], status_code=status.HTTP_200_OK)
async def get_verification_status(
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get verification status for all verification types.
    """
    try:
        account_service = AccountService(db)
        account = _get_account_or_404(account_service, current_account.external_auth_id)

        logger.info(f"Fetching verification status for account_id={account.id}")
        return account_service.get_verification_status(account)

    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error getting verification status for account_id={current_account.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred. Please try again."
        )


@router.get("/roles", response_model=List[RoleResponse], status_code=status.HTTP_200_OK)
async def get_account_roles(
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get all roles assigned to the account.
    """
    try:
        account_service = AccountService(db)
        account = _get_account_or_404(account_service, current_account.external_auth_id)

        roles = account_service.get_account_roles(account)
        logger.info(f"Fetched {len(roles)} roles for account_id={account.id}")

        return [
            RoleResponse(
                id=role.id,
                name=role.name,
                description=role.description,
                permissions=role.permissions
            )
            for role in roles
        ]

    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error getting roles for account_id={current_account.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred. Please try again."
        )


@router.get("/permissions", response_model=Dict[str, bool], status_code=status.HTTP_200_OK)
async def get_account_permissions(
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get consolidated permissions for the account.
    """
    try:
        account_service = AccountService(db)
        account = _get_account_or_404(account_service, current_account.external_auth_id)

        logger.info(f"Fetching permissions for account_id={account.id}")
        return account_service.get_account_permissions(account)

    except HTTPException:
        raise
    except SQLAlchemyError as e:
        logger.error(f"Database error getting permissions for account_id={current_account.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred. Please try again."
        )


@router.delete("/deactivate", response_model=Dict[str, str], status_code=status.HTTP_200_OK)
async def deactivate_account(
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
) -> Any:
    """
    Soft delete account - marks as deleted in database and disables in Cognito.

    Account can be recovered within 3 years before permanent deletion.
    User will not be able to login after deactivation.
    """
    try:
        account_service = AccountService(db)
        account = _get_account_or_404(account_service, current_account.external_auth_id)

        # Check if already deleted
        if account.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account is already deactivated"
            )

        # Soft delete in database
        account.is_deleted = True
        account.deleted_at = datetime.now(timezone.utc)
        account.is_active = False
        account.status = AccountStatusEnum.DISABLED

        # Disable user in Cognito
        auth_service = get_auth_service_with_db(db)
        try:
            await auth_service.disable_user(current_account.external_auth_id)
        except AuthenticationError as e:
            # Log error but don't fail the request if Cognito disable fails
            logger.warning(f"Failed to disable user in Cognito for account_id={account.id}: {e}")

        db.commit()
        logger.info(f"Account deactivated: account_id={account.id}")

        return {
            "message": "Account deactivated successfully. You can recover it within 3 years by contacting support.",
            "deleted_at": account.deleted_at.isoformat()
        }

    except HTTPException:
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error deactivating account_id={current_account.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred. Please try again."
        )


@router.delete("/delete-permanently/{account_id}", response_model=Dict[str, str], status_code=status.HTTP_200_OK)
async def delete_account_permanently(
    account_id: int,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
) -> Any:
    """
    Permanently delete an account (ADMIN ONLY).

    This action:
    - Deletes user from Cognito (cannot login)
    - Deletes all account data from database (profiles, verifications, roles)
    - Cannot be recovered

    Typically used for accounts deleted >3 years ago or by admin request.
    """
    try:
        account_service = AccountService(db)

        # Check if current user is admin (use enum comparison, not string)
        if current_account.account_type != AccountTypeEnum.ADMIN.value:
            logger.warning(f"Non-admin user attempted permanent deletion: account_id={current_account.id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only administrators can permanently delete accounts"
            )

        # Get account to delete
        account = account_service.get_account_with_profiles(account_id)

        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )

        # Prevent admin from deleting themselves
        if account.external_auth_id == current_account.external_auth_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )

        account_email = account.email

        # Delete from Cognito
        auth_service = get_auth_service_with_db(db)
        try:
            await auth_service.delete_user_permanently(account.external_auth_id)
        except AuthenticationError as e:
            logger.warning(f"Failed to delete user from Cognito for account_id={account_id}: {e}")

        # Delete from database (CASCADE will handle related records)
        db.delete(account)
        db.commit()

        logger.info(f"Account permanently deleted by admin: account_id={account_id}, deleted_by={current_account.id}")

        return {
            "message": f"Account {account_email} permanently deleted",
            "account_id": str(account_id)
        }

    except HTTPException:
        raise
    except SQLAlchemyError as e:
        db.rollback()
        logger.error(f"Database error permanently deleting account_id={account_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred. Please try again."
        )
