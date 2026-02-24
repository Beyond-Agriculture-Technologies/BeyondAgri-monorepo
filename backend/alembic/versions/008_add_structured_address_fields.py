"""Add structured address fields for Google Maps geocoding

Revision ID: 008_structured_address
Revises: 007_marketplace
Create Date: 2026-02-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '008_structured_address'
down_revision: Union[str, Sequence[str], None] = '007_marketplace'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Farmer profile - structured address fields
    op.add_column('farmer_profiles', sa.Column('farm_address', sa.String(500), nullable=True))
    op.add_column('farmer_profiles', sa.Column('farm_street', sa.String(255), nullable=True))
    op.add_column('farmer_profiles', sa.Column('farm_city', sa.String(100), nullable=True))
    op.add_column('farmer_profiles', sa.Column('farm_province', sa.String(100), nullable=True))
    op.add_column('farmer_profiles', sa.Column('farm_postal_code', sa.String(20), nullable=True))
    op.add_column('farmer_profiles', sa.Column('farm_country', sa.String(100), server_default='South Africa', nullable=True))
    op.add_column('farmer_profiles', sa.Column('farm_latitude', sa.Numeric(10, 7), nullable=True))
    op.add_column('farmer_profiles', sa.Column('farm_longitude', sa.Numeric(10, 7), nullable=True))
    op.add_column('farmer_profiles', sa.Column('farm_place_id', sa.String(255), nullable=True))

    # Business profile - structured address fields
    op.add_column('business_profiles', sa.Column('business_street', sa.String(255), nullable=True))
    op.add_column('business_profiles', sa.Column('business_city', sa.String(100), nullable=True))
    op.add_column('business_profiles', sa.Column('business_province', sa.String(100), nullable=True))
    op.add_column('business_profiles', sa.Column('business_postal_code', sa.String(20), nullable=True))
    op.add_column('business_profiles', sa.Column('business_country', sa.String(100), server_default='South Africa', nullable=True))
    op.add_column('business_profiles', sa.Column('business_latitude', sa.Numeric(10, 7), nullable=True))
    op.add_column('business_profiles', sa.Column('business_longitude', sa.Numeric(10, 7), nullable=True))
    op.add_column('business_profiles', sa.Column('business_place_id', sa.String(255), nullable=True))

    # Data migration: parse existing farm_coordinates "lat,long" into new columns
    op.execute("""
        UPDATE farmer_profiles
        SET farm_latitude = CAST(split_part(farm_coordinates, ',', 1) AS NUMERIC(10, 7)),
            farm_longitude = CAST(split_part(farm_coordinates, ',', 2) AS NUMERIC(10, 7))
        WHERE farm_coordinates IS NOT NULL
          AND farm_coordinates LIKE '%,%'
    """)

    # Sync existing farm_location into farm_address
    op.execute("""
        UPDATE farmer_profiles
        SET farm_address = farm_location
        WHERE farm_location IS NOT NULL
          AND farm_address IS NULL
    """)


def downgrade() -> None:
    # Business profile
    op.drop_column('business_profiles', 'business_place_id')
    op.drop_column('business_profiles', 'business_longitude')
    op.drop_column('business_profiles', 'business_latitude')
    op.drop_column('business_profiles', 'business_country')
    op.drop_column('business_profiles', 'business_postal_code')
    op.drop_column('business_profiles', 'business_province')
    op.drop_column('business_profiles', 'business_city')
    op.drop_column('business_profiles', 'business_street')

    # Farmer profile
    op.drop_column('farmer_profiles', 'farm_place_id')
    op.drop_column('farmer_profiles', 'farm_longitude')
    op.drop_column('farmer_profiles', 'farm_latitude')
    op.drop_column('farmer_profiles', 'farm_country')
    op.drop_column('farmer_profiles', 'farm_postal_code')
    op.drop_column('farmer_profiles', 'farm_province')
    op.drop_column('farmer_profiles', 'farm_city')
    op.drop_column('farmer_profiles', 'farm_street')
    op.drop_column('farmer_profiles', 'farm_address')
