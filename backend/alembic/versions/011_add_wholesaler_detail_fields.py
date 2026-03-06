"""Add wholesaler detail fields to business_profiles

Revision ID: 011_wholesaler_details
Revises: 010_add_orders
Create Date: 2026-03-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = '011_wholesaler_details'
down_revision: Union[str, Sequence[str], None] = '010_add_orders'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('business_profiles', sa.Column('registration_number', sa.String(100), nullable=True))
    op.add_column('business_profiles', sa.Column('number_of_employees', sa.String(50), nullable=True))
    op.add_column('business_profiles', sa.Column('years_in_operation', sa.Integer(), nullable=True))
    op.add_column('business_profiles', sa.Column('preferred_produce', JSONB(), nullable=True))


def downgrade() -> None:
    op.drop_column('business_profiles', 'preferred_produce')
    op.drop_column('business_profiles', 'years_in_operation')
    op.drop_column('business_profiles', 'number_of_employees')
    op.drop_column('business_profiles', 'registration_number')
