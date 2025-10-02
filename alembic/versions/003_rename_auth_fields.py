"""Rename Cognito-specific fields to provider-agnostic names

Revision ID: 003_rename_auth_fields
Revises: 002_db_improvements
Create Date: 2025-10-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_rename_auth_fields'
down_revision: Union[str, Sequence[str], None] = '002_db_improvements'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename Cognito-specific column names to provider-agnostic names."""

    # Drop the old index first
    op.drop_index('ix_accounts_cognito_sub', table_name='accounts')

    # Rename columns
    op.alter_column('accounts', 'cognito_sub',
                    new_column_name='external_auth_id',
                    existing_type=sa.String(length=255),
                    existing_nullable=False)

    op.alter_column('accounts', 'cognito_username',
                    new_column_name='external_username',
                    existing_type=sa.String(length=255),
                    existing_nullable=True)

    # Create new index with updated name
    op.create_index('ix_accounts_external_auth_id', 'accounts', ['external_auth_id'], unique=True)


def downgrade() -> None:
    """Revert to Cognito-specific column names."""

    # Drop the new index
    op.drop_index('ix_accounts_external_auth_id', table_name='accounts')

    # Rename columns back
    op.alter_column('accounts', 'external_auth_id',
                    new_column_name='cognito_sub',
                    existing_type=sa.String(length=255),
                    existing_nullable=False)

    op.alter_column('accounts', 'external_username',
                    new_column_name='cognito_username',
                    existing_type=sa.String(length=255),
                    existing_nullable=True)

    # Recreate old index
    op.create_index('ix_accounts_cognito_sub', 'accounts', ['cognito_sub'], unique=True)
