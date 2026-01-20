"""Add marketplace product listings table

Revision ID: 007_add_marketplace_product_listings
Revises: eb237c60beaf
Create Date: 2026-01-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '007_marketplace'
down_revision: Union[str, Sequence[str], None] = 'eb237c60beaf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create product_listings table for marketplace feature."""

    # Create product_listings table
    op.create_table('product_listings',
        # Ownership
        sa.Column('farmer_account_id', sa.Integer(), nullable=False),
        sa.Column('inventory_item_id', sa.Integer(), nullable=True),

        # Product information
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.Enum(
            'HARVEST', 'MEAT', 'POULTRY', 'DAIRY', 'GRAINS', 'OTHER',
            name='productcategoryenum'
        ), nullable=False),

        # Quantity & Pricing
        sa.Column('available_quantity', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('unit', sa.String(length=50), nullable=False),
        sa.Column('price_per_unit', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=3), nullable=False, server_default='ZAR'),
        sa.Column('minimum_order_quantity', sa.Numeric(precision=10, scale=2), nullable=True),

        # Location (denormalized for filtering)
        sa.Column('province', sa.String(length=100), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('farm_name', sa.String(length=255), nullable=True),

        # Status & Visibility
        sa.Column('status', sa.Enum(
            'DRAFT', 'ACTIVE', 'PAUSED', 'SOLD_OUT', 'EXPIRED', 'ARCHIVED',
            name='listingstatusenum'
        ), nullable=False, server_default='DRAFT'),
        sa.Column('is_featured', sa.Boolean(), nullable=False, server_default='false'),

        # Dates
        sa.Column('published_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),

        # Quality & Certifications
        sa.Column('quality_grade', sa.String(length=50), nullable=True),
        sa.Column('certifications', sa.JSON(), nullable=True),

        # Media
        sa.Column('photos', sa.JSON(), nullable=True),

        # Additional metadata
        sa.Column('custom_fields', sa.JSON(), nullable=True),

        # Base model fields
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),

        # Constraints
        sa.ForeignKeyConstraint(['farmer_account_id'], ['accounts.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['inventory_item_id'], ['inventory_items.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes for efficient queries
    op.create_index(op.f('ix_product_listings_id'), 'product_listings', ['id'], unique=False)
    op.create_index(op.f('ix_product_listings_farmer_account_id'), 'product_listings', ['farmer_account_id'], unique=False)
    op.create_index(op.f('ix_product_listings_inventory_item_id'), 'product_listings', ['inventory_item_id'], unique=False)
    op.create_index(op.f('ix_product_listings_title'), 'product_listings', ['title'], unique=False)
    op.create_index(op.f('ix_product_listings_category'), 'product_listings', ['category'], unique=False)
    op.create_index(op.f('ix_product_listings_status'), 'product_listings', ['status'], unique=False)
    op.create_index(op.f('ix_product_listings_province'), 'product_listings', ['province'], unique=False)
    op.create_index(op.f('ix_product_listings_expires_at'), 'product_listings', ['expires_at'], unique=False)

    # Composite indexes for common filter combinations
    op.create_index('ix_product_listings_category_status', 'product_listings', ['category', 'status'], unique=False)
    op.create_index('ix_product_listings_province_status', 'product_listings', ['province', 'status'], unique=False)
    op.create_index('ix_product_listings_price_status', 'product_listings', ['price_per_unit', 'status'], unique=False)


def downgrade() -> None:
    """Drop product_listings table."""

    # Drop composite indexes
    op.drop_index('ix_product_listings_price_status', table_name='product_listings')
    op.drop_index('ix_product_listings_province_status', table_name='product_listings')
    op.drop_index('ix_product_listings_category_status', table_name='product_listings')

    # Drop single column indexes
    op.drop_index(op.f('ix_product_listings_expires_at'), table_name='product_listings')
    op.drop_index(op.f('ix_product_listings_province'), table_name='product_listings')
    op.drop_index(op.f('ix_product_listings_status'), table_name='product_listings')
    op.drop_index(op.f('ix_product_listings_category'), table_name='product_listings')
    op.drop_index(op.f('ix_product_listings_title'), table_name='product_listings')
    op.drop_index(op.f('ix_product_listings_inventory_item_id'), table_name='product_listings')
    op.drop_index(op.f('ix_product_listings_farmer_account_id'), table_name='product_listings')
    op.drop_index(op.f('ix_product_listings_id'), table_name='product_listings')

    # Drop table
    op.drop_table('product_listings')

    # Drop enums
    sa.Enum(name='listingstatusenum').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='productcategoryenum').drop(op.get_bind(), checkfirst=True)
