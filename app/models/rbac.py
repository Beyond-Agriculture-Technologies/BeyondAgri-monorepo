from sqlalchemy import Column, String, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import BaseModel


class Role(BaseModel):
    """
    Role definitions for role-based access control.
    """
    __tablename__ = "roles"

    # Role information
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

    # Permissions (stored as JSON for flexibility)
    permissions = Column(JSONB, nullable=False, default=dict)

    # Metadata
    is_system_role = Column(String(1), default="N")  # System roles can't be deleted
    is_active = Column(String(1), default="Y")

    # Relationships
    account_roles = relationship("AccountRole", back_populates="role", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Role(name='{self.name}')>"


class AccountRole(BaseModel):
    """
    Junction table for account-role relationships.
    """
    __tablename__ = "account_roles"
    __table_args__ = (
        UniqueConstraint('account_id', 'role_id', name='uq_account_role'),
    )

    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)

    # Assignment metadata
    assigned_by = Column(String(255), nullable=True)  # Who assigned this role
    assigned_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # Optional role expiration

    # Relationships
    account = relationship("Account", back_populates="account_roles")
    role = relationship("Role", back_populates="account_roles")

    def __repr__(self):
        return f"<AccountRole(account_id={self.account_id}, role_id={self.role_id})>"