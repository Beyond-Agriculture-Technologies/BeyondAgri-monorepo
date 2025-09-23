from sqlalchemy import Column, String, Boolean, DateTime, Enum, Integer, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.base import BaseModel


class AccountTypeEnum(str, enum.Enum):
    FARMER = "farmer"
    WHOLESALER = "wholesaler"
    ADMIN = "admin"


class AccountStatusEnum(str, enum.Enum):
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DISABLED = "disabled"
    PENDING_VERIFICATION = "pending_verification"


class Account(BaseModel):
    """
    Core account model for authentication and system access.

    This model handles system access and links to AWS Cognito,
    while specific profile data is stored in related tables.
    """
    __tablename__ = "accounts"

    # Cognito integration
    cognito_sub = Column(String(255), unique=True, index=True, nullable=False)

    # Core account information
    email = Column(String(255), unique=True, index=True, nullable=False)
    account_type = Column(Enum(AccountTypeEnum), nullable=False, default=AccountTypeEnum.FARMER)
    status = Column(Enum(AccountStatusEnum), nullable=False, default=AccountStatusEnum.PENDING_VERIFICATION)

    # Verification and access control
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)

    # Login tracking
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    login_count = Column(Integer, default=0)

    # Relationships
    profile = relationship("UserProfile", back_populates="account", uselist=False, cascade="all, delete-orphan")
    farmer_profile = relationship("FarmerProfile", back_populates="account", uselist=False, cascade="all, delete-orphan")
    business_profile = relationship("BusinessProfile", back_populates="account", uselist=False, cascade="all, delete-orphan")
    verification_records = relationship("VerificationRecord", back_populates="account", cascade="all, delete-orphan")
    activity_logs = relationship("AccountActivityLog", back_populates="account", cascade="all, delete-orphan")
    account_roles = relationship("AccountRole", back_populates="account", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Account(email='{self.email}', account_type='{self.account_type}', status='{self.status}')>"

    @property
    def is_farmer(self) -> bool:
        return self.account_type == AccountTypeEnum.FARMER

    @property
    def is_wholesaler(self) -> bool:
        return self.account_type == AccountTypeEnum.WHOLESALER

    @property
    def is_admin(self) -> bool:
        return self.account_type == AccountTypeEnum.ADMIN

    @property
    def display_name(self) -> str:
        """Return the display name for the account."""
        if self.profile and self.profile.name:
            return self.profile.name
        if self.business_profile and self.business_profile.business_name:
            return self.business_profile.business_name
        if self.farmer_profile and self.farmer_profile.farm_name:
            return self.farmer_profile.farm_name
        return self.email.split('@')[0]