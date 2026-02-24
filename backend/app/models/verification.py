from sqlalchemy import Column, String, Text, Integer, Boolean, ForeignKey, DateTime, Enum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from app.db.base import BaseModel


class VerificationTypeEnum(str, enum.Enum):
    """Verification types - values must match database enum (UPPERCASE)"""
    IDENTITY = "IDENTITY"
    BUSINESS = "BUSINESS"
    FARM = "FARM"
    ADDRESS = "ADDRESS"
    PHONE = "PHONE"
    EMAIL = "EMAIL"


class VerificationStatusEnum(str, enum.Enum):
    """Verification status - values must match database enum (UPPERCASE)"""
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    EXPIRED = "EXPIRED"


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


