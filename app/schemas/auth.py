from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.utils.phone_validation import normalize_phone_number, get_phone_validation_error


class UserRegister(BaseModel):
    email: EmailStr = Field(..., description="User's email address")
    password: str = Field(..., min_length=8, description="User's password")
    phone_number: str = Field(..., description="User's phone number (required, E.164 format)")
    user_type: str = Field("farmer", description="Type of user: farmer, wholesaler, or admin")
    name: Optional[str] = Field(None, description="User's full name")
    address: Optional[str] = Field(None, description="User's address")

    @field_validator('phone_number')
    @classmethod
    def validate_phone_number(cls, v: str) -> str:
        """Validate and normalize phone number to E.164 format."""
        error_msg = get_phone_validation_error(v)
        if error_msg:
            raise ValueError(error_msg)
        return normalize_phone_number(v)

    class Config:
        json_schema_extra = {
            "example": {
                "email": "farmer@example.com",
                "password": "SecurePassword123!",
                "phone_number": "+27123456789",  # E.164 format or 0123456789 (SA format)
                "user_type": "farmer",  # Options: farmer, wholesaler, admin
                "name": "John Farmer",
                "address": "123 Farm Road, Western Cape"
            }
        }


class UserLogin(BaseModel):
    username: str = Field(
        ...,
        description="Email address or phone number (E.164 format: +27XXXXXXXXX or SA format: 0XXXXXXXXX)"
    )
    password: str = Field(..., description="User's password")

    @field_validator('username')
    @classmethod
    def validate_username(cls, v: str) -> str:
        """Validate that username is either a valid email or phone number."""
        from app.utils.phone_validation import detect_login_identifier_type

        identifier_type, _ = detect_login_identifier_type(v)

        if identifier_type == "unknown":
            raise ValueError(
                "Username must be a valid email address or phone number. "
                "Phone formats: +27XXXXXXXXX (international) or 0XXXXXXXXX (South African)"
            )

        return v.strip()

    class Config:
        json_schema_extra = {
            "example": {
                "username": "farmer@example.com",  # or "+27821234567" or "0821234567"
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
    email: str = Field(
        ...,
        description="Email address or phone number for password reset"
    )

    @field_validator('email')
    @classmethod
    def validate_email_or_phone(cls, v: str) -> str:
        """Validate that input is either valid email or phone number."""
        from app.utils.phone_validation import detect_login_identifier_type

        identifier_type, _ = detect_login_identifier_type(v)

        if identifier_type == "unknown":
            raise ValueError(
                "Must be a valid email address or phone number. "
                "Phone formats: +27XXXXXXXXX (international) or 0XXXXXXXXX (South African)"
            )

        return v.strip()

    class Config:
        json_schema_extra = {
            "example": {
                "email": "farmer@example.com"  # or "+27821234567" or "0821234567"
            }
        }


class PasswordResetConfirm(BaseModel):
    email: str = Field(..., description="Email address or phone number")
    confirmation_code: str = Field(..., description="Confirmation code received")
    new_password: str = Field(..., min_length=8, description="New password")

    @field_validator('email')
    @classmethod
    def validate_email_or_phone(cls, v: str) -> str:
        """Validate that input is either valid email or phone number."""
        from app.utils.phone_validation import detect_login_identifier_type

        identifier_type, _ = detect_login_identifier_type(v)

        if identifier_type == "unknown":
            raise ValueError(
                "Must be a valid email address or phone number. "
                "Phone formats: +27XXXXXXXXX (international) or 0XXXXXXXXX (South African)"
            )

        return v.strip()

    class Config:
        json_schema_extra = {
            "example": {
                "email": "farmer@example.com",  # or "+27821234567" or "0821234567"
                "confirmation_code": "123456",
                "new_password": "NewSecurePassword123!"
            }
        }


class PasswordResetResponse(BaseModel):
    delivery_medium: str = Field(..., description="How the code was delivered")
    destination: str = Field(..., description="Where the code was sent")
    message: str = Field(..., description="Success message")


class AuthResponse(BaseModel):
    data: Optional["LoginResponseData"] = None
    message: Optional[str] = Field(None, description="Response message")
    error: Optional[str] = Field(None, description="Error message")


class LoginResponseData(BaseModel):
    access_token: str = Field(..., description="JWT access token")
    id_token: str = Field(..., description="JWT ID token")
    refresh_token: str = Field(..., description="JWT refresh token")
    user: "UserResponse" = Field(..., description="User information")


class UserResponse(BaseModel):
    user_id: str = Field(..., description="User's unique identifier")
    user_sub: str = Field(..., description="User's Cognito sub")
    email: EmailStr = Field(..., description="User's email address")
    user_type: str = Field(..., description="Type of user")
    phone_number: str = Field(..., description="User's phone number")
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


class ConfirmRegistrationRequest(BaseModel):
    """Confirm user registration with verification code sent to phone"""
    email: EmailStr = Field(..., description="User's email address used during registration")
    confirmation_code: str = Field(..., min_length=6, max_length=6, description="6-digit verification code")

    @field_validator('confirmation_code')
    @classmethod
    def validate_confirmation_code(cls, v: str) -> str:
        """Validate confirmation code is 6 digits."""
        if not v.isdigit():
            raise ValueError("Confirmation code must contain only digits")
        if len(v) != 6:
            raise ValueError("Confirmation code must be exactly 6 digits")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "email": "farmer@example.com",
                "confirmation_code": "123456"
            }
        }


class RegistrationResponse(BaseModel):
    """Response for registration initiation"""
    user_sub: str = Field(..., description="Cognito user sub")
    code_delivery_medium: str = Field(..., description="Delivery method (SMS)")
    code_delivery_destination: str = Field(..., description="Masked phone number where code was sent")
    message: str = Field(..., description="Success message")

    class Config:
        json_schema_extra = {
            "example": {
                "user_sub": "cognito-user-sub-123",
                "code_delivery_medium": "SMS",
                "code_delivery_destination": "+27***4567",
                "message": "Verification code sent to your phone. Please confirm to complete registration."
            }
        }


class VerifyOTPRequest(BaseModel):
    """Simplified - only OTP code needed, phone comes from authenticated user's Cognito profile"""
    otp_code: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")

    @field_validator('otp_code')
    @classmethod
    def validate_otp_code(cls, v: str) -> str:
        """Validate OTP code is 6 digits."""
        if not v.isdigit():
            raise ValueError("OTP code must contain only digits")
        if len(v) != 6:
            raise ValueError("OTP code must be exactly 6 digits")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "otp_code": "123456"
            }
        }


class OTPResponse(BaseModel):
    status: str = Field(..., description="Response status")
    message: str = Field(..., description="Response message")
    delivery_medium: str = Field(..., description="Delivery method (SMS)")
    destination: str = Field(..., description="Masked phone number where OTP was sent")
    expires_in_minutes: int = Field(..., description="OTP expiry time in minutes (3 for Cognito)")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "message": "Verification code sent successfully",
                "delivery_medium": "SMS",
                "destination": "+27***4567",
                "expires_in_minutes": 3
            }
        }


class VerifyOTPResponse(BaseModel):
    status: str = Field(..., description="Response status")
    message: str = Field(..., description="Response message")
    phone_number: str = Field(..., description="Masked phone number")
    account_found: bool = Field(..., description="Whether an account was found for this phone")
    account: Optional[Dict[str, Any]] = Field(None, description="Account information if found")

    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "message": "Phone number verified successfully",
                "phone_number": "+27***4567",
                "account_found": True,
                "account": {
                    "email": "farmer@example.com",
                    "account_type": "farmer",
                    "phone_verified": True,
                    "phone_verified_at": "2025-12-05T10:30:00Z"
                }
            }
        }


# Update forward references
LoginResponseData.model_rebuild()
AuthResponse.model_rebuild()