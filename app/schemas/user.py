from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserProfile(BaseModel):
    user_id: str = Field(..., description="User's unique identifier")
    user_sub: str = Field(..., description="User's Cognito sub")
    email: EmailStr = Field(..., description="User's email address")
    user_type: str = Field(..., description="Type of user: farmer, wholesaler, or admin")
    name: Optional[str] = Field(None, description="User's full name")
    phone_number: Optional[str] = Field(None, description="User's phone number")
    address: Optional[str] = Field(None, description="User's address")
    status: Optional[str] = Field(None, description="User account status")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "farmer@example.com",
                "user_sub": "cognito-user-sub-123",
                "email": "farmer@example.com",
                "user_type": "farmer",
                "name": "John Farmer",
                "phone_number": "+27123456789",
                "address": "123 Farm Road, Western Cape",
                "status": "CONFIRMED"
            }
        }


class UserProfileUpdate(BaseModel):
    name: Optional[str] = Field(None, description="User's full name")
    phone_number: Optional[str] = Field(None, description="User's phone number")
    address: Optional[str] = Field(None, description="User's address")

    class Config:
        json_schema_extra = {
            "example": {
                "name": "John Updated Farmer",
                "phone_number": "+27987654321",
                "address": "456 New Farm Road, Western Cape"
            }
        }


class KYCSubmission(BaseModel):
    document_type: str = Field(..., description="Type of KYC document")
    document_url: str = Field(..., description="URL to uploaded document")
    additional_info: Optional[str] = Field(None, description="Additional information")

    class Config:
        json_schema_extra = {
            "example": {
                "document_type": "identity_document",
                "document_url": "https://s3.bucket.com/kyc/doc123.pdf",
                "additional_info": "Government issued ID"
            }
        }