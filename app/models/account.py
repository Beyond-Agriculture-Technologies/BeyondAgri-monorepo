from sqlalchemy import Column, String, Boolean, DateTime, Enum, Integer
from sqlalchemy.orm import relationship
import enum

from app.db.base import BaseModel


class AccountTypeEnum(str, enum.Enum):
    """Account types - values must match database enum (UPPERCASE)"""
    FARMER = "FARMER"
    WHOLESALER = "WHOLESALER"
    ADMIN = "ADMIN"


class AccountStatusEnum(str, enum.Enum):
    """Account status - values must match database enum (UPPERCASE)"""
    ACTIVE = "ACTIVE"
    SUSPENDED = "SUSPENDED"
    DISABLED = "DISABLED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"


class Account(BaseModel):
    """
    Core account model for authentication and system access.

    This model handles system access and links to AWS Cognito,
    while specific profile data is stored in related tables.
    """
    __tablename__ = "accounts"

    # External authentication provider integration
    external_auth_id = Column(String(255), unique=True, index=True, nullable=False)
    external_username = Column(String(255), nullable=True)

    # Core account information
    email = Column(String(255), unique=True, index=True, nullable=False)
    account_type = Column(Enum(AccountTypeEnum), nullable=False, default=AccountTypeEnum.FARMER)
    status = Column(Enum(AccountStatusEnum), nullable=False, default=AccountStatusEnum.PENDING_VERIFICATION)

    # Verification and access control
    is_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    email_verified_at = Column(DateTime(timezone=True), nullable=True)
    phone_verified_at = Column(DateTime(timezone=True), nullable=True)

    # Soft delete support
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Login tracking
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    login_count = Column(Integer, default=0)

    # Relationships
    profile = relationship("UserProfile", back_populates="account", uselist=False, cascade="all, delete-orphan")
    farmer_profile = relationship("FarmerProfile", back_populates="account", uselist=False, cascade="all, delete-orphan")
    business_profile = relationship("BusinessProfile", back_populates="account", uselist=False, cascade="all, delete-orphan")
    verification_records = relationship("VerificationRecord", back_populates="account", cascade="all, delete-orphan")
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