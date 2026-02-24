"""Add farm_elevation to farmer_profiles

Revision ID: 009_farm_elevation
Revises: 008_structured_address
Create Date: 2026-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '009_farm_elevation'
down_revision: Union[str, Sequence[str], None] = '008_structured_address'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('farmer_profiles', sa.Column(
        'farm_elevation', sa.Numeric(8, 2), nullable=True,
        comment='Elevation in meters above sea level'
    ))


def downgrade() -> None:
    op.drop_column('farmer_profiles', 'farm_elevation')
