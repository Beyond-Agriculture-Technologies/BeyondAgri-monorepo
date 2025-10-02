from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field

from app.models import Account


class BaseProfile(BaseModel):
    """Base profile information."""
    name: Optional[str] = Field(None, description="Full name")
    phone_number: Optional[str] = Field(None, description="Phone number")
    address: Optional[str] = Field(None, description="Address")


class FarmerProfileData(BaseModel):
    """Farmer-specific profile data."""
    farm_name: Optional[str] = Field(None, description="Farm name")
    farm_location: Optional[str] = Field(None, description="Farm location")
    farm_size: Optional[str] = Field(None, description="Farm size")
    certifications: Optional[Dict[str, Any]] = Field(None, description="Certifications")
    crop_types: Optional[Dict[str, Any]] = Field(None, description="Crop types")
    farming_methods: Optional[Dict[str, Any]] = Field(None, description="Farming methods")
    equipment: Optional[Dict[str, Any]] = Field(None, description="Equipment")


class BusinessProfileData(BaseModel):
    """Business-specific profile data."""
    business_name: Optional[str] = Field(None, description="Business name")
    business_license: Optional[str] = Field(None, description="Business license")
    business_address: Optional[str] = Field(None, description="Business address")
    business_type: Optional[str] = Field(None, description="Business type")
    verification_documents: Optional[Dict[str, Any]] = Field(None, description="Verification documents")
    business_categories: Optional[Dict[str, Any]] = Field(None, description="Business categories")
    service_areas: Optional[Dict[str, Any]] = Field(None, description="Service areas")
    capacity: Optional[Dict[str, Any]] = Field(None, description="Capacity information")


class AccountProfile(BaseModel):
    """Complete account profile with all associated data."""
    id: int = Field(..., description="Account ID")
    external_auth_id: str = Field(..., description="External authentication provider ID")
    email: EmailStr = Field(..., description="Email address")
    account_type: str = Field(..., description="Account type")
    status: str = Field(..., description="Account status")
    is_verified: bool = Field(..., description="Verification status")
    is_active: bool = Field(..., description="Active status")
    last_login_at: Optional[datetime] = Field(None, description="Last login timestamp")
    login_count: int = Field(..., description="Login count")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    # Profile data
    profile: Optional[BaseProfile] = Field(None, description="Basic profile information")
    farmer_profile: Optional[FarmerProfileData] = Field(None, description="Farmer profile data")
    business_profile: Optional[BusinessProfileData] = Field(None, description="Business profile data")

    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "external_auth_id": "abc-123-def",
                "email": "farmer@example.com",
                "account_type": "farmer",
                "status": "active",
                "is_verified": True,
                "is_active": True,
                "login_count": 5,
                "profile": {
                    "name": "John Farmer",
                    "phone_number": "+27123456789",
                    "address": "123 Farm Road"
                },
                "farmer_profile": {
                    "farm_name": "Green Acres",
                    "farm_location": "Western Cape",
                    "farm_size": "10 hectares"
                }
            }
        }

    @classmethod
    def from_account(cls, account: Account) -> "AccountProfile":
        """Create AccountProfile from Account model."""
        profile_data = None
        if account.profile:
            profile_data = BaseProfile(
                name=account.profile.name,
                phone_number=account.profile.phone_number,
                address=account.profile.address
            )

        farmer_profile_data = None
        if account.farmer_profile:
            farmer_profile_data = FarmerProfileData(
                farm_name=account.farmer_profile.farm_name,
                farm_location=account.farmer_profile.farm_location,
                farm_size=account.farmer_profile.farm_size,
                certifications=account.farmer_profile.certifications,
                crop_types=account.farmer_profile.crop_types,
                farming_methods=account.farmer_profile.farming_methods,
                equipment=account.farmer_profile.equipment
            )

        business_profile_data = None
        if account.business_profile:
            business_profile_data = BusinessProfileData(
                business_name=account.business_profile.business_name,
                business_license=account.business_profile.business_license,
                business_address=account.business_profile.business_address,
                business_type=account.business_profile.business_type,
                verification_documents=account.business_profile.verification_documents,
                business_categories=account.business_profile.business_categories,
                service_areas=account.business_profile.service_areas,
                capacity=account.business_profile.capacity
            )

        return cls(
            id=account.id,
            external_auth_id=account.external_auth_id,
            email=account.email,
            account_type=account.account_type.value,
            status=account.status.value,
            is_verified=account.is_verified,
            is_active=account.is_active,
            last_login_at=account.last_login_at,
            login_count=account.login_count,
            created_at=account.created_at,
            updated_at=account.updated_at,
            profile=profile_data,
            farmer_profile=farmer_profile_data,
            business_profile=business_profile_data
        )


class AccountProfileUpdate(BaseModel):
    """Schema for updating account profile."""
    # Basic profile updates
    name: Optional[str] = Field(None, description="Full name")
    phone_number: Optional[str] = Field(None, description="Phone number")
    address: Optional[str] = Field(None, description="Address")

    # Farmer profile updates
    farm_name: Optional[str] = Field(None, description="Farm name")
    farm_location: Optional[str] = Field(None, description="Farm location")
    farm_size: Optional[str] = Field(None, description="Farm size")

    # Business profile updates
    business_name: Optional[str] = Field(None, description="Business name")
    business_license: Optional[str] = Field(None, description="Business license")
    business_address: Optional[str] = Field(None, description="Business address")
    business_type: Optional[str] = Field(None, description="Business type")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Updated Farmer",
                "phone_number": "+27987654321",
                "farm_name": "Green Acres Updated"
            }
        }


class VerificationSubmission(BaseModel):
    """Schema for submitting verification documents."""
    verification_type: str = Field(..., description="Type of verification")
    documents: Dict[str, Any] = Field(..., description="Verification documents")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "verification_type": "identity",
                "documents": {
                    "id_document_url": "https://s3.bucket.com/docs/id123.pdf",
                    "document_type": "national_id"
                },
                "metadata": {
                    "document_number": "8001015009087"
                }
            }
        }


class VerificationResponse(BaseModel):
    """Response for verification submission."""
    id: int = Field(..., description="Verification record ID")
    verification_type: str = Field(..., description="Type of verification")
    status: str = Field(..., description="Verification status")
    submitted_at: datetime = Field(..., description="Submission timestamp")
    message: str = Field(..., description="Response message")


class RoleResponse(BaseModel):
    """Response for role information."""
    id: int = Field(..., description="Role ID")
    name: str = Field(..., description="Role name")
    description: Optional[str] = Field(None, description="Role description")
    permissions: Dict[str, Any] = Field(..., description="Role permissions")