"""Database schema improvements - remove activity logs, add enhancements

Revision ID: 002_db_improvements
Revises: 001_create_accounts
Create Date: 2025-10-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002_db_improvements'
down_revision: Union[str, Sequence[str], None] = '001_create_accounts'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Apply database improvements."""

    # 1. Drop account_activity_logs table (no longer needed) - if it exists
    op.execute("DROP INDEX IF EXISTS ix_account_activity_logs_id")
    op.execute("DROP TABLE IF EXISTS account_activity_logs CASCADE")
    op.execute("DROP TYPE IF EXISTS activitytypeenum")

    # 2. Alter roles table - change String(1) to Boolean
    op.alter_column('roles', 'is_system_role',
                    existing_type=sa.String(length=1),
                    type_=sa.Boolean(),
                    existing_nullable=True,
                    nullable=False,
                    postgresql_using="is_system_role = 'Y'",
                    server_default='false')

    op.alter_column('roles', 'is_active',
                    existing_type=sa.String(length=1),
                    type_=sa.Boolean(),
                    existing_nullable=True,
                    nullable=False,
                    postgresql_using="is_active = 'Y'",
                    server_default='true')

    # 3. Enhance accounts table
    op.add_column('accounts', sa.Column('cognito_username', sa.String(length=255), nullable=True))
    op.add_column('accounts', sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('accounts', sa.Column('phone_verified_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('accounts', sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('accounts', sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True))

    # Update existing Boolean columns to have explicit NOT NULL
    op.alter_column('accounts', 'is_verified',
                    existing_type=sa.Boolean(),
                    nullable=False,
                    server_default='false')

    op.alter_column('accounts', 'is_active',
                    existing_type=sa.Boolean(),
                    nullable=False,
                    server_default='true')


    # 5. Create land unit enum for farmer profiles
    land_unit_enum = postgresql.ENUM('HECTARES', 'ACRES', 'SQUARE_METERS', name='landunitenum', create_type=False)
    land_unit_enum.create(op.get_bind(), checkfirst=True)

    # 6. Enhance farmer_profiles table
    op.add_column('farmer_profiles', sa.Column('total_land_area', sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column('farmer_profiles', sa.Column('land_unit',
                                                postgresql.ENUM('HECTARES', 'ACRES', 'SQUARE_METERS', name='landunitenum'),
                                                nullable=True,
                                                server_default='HECTARES'))
    op.add_column('farmer_profiles', sa.Column('farm_coordinates', sa.String(length=255), nullable=True))
    op.add_column('farmer_profiles', sa.Column('farm_registration_number', sa.String(length=100), nullable=True))


    # 7. Add performance indexes
    # Account indexes
    op.create_index('idx_accounts_type_status', 'accounts', ['account_type', 'status'])
    op.create_index('idx_accounts_active_verified', 'accounts', ['is_active', 'is_verified'])
    op.create_index('idx_accounts_deleted', 'accounts', ['is_deleted'])

    # Verification indexes
    op.create_index('idx_verification_account_type', 'verification_records', ['account_id', 'verification_type'])
    op.create_index('idx_verification_status', 'verification_records', ['status'])

    # Role indexes
    op.create_index('idx_account_roles_account', 'account_roles', ['account_id'])
    op.create_index('idx_account_roles_role', 'account_roles', ['role_id'])

    # 8. Add GIN indexes for JSONB fields (for better search performance)
    op.create_index('idx_farmer_certifications_gin', 'farmer_profiles', ['certifications'],
                    postgresql_using='gin')
    op.create_index('idx_farmer_crop_types_gin', 'farmer_profiles', ['crop_types'],
                    postgresql_using='gin')
    op.create_index('idx_business_categories_gin', 'business_profiles', ['business_categories'],
                    postgresql_using='gin')
    op.create_index('idx_role_permissions_gin', 'roles', ['permissions'],
                    postgresql_using='gin')

    # 9. Update existing default roles to use boolean values
    op.execute("""
        UPDATE roles
        SET is_system_role = true, is_active = true
        WHERE name IN ('farmer', 'wholesaler', 'admin');
    """)


def downgrade() -> None:
    """Revert database improvements."""

    # Drop indexes
    op.drop_index('idx_role_permissions_gin', table_name='roles')
    op.drop_index('idx_business_categories_gin', table_name='business_profiles')
    op.drop_index('idx_farmer_crop_types_gin', table_name='farmer_profiles')
    op.drop_index('idx_farmer_certifications_gin', table_name='farmer_profiles')
    op.drop_index('idx_account_roles_role', table_name='account_roles')
    op.drop_index('idx_account_roles_account', table_name='account_roles')
    op.drop_index('idx_verification_status', table_name='verification_records')
    op.drop_index('idx_verification_account_type', table_name='verification_records')
    op.drop_index('idx_accounts_deleted', table_name='accounts')
    op.drop_index('idx_accounts_active_verified', table_name='accounts')
    op.drop_index('idx_accounts_type_status', table_name='accounts')


    # Remove farmer_profiles enhancements
    op.drop_column('farmer_profiles', 'farm_registration_number')
    op.drop_column('farmer_profiles', 'farm_coordinates')
    op.drop_column('farmer_profiles', 'land_unit')
    op.drop_column('farmer_profiles', 'total_land_area')

    # Drop land unit enum
    op.execute("DROP TYPE IF EXISTS landunitenum")

    # Remove accounts enhancements
    op.alter_column('accounts', 'is_active',
                    existing_type=sa.Boolean(),
                    nullable=True)
    op.alter_column('accounts', 'is_verified',
                    existing_type=sa.Boolean(),
                    nullable=True)

    op.drop_column('accounts', 'deleted_at')
    op.drop_column('accounts', 'is_deleted')
    op.drop_column('accounts', 'phone_verified_at')
    op.drop_column('accounts', 'email_verified_at')
    op.drop_column('accounts', 'cognito_username')

    # Revert roles table to String(1)
    op.alter_column('roles', 'is_active',
                    existing_type=sa.Boolean(),
                    type_=sa.String(length=1),
                    postgresql_using="CASE WHEN is_active THEN 'Y' ELSE 'N' END")

    op.alter_column('roles', 'is_system_role',
                    existing_type=sa.Boolean(),
                    type_=sa.String(length=1),
                    postgresql_using="CASE WHEN is_system_role THEN 'Y' ELSE 'N' END")

    # Recreate account_activity_logs table
    op.execute("""
        CREATE TYPE activitytypeenum AS ENUM (
            'LOGIN', 'LOGOUT', 'PROFILE_UPDATE', 'VERIFICATION_SUBMITTED',
            'PASSWORD_RESET', 'ACCOUNT_CREATED', 'ACCOUNT_DISABLED', 'ROLE_CHANGED'
        )
    """)

    op.create_table('account_activity_logs',
        sa.Column('account_id', sa.Integer(), nullable=False),
        sa.Column('activity_type', postgresql.ENUM('LOGIN', 'LOGOUT', 'PROFILE_UPDATE', 'VERIFICATION_SUBMITTED', 'PASSWORD_RESET', 'ACCOUNT_CREATED', 'ACCOUNT_DISABLED', 'ROLE_CHANGED', name='activitytypeenum'), nullable=False),
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
