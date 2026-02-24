"""
Marketplace models for product listings.

Farmers create explicit listings from their inventory to sell on the marketplace.
Wholesalers can browse and filter these listings.
"""
from datetime import datetime, timezone
from decimal import Decimal
import enum

from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Enum,
    ForeignKey, JSON, Numeric, Text, Index
)
from sqlalchemy.orm import relationship

from app.db.base import BaseModel


class ListingStatusEnum(str, enum.Enum):
    """Status of marketplace listings"""
    DRAFT = "DRAFT"           # Created but not published
    ACTIVE = "ACTIVE"         # Visible in marketplace
    PAUSED = "PAUSED"         # Temporarily hidden
    SOLD_OUT = "SOLD_OUT"     # No available quantity
    EXPIRED = "EXPIRED"       # Past expiration date
    ARCHIVED = "ARCHIVED"     # Permanently removed from marketplace


class ProductCategoryEnum(str, enum.Enum):
    """Product categories for marketplace listings"""
    HARVEST = "HARVEST"       # Fresh produce, vegetables, fruits
    MEAT = "MEAT"             # Beef, lamb, pork
    POULTRY = "POULTRY"       # Chicken, eggs, duck
    DAIRY = "DAIRY"           # Milk, cheese, butter
    GRAINS = "GRAINS"         # Wheat, maize, rice
    OTHER = "OTHER"


class ProductListing(BaseModel):
    """
    Marketplace product listings created by farmers.

    Separate from inventory - farmers explicitly list products for sale
    with their own pricing and availability.
    """
    __tablename__ = "product_listings"

    # Ownership - only farmers can create listings
    farmer_account_id = Column(
        Integer,
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Optional link to inventory item (for future stock sync)
    inventory_item_id = Column(
        Integer,
        ForeignKey("inventory_items.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Product Information
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(Enum(ProductCategoryEnum), nullable=False, index=True)

    # Quantity & Pricing
    available_quantity = Column(Numeric(10, 2), nullable=False)
    unit = Column(String(50), nullable=False)  # kg, dozen, bunch, liters
    price_per_unit = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="ZAR", nullable=False)
    minimum_order_quantity = Column(Numeric(10, 2), nullable=True)  # Min order size

    # Location (denormalized from FarmerProfile for efficient filtering)
    province = Column(String(100), nullable=True, index=True)
    city = Column(String(100), nullable=True)
    farm_name = Column(String(255), nullable=True)

    # Status & Visibility
    status = Column(
        Enum(ListingStatusEnum),
        default=ListingStatusEnum.DRAFT,
        nullable=False,
        index=True
    )
    is_featured = Column(Boolean, default=False, nullable=False)  # For future promotions

    # Dates
    published_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)

    # Quality & Certifications
    quality_grade = Column(String(50), nullable=True)  # A, B, C or custom grades
    certifications = Column(JSON, nullable=True)  # ["Organic", "Fair Trade"]

    # Media
    photos = Column(JSON, nullable=True)  # Array of S3 URLs

    # Additional metadata
    custom_fields = Column(JSON, nullable=True)

    # Relationships
    farmer_account = relationship("Account", backref="product_listings")
    inventory_item = relationship("InventoryItem", backref="marketplace_listing")

    # Composite indexes for efficient filtering
    __table_args__ = (
        Index('ix_product_listings_category_status', 'category', 'status'),
        Index('ix_product_listings_province_status', 'province', 'status'),
        Index('ix_product_listings_price_status', 'price_per_unit', 'status'),
    )

    @property
    def is_available(self) -> bool:
        """Check if listing is available for viewing"""
        if self.status != ListingStatusEnum.ACTIVE:
            return False
        if self.expires_at and self.expires_at < datetime.now(timezone.utc):
            return False
        return True

    @property
    def is_in_stock(self) -> bool:
        """Check if listing has available quantity"""
        return self.available_quantity > 0

    def __repr__(self):
        return f"<ProductListing(id={self.id}, title='{self.title}', status='{self.status}')>"
