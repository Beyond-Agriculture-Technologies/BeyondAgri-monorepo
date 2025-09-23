"""Create account-based structure

Revision ID: 001_create_accounts
Revises:
Create Date: 2025-09-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001_create_accounts'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the account-based structure."""

    # 1. Create accounts table
    op.create_table('accounts',
        sa.Column('cognito_sub', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('account_type', sa.Enum('FARMER', 'WHOLESALER', 'ADMIN', name='accounttypeenum'), nullable=False),
        sa.Column('status', sa.Enum('ACTIVE', 'SUSPENDED', 'DISABLED', 'PENDING_VERIFICATION', name='accountstatusenum'), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('login_count', sa.Integer(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_accounts_cognito_sub'), 'accounts', ['cognito_sub'], unique=True)
    op.create_index(op.f('ix_accounts_email'), 'accounts', ['email'], unique=True)
    op.create_index(op.f('ix_accounts_id'), 'accounts', ['id'], unique=False)

    # 2. Create user_profiles table
    op.create_table('user_profiles',
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=True),
        sa.Column('phone_number', sa.String(length=20), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('profile_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('account_id')
    )
    op.create_index(op.f('ix_user_profiles_id'), 'user_profiles', ['id'], unique=False)

    # 3. Create farmer_profiles table
    op.create_table('farmer_profiles',
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('farm_name', sa.String(length=255), nullable=True),
        sa.Column('farm_location', sa.String(length=255), nullable=True),
        sa.Column('farm_size', sa.String(length=100), nullable=True),
        sa.Column('certifications', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('crop_types', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('farming_methods', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('equipment', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('account_id')
    )
    op.create_index(op.f('ix_farmer_profiles_id'), 'farmer_profiles', ['id'], unique=False)

    # 4. Create business_profiles table
    op.create_table('business_profiles',
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('business_name', sa.String(length=255), nullable=False),
        sa.Column('business_license', sa.String(length=255), nullable=True),
        sa.Column('business_address', sa.Text(), nullable=True),
        sa.Column('business_type', sa.String(length=100), nullable=True),
        sa.Column('verification_documents', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('business_categories', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('service_areas', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('capacity', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('account_id')
    )
    op.create_index(op.f('ix_business_profiles_id'), 'business_profiles', ['id'], unique=False)

    # 5. Create verification_records table
    op.create_table('verification_records',
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('verification_type', sa.Enum('IDENTITY', 'BUSINESS', 'FARM', 'ADDRESS', 'PHONE', 'EMAIL', name='verificationtypeenum'), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', name='verificationstatusenum'), nullable=False),
        sa.Column('documents', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('verification_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('reviewer_notes', sa.Text(), nullable=True),
        sa.Column('reviewed_by', sa.String(length=255), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_verification_records_id'), 'verification_records', ['id'], unique=False)

    # 6. Create account_activity_logs table
    op.create_table('account_activity_logs',
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('activity_type', sa.Enum('LOGIN', 'LOGOUT', 'PROFILE_UPDATE', 'VERIFICATION_SUBMITTED', 'PASSWORD_RESET', 'ACCOUNT_CREATED', 'ACCOUNT_DISABLED', 'ROLE_CHANGED', name='activitytypeenum'), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('activity_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_account_activity_logs_id'), 'account_activity_logs', ['id'], unique=False)

    # 7. Create roles table
    op.create_table('roles',
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('permissions', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('is_system_role', sa.String(length=1), nullable=True),
        sa.Column('is_active', sa.String(length=1), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_roles_id'), 'roles', ['id'], unique=False)

    # 8. Create account_roles table
    op.create_table('account_roles',
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('role_id', sa.Integer(), nullable=False),
        sa.Column('assigned_by', sa.String(length=255), nullable=True),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['account_id'], ['accounts.id'], ),
        sa.ForeignKeyConstraint(['role_id'], ['roles.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('account_id', 'role_id', name='uq_account_role')
    )
    op.create_index(op.f('ix_account_roles_id'), 'account_roles', ['id'], unique=False)

    # 9. Insert default roles
    op.execute("""
        INSERT INTO roles (name, description, permissions, is_system_role, is_active) VALUES
        ('farmer', 'Basic farmer role', '{"read_products": true, "create_listings": true, "manage_profile": true}', 'Y', 'Y'),
        ('wholesaler', 'Wholesaler role', '{"read_products": true, "create_orders": true, "manage_profile": true, "view_analytics": true}', 'Y', 'Y'),
        ('admin', 'Administrator role', '{"read_all": true, "write_all": true, "manage_users": true, "manage_roles": true}', 'Y', 'Y');
    """)


def downgrade() -> None:
    """Drop the account-based structure."""
    # Drop tables in reverse order
    op.drop_index(op.f('ix_account_roles_id'), table_name='account_roles')
    op.drop_table('account_roles')
    op.drop_index(op.f('ix_roles_id'), table_name='roles')
    op.drop_table('roles')
    op.drop_index(op.f('ix_account_activity_logs_id'), table_name='account_activity_logs')
    op.drop_table('account_activity_logs')
    op.drop_index(op.f('ix_verification_records_id'), table_name='verification_records')
    op.drop_table('verification_records')
    op.drop_index(op.f('ix_business_profiles_id'), table_name='business_profiles')
    op.drop_table('business_profiles')
    op.drop_index(op.f('ix_farmer_profiles_id'), table_name='farmer_profiles')
    op.drop_table('farmer_profiles')
    op.drop_index(op.f('ix_user_profiles_id'), table_name='user_profiles')
    op.drop_table('user_profiles')
    op.drop_index(op.f('ix_accounts_id'), table_name='accounts')
    op.drop_index(op.f('ix_accounts_email'), table_name='accounts')
    op.drop_index(op.f('ix_accounts_cognito_sub'), table_name='accounts')
    op.drop_table('accounts')