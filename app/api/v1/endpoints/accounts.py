from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File
from typing import Any, List, Dict
from sqlalchemy.orm import Session

from app.schemas.account import (
    AccountProfile,
    AccountProfileUpdate,
    VerificationSubmission,
    VerificationResponse,
    ActivityLogResponse,
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
        account = account_service.get_account_by_cognito_sub(current_account.cognito_sub)

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
        account = account_service.get_account_by_cognito_sub(current_account.cognito_sub)

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
        account = account_service.get_account_by_cognito_sub(current_account.cognito_sub)

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
        account = account_service.get_account_by_cognito_sub(current_account.cognito_sub)

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
        account = account_service.get_account_by_cognito_sub(current_account.cognito_sub)

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


@router.get("/activity", response_model=List[ActivityLogResponse])
async def get_account_activity(
    limit: int = 50,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get recent activity log for the account.
    """
    try:
        account_service = AccountService(db)
        account = account_service.get_account_by_cognito_sub(current_account.cognito_sub)

        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )

        activity_logs = account_service.get_activity_log(account, limit)
        return [
            ActivityLogResponse(
                id=log.id,
                activity_type=log.activity_type.value,
                description=log.description,
                metadata=log.activity_metadata,
                ip_address=log.ip_address,
                user_agent=log.user_agent,
                created_at=log.created_at
            )
            for log in activity_logs
        ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to get activity log: {str(e)}"
        )


@router.delete("/deactivate", response_model=Dict[str, str])
async def deactivate_account(
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
) -> Any:
    """
    Deactivate the current account.
    """
    try:
        account_service = AccountService(db)
        account = account_service.get_account_by_cognito_sub(current_account.cognito_sub)

        if not account:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Account not found"
            )

        # Update account status
        account.is_active = False
        account.status = AccountStatusEnum.DISABLED

        # Log the deactivation
        from app.models import AccountActivityLog, ActivityTypeEnum
        activity_log = AccountActivityLog(
            account_id=account.id,
            activity_type=ActivityTypeEnum.ACCOUNT_DISABLED,
            description="Account deactivated by user"
        )
        db.add(activity_log)
        db.commit()

        return {"message": "Account deactivated successfully"}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to deactivate account: {str(e)}"
        )