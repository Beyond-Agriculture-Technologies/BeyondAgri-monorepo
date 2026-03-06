"""
Order schemas for the marketplace ordering system.
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

from app.models.order import OrderStatusEnum


# ==================== Request Schemas ====================

class OrderCreate(BaseModel):
    """Schema for placing an order (wholesaler)"""
    listing_id: int = Field(..., description="Product listing to order from")
    quantity: Decimal = Field(..., gt=0, description="Quantity to order")
    buyer_notes: Optional[str] = Field(None, max_length=1000, description="Notes for the farmer")


class OrderDecline(BaseModel):
    """Schema for declining an order (farmer)"""
    decline_reason: Optional[str] = Field(None, max_length=1000, description="Reason for declining")


class OrderConfirm(BaseModel):
    """Schema for confirming an order (farmer)"""
    seller_notes: Optional[str] = Field(None, max_length=1000, description="Notes for the buyer")


# ==================== Response Schemas ====================

class OrderResponse(BaseModel):
    """Full order response with nested info"""
    id: int
    buyer_account_id: int
    seller_account_id: int
    listing_id: Optional[int]
    listing_title: str
    quantity: Decimal
    unit: str
    price_per_unit: Decimal
    total_price: Decimal
    currency: str
    status: OrderStatusEnum
    buyer_notes: Optional[str]
    seller_notes: Optional[str]
    decline_reason: Optional[str]
    confirmed_at: Optional[datetime]
    declined_at: Optional[datetime]
    completed_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    # Enriched fields (set by service)
    buyer_name: Optional[str] = None
    seller_name: Optional[str] = None
    seller_farm_name: Optional[str] = None

    class Config:
        from_attributes = True


class OrderListResponse(BaseModel):
    """Paginated order list"""
    data: List[OrderResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class OrderStatsResponse(BaseModel):
    """Order statistics"""
    total_orders: int = 0
    pending_orders: int = 0
    confirmed_orders: int = 0
    completed_orders: int = 0
    declined_orders: int = 0
    cancelled_orders: int = 0
    total_amount: Decimal = Decimal("0.00")
    currency: str = "ZAR"


class SupplierSummary(BaseModel):
    """Summary of a supplier (farmer) for wholesaler's supplier list"""
    account_id: int
    name: Optional[str] = None
    farm_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None
    total_orders: int = 0
    total_spent: Decimal = Decimal("0.00")
    last_order_date: Optional[datetime] = None


class SupplierListResponse(BaseModel):
    """List of suppliers"""
    data: List[SupplierSummary]
    total: int
