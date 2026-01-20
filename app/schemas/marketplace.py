"""
Marketplace schemas for product listings.

Provides Pydantic schemas for marketplace operations:
- Farmers: create, update, manage listings
- Wholesalers: browse, filter, view listings
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal

from app.models.marketplace import ListingStatusEnum, ProductCategoryEnum


# ==================== Product Listing Schemas ====================

class ProductListingBase(BaseModel):
    """Base schema for product listing fields"""
    title: str = Field(..., max_length=255, description="Product title")
    description: Optional[str] = Field(None, description="Detailed product description")
    category: ProductCategoryEnum = Field(..., description="Product category")
    available_quantity: Decimal = Field(..., ge=0, description="Available quantity for sale")
    unit: str = Field(..., max_length=50, description="Unit of measure (kg, dozen, etc.)")
    price_per_unit: Decimal = Field(..., ge=0, description="Price per unit in ZAR")
    currency: str = Field(default="ZAR", max_length=3)
    minimum_order_quantity: Optional[Decimal] = Field(None, ge=0, description="Minimum order quantity")
    quality_grade: Optional[str] = Field(None, max_length=50, description="Quality grade (A, B, C)")
    certifications: Optional[List[str]] = Field(None, description="List of certifications")
    photos: Optional[List[str]] = Field(None, description="Array of photo URLs")
    expires_at: Optional[datetime] = Field(None, description="Listing expiration date")
    custom_fields: Optional[Dict[str, Any]] = Field(None, description="Additional custom data")


class ProductListingCreate(ProductListingBase):
    """Schema for creating a new product listing"""
    inventory_item_id: Optional[int] = Field(None, description="Link to inventory item (optional)")
    province: Optional[str] = Field(None, max_length=100, description="Province (auto-filled from profile if not provided)")
    city: Optional[str] = Field(None, max_length=100)
    publish_immediately: bool = Field(default=False, description="Publish listing immediately after creation")


class ProductListingUpdate(BaseModel):
    """Schema for updating an existing product listing"""
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    category: Optional[ProductCategoryEnum] = None
    available_quantity: Optional[Decimal] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=50)
    price_per_unit: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    minimum_order_quantity: Optional[Decimal] = Field(None, ge=0)
    status: Optional[ListingStatusEnum] = None
    quality_grade: Optional[str] = Field(None, max_length=50)
    certifications: Optional[List[str]] = None
    photos: Optional[List[str]] = None
    expires_at: Optional[datetime] = None
    province: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    custom_fields: Optional[Dict[str, Any]] = None


class ProductListingResponse(ProductListingBase):
    """Response schema for product listing (farmer view)"""
    id: int
    farmer_account_id: int
    inventory_item_id: Optional[int]
    status: ListingStatusEnum
    is_featured: bool
    province: Optional[str]
    city: Optional[str]
    farm_name: Optional[str]
    published_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Browse/Marketplace Schemas ====================

class FarmerSummary(BaseModel):
    """Summary of farmer information for browse view"""
    id: int
    farm_name: Optional[str] = None
    farm_location: Optional[str] = None
    certifications: Optional[Dict[str, Any]] = None

    class Config:
        from_attributes = True


class ProductListingBrowseResponse(BaseModel):
    """Enriched response for marketplace browsing (includes farmer info)"""
    id: int
    title: str
    description: Optional[str]
    category: ProductCategoryEnum
    available_quantity: Decimal
    unit: str
    price_per_unit: Decimal
    currency: str
    minimum_order_quantity: Optional[Decimal]
    quality_grade: Optional[str]
    certifications: Optional[List[str]]
    photos: Optional[List[str]]
    province: Optional[str]
    city: Optional[str]
    farm_name: Optional[str]
    is_featured: bool
    published_at: Optional[datetime]

    # Nested farmer info for display
    farmer: Optional[FarmerSummary] = None

    class Config:
        from_attributes = True


# ==================== Filter/Query Schemas ====================

class MarketplaceFilters(BaseModel):
    """Filter parameters for marketplace browsing"""
    category: Optional[ProductCategoryEnum] = Field(None, description="Filter by category")
    province: Optional[str] = Field(None, description="Filter by province")
    min_price: Optional[Decimal] = Field(None, ge=0, description="Minimum price per unit")
    max_price: Optional[Decimal] = Field(None, ge=0, description="Maximum price per unit")
    search: Optional[str] = Field(None, description="Search in title and description")
    featured_only: bool = Field(default=False, description="Show only featured listings")


class PaginatedListingsResponse(BaseModel):
    """Paginated response for marketplace listings"""
    data: List[ProductListingBrowseResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    message: str = "Listings retrieved successfully"
