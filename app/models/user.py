from sqlalchemy import Column, String, Text, Boolean, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
import enum

from app.db.base import BaseModel


class UserTypeEnum(str, enum.Enum):
    FARMER = "farmer"
    WHOLESALER = "wholesaler"
    ADMIN = "admin"


class UserStatusEnum(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    DISABLED = "disabled"
    SUSPENDED = "suspended"


class User(BaseModel):
    """
    Local user model to complement AWS Cognito authentication.

    This model stores extended user information and relationships
    while Cognito handles authentication and basic user data.
    """
    __tablename__ = "users"

    # Cognito integration
    cognito_sub = Column(String(255), unique=True, index=True, nullable=False)

    # Basic user information
    email = Column(String(255), unique=True, index=True, nullable=False)
    user_type = Column(Enum(UserTypeEnum), nullable=False, default=UserTypeEnum.FARMER)
    status = Column(Enum(UserStatusEnum), nullable=False, default=UserStatusEnum.PENDING)

    # Profile information
    name = Column(String(255), nullable=True)
    phone_number = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)

    # Extended profile data (stored as JSON)
    profile_data = Column(JSONB, nullable=True)

    # Verification and compliance
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    # KYC and verification timestamps
    kyc_submitted_at = Column(DateTime(timezone=True), nullable=True)
    kyc_verified_at = Column(DateTime(timezone=True), nullable=True)

    # Business information (for wholesalers)
    business_name = Column(String(255), nullable=True)
    business_license = Column(String(255), nullable=True)
    business_address = Column(Text, nullable=True)

    # Farming information (for farmers)
    farm_name = Column(String(255), nullable=True)
    farm_location = Column(String(255), nullable=True)
    farm_size = Column(String(100), nullable=True)  # e.g., "10 hectares"

    # Metadata
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    login_count = Column(String(10), default="0")

    def __repr__(self):
        return f"<User(email='{self.email}', user_type='{self.user_type}', status='{self.status}')>"

    @property
    def is_farmer(self) -> bool:
        return self.user_type == UserTypeEnum.FARMER

    @property
    def is_wholesaler(self) -> bool:
        return self.user_type == UserTypeEnum.WHOLESALER

    @property
    def is_admin(self) -> bool:
        return self.user_type == UserTypeEnum.ADMIN

    @property
    def display_name(self) -> str:
        """Return the display name for the user."""
        if self.name:
            return self.name
        if self.business_name:
            return self.business_name
        if self.farm_name:
            return self.farm_name
        return self.email.split('@')[0]