from fastapi import APIRouter, Depends, HTTPException, status
from typing import Any

from app.schemas.user import UserProfile, UserProfileUpdate, KYCSubmission
from app.core.deps import get_current_active_user

router = APIRouter()


@router.get("/profile", response_model=UserProfile)
async def get_profile(
    current_user: UserProfile = Depends(get_current_active_user)
) -> Any:
    """
    Get current user's profile information.

    Requires authentication. Returns the authenticated user's profile data.
    """
    return current_user


@router.put("/profile", response_model=UserProfile)
async def update_profile(
    profile_update: UserProfileUpdate,
    current_user: UserProfile = Depends(get_current_active_user)
) -> Any:
    """
    Update user profile information.

    - **name**: Updated full name
    - **phone_number**: Updated phone number
    - **address**: Updated address

    Note: This endpoint currently returns the updated profile structure.
    In a full implementation, this would update the user data in Cognito
    and/or a local database.
    """
    # In a full implementation, you would:
    # 1. Update user attributes in AWS Cognito
    # 2. Update any local database records
    # 3. Return the updated user profile

    # For now, we'll simulate an update by returning modified profile
    updated_profile = current_user.model_copy()

    if profile_update.name is not None:
        updated_profile.name = profile_update.name
    if profile_update.phone_number is not None:
        updated_profile.phone_number = profile_update.phone_number
    if profile_update.address is not None:
        updated_profile.address = profile_update.address

    return updated_profile


@router.post("/kyc")
async def submit_kyc(
    kyc_data: KYCSubmission,
    current_user: UserProfile = Depends(get_current_active_user)
) -> Any:
    """
    Submit KYC (Know Your Customer) documents.

    - **document_type**: Type of document (e.g., 'identity_document', 'proof_of_address')
    - **document_url**: URL to the uploaded document
    - **additional_info**: Any additional information about the document

    This endpoint would typically:
    1. Validate the document
    2. Store KYC information
    3. Update user verification status
    """
    # In a full implementation, you would:
    # 1. Validate the document URL
    # 2. Store KYC information in database
    # 3. Trigger KYC verification process
    # 4. Update user verification status

    return {
        "message": "KYC documents submitted successfully",
        "user_id": current_user.user_id,
        "document_type": kyc_data.document_type,
        "status": "submitted",
        "note": "Documents are under review"
    }