from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=8, description="User's password")
    phone_number: Optional[str] = Field(None, description="User's phone number")
    user_type: str = Field("farmer", description="Type of user: farmer, wholesaler, or admin")
    name: Optional[str] = Field(None, description="User's full name")
    address: Optional[str] = Field(None, description="User's address")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "farmer@example.com",
                "password": "SecurePassword123!",
                "phone_number": "+27123456789",
                "user_type": "farmer",  # Options: farmer, wholesaler, admin
                "name": "John Farmer",
                "address": "123 Farm Road, Western Cape"
            }
        }


class UserLogin(BaseModel):
    username: EmailStr = Field(..., description="Username (email)")
    password: str = Field(..., description="User's password")

    class Config:
        json_schema_extra = {
            "example": {
                "username": "farmer@example.com",
                "password": "SecurePassword123!"
            }
        }


class Token(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    id_token: str = Field(..., description="JWT ID token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field("bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")


class TokenData(BaseModel):
    username: Optional[str] = None
    user_sub: Optional[str] = None


class PasswordResetRequest(BaseModel):
    email: EmailStr = Field(..., description="Email address for password reset")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "farmer@example.com"
            }
        }


class PasswordResetConfirm(BaseModel):
    email: EmailStr = Field(..., description="Email address")
    confirmation_code: str = Field(..., description="Confirmation code received")
    new_password: str = Field(..., min_length=8, description="New password")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "farmer@example.com",
                "confirmation_code": "123456",
                "new_password": "NewSecurePassword123!"
            }
        }


class PasswordResetResponse(BaseModel):
    delivery_medium: str = Field(..., description="How the code was delivered")
    destination: str = Field(..., description="Where the code was sent")
    message: str = Field(..., description="Success message")


class AuthResponse(BaseModel):
    message: str = Field(..., description="Response message")
    user: Optional["UserResponse"] = None
    tokens: Optional[Token] = None


class UserResponse(BaseModel):
    user_id: str = Field(..., description="User's unique identifier")
    user_sub: str = Field(..., description="User's Cognito sub")
    email: EmailStr = Field(..., description="User's email address")
    user_type: str = Field(..., description="Type of user")
    phone_number: Optional[str] = Field(None, description="User's phone number")
    status: Optional[str] = Field(None, description="User account status")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "farmer@example.com",
                "user_sub": "cognito-user-sub-123",
                "email": "farmer@example.com",
                "user_type": "farmer",
                "phone_number": "+27123456789",
                "status": "CONFIRMED"
            }
        }


# Update forward references
AuthResponse.model_rebuild()