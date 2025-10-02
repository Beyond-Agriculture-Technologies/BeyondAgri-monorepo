from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from typing import Any, List, Dict
from sqlalchemy.orm import Session

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
from app.models import VerificationTypeEnum, Account, AccountStatusEnum

router = APIRouter()


@router.get("/profile", response_model=AccountProfile)
async def get_account_profile(
    current_account: AccountProfile = Depends(get_current_account)
) -> Any:
    """
    Get detailed account profile including all associated profiles.
    """
    return current_account


@router.put("/profile", response_model=AccountProfile)
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
        account = account_service.get_account_by_external_auth_id(current_account.external_auth_id)

        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )

        # Prepare update data
        update_data = profile_update.dict(exclude_unset=True)

        # Update account
        updated_account = account_service.update_profile(account, update_data)

        # Return updated profile
        return AccountProfile.from_account(updated_account)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update profile: {str(e)}"
        )


@router.post("/verification/submit", response_model=VerificationResponse)
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
        account = account_service.get_account_by_external_auth_id(current_account.external_auth_id)

        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )

        verification_record = account_service.submit_verification(
            account=account,
            verification_type=VerificationTypeEnum(verification.verification_type),
            documents=verification.documents,
            metadata=verification.verification_metadata
        )

        return VerificationResponse(
            id=verification_record.id,
            verification_type=verification_record.verification_type.value,
            status=verification_record.status.value,
            submitted_at=verification_record.submitted_at,
            message="Verification submitted successfully"
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to submit verification: {str(e)}"
        )


@router.get("/verification/status", response_model=Dict[str, str])
async def get_verification_status(
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get verification status for all verification types.
    """
    try:
        account_service = AccountService(db)
        account = account_service.get_account_by_external_auth_id(current_account.external_auth_id)

        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )

        return account_service.get_verification_status(account)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to get verification status: {str(e)}"
        )


@router.get("/roles", response_model=List[RoleResponse])
async def get_account_roles(
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get all roles assigned to the account.
    """
    try:
        account_service = AccountService(db)
        account = account_service.get_account_by_external_auth_id(current_account.external_auth_id)

        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )

        roles = account_service.get_account_roles(account)
        return [
            RoleResponse(
                id=role.id,
                name=role.name,
                description=role.description,
                permissions=role.permissions
            )
            for role in roles
        ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to get roles: {str(e)}"
        )


@router.get("/permissions", response_model=Dict[str, bool])
async def get_account_permissions(
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get consolidated permissions for the account.
    """
    try:
        account_service = AccountService(db)
        account = account_service.get_account_by_external_auth_id(current_account.external_auth_id)

        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )

        return account_service.get_account_permissions(account)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to get permissions: {str(e)}"
        )


@router.delete("/deactivate", response_model=Dict[str, str])
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
        from datetime import datetime
        from app.services.authentication import get_auth_service_with_db, AuthenticationError

        account_service = AccountService(db)
        account = account_service.get_account_by_external_auth_id(current_account.external_auth_id)

        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )

        # Check if already deleted
        if account.is_deleted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account is already deactivated"
            )

        # Soft delete in database
        account.is_deleted = True
        account.deleted_at = datetime.utcnow()
        account.is_active = False
        account.status = AccountStatusEnum.DISABLED

        # Disable user in Cognito
        auth_service = get_auth_service_with_db(db)
        try:
            await auth_service.disable_user(current_account.external_auth_id)
        except AuthenticationError as e:
            # Log error but don't fail the request if Cognito disable fails
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to disable user in Cognito: {e}")

        db.commit()

        return {
            "message": "Account deactivated successfully. You can recover it within 3 years by contacting support.",
            "deleted_at": account.deleted_at.isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to deactivate account: {str(e)}"
        )


@router.delete("/delete-permanently/{account_id}", response_model=Dict[str, str])
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
        from app.services.authentication import get_auth_service_with_db, AuthenticationError

        account_service = AccountService(db)

        # Check if current user is admin
        if current_account.account_type != "admin":
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

        # Delete from Cognito
        auth_service = get_auth_service_with_db(db)
        try:
            await auth_service.delete_user_permanently(account.external_auth_id)
        except AuthenticationError as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to delete user from Cognito: {e}")

        # Delete from database (CASCADE will handle related records)
        db.delete(account)
        db.commit()

        return {
            "message": f"Account {account.email} permanently deleted",
            "account_id": str(account_id)
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to permanently delete account: {str(e)}"
        )