"""Add phone number uniqueness constraint

Revision ID: 004_add_phone_uniqueness
Revises: 003_rename_auth_fields
Create Date: 2025-12-05 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '004_add_phone_uniqueness'
down_revision: Union[str, Sequence[str], None] = '003_rename_auth_fields'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add unique constraint and index on phone_number for phone-based authentication."""

    # Add unique constraint on phone_number
    op.create_unique_constraint(
        'uq_user_profiles_phone_number',
        'user_profiles',
        ['phone_number']
    )

    # Add index for fast lookups (if not created by the constraint)
    # Using CREATE INDEX IF NOT EXISTS for safety
    op.execute(
        'CREATE INDEX IF NOT EXISTS ix_user_profiles_phone_number '
        'ON user_profiles (phone_number) WHERE phone_number IS NOT NULL'
    )


def downgrade() -> None:
    """Remove phone number uniqueness constraint."""

    # Drop the index
    op.execute('DROP INDEX IF EXISTS ix_user_profiles_phone_number')

    # Drop the unique constraint
    op.drop_constraint('uq_user_profiles_phone_number', 'user_profiles', type_='unique')
