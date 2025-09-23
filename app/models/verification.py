from sqlalchemy import Column, String, Text, Integer, ForeignKey, DateTime, Enum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.base import BaseModel


class VerificationTypeEnum(str, enum.Enum):
    IDENTITY = "identity"
    BUSINESS = "business"
    FARM = "farm"
    ADDRESS = "address"
    PHONE = "phone"
    EMAIL = "email"


class VerificationStatusEnum(str, enum.Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class VerificationRecord(BaseModel):
    """
    KYC and verification records for accounts.
    """
    __tablename__ = "verification_records"

    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)

    # Verification details
    verification_type = Column(Enum(VerificationTypeEnum), nullable=False)
    status = Column(Enum(VerificationStatusEnum), nullable=False, default=VerificationStatusEnum.PENDING)

    # Document and metadata
    documents = Column(JSONB, nullable=True)  # URLs, document types, etc.
    verification_metadata = Column(JSONB, nullable=True)  # Additional verification data

    # Review information
    reviewer_notes = Column(Text, nullable=True)
    reviewed_by = Column(String(255), nullable=True)  # Admin/reviewer identifier
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    account = relationship("Account", back_populates="verification_records")

    def __repr__(self):
        return f"<VerificationRecord(account_id={self.account_id}, type='{self.verification_type}', status='{self.status}')>"


class ActivityTypeEnum(str, enum.Enum):
    LOGIN = "login"
    LOGOUT = "logout"
    PROFILE_UPDATE = "profile_update"
    VERIFICATION_SUBMITTED = "verification_submitted"
    PASSWORD_RESET = "password_reset"
    ACCOUNT_CREATED = "account_created"
    ACCOUNT_DISABLED = "account_disabled"
    ROLE_CHANGED = "role_changed"


class AccountActivityLog(BaseModel):
    """
    Audit trail for account activities.
    """
    __tablename__ = "account_activity_logs"

    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)

    # Activity details
    activity_type = Column(Enum(ActivityTypeEnum), nullable=False)
    description = Column(Text, nullable=True)

    # Request metadata
    activity_metadata = Column(JSONB, nullable=True)  # Additional context data
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(Text, nullable=True)

    # Timestamp is inherited from BaseModel (created_at)

    # Relationships
    account = relationship("Account", back_populates="activity_logs")

    def __repr__(self):
        return f"<AccountActivityLog(account_id={self.account_id}, activity='{self.activity_type}')>"