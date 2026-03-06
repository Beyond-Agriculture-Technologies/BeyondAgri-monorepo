"""
Order model for the marketplace ordering system.

Wholesalers place orders from product listings.
Farmers confirm/decline orders.
"""
from decimal import Decimal
import enum

from sqlalchemy import (
    Column, String, Integer, DateTime, Enum,
    ForeignKey, Numeric, Text, Index
)
from sqlalchemy.orm import relationship

from app.db.base import BaseModel


class OrderStatusEnum(str, enum.Enum):
    """Order status progression"""
    PENDING = "PENDING"         # Wholesaler placed order, awaiting farmer
    CONFIRMED = "CONFIRMED"     # Farmer confirmed
    DECLINED = "DECLINED"       # Farmer declined
    COMPLETED = "COMPLETED"     # Wholesaler marked as received
    CANCELLED = "CANCELLED"     # Wholesaler cancelled before confirmation


class Order(BaseModel):
    """
    Marketplace order linking a wholesaler (buyer) to a farmer's listing.

    Flow: PENDING -> CONFIRMED/DECLINED -> COMPLETED/CANCELLED
    Prices are snapshotted at order time. One order = one listing.
    """
    __tablename__ = "orders"

    # Parties
    buyer_account_id = Column(
        Integer,
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    seller_account_id = Column(
        Integer,
        ForeignKey("accounts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    listing_id = Column(
        Integer,
        ForeignKey("product_listings.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Snapshotted listing info
    listing_title = Column(String(255), nullable=False)

    # Quantity & Pricing (snapshotted at order time)
    quantity = Column(Numeric(10, 2), nullable=False)
    unit = Column(String(50), nullable=False)
    price_per_unit = Column(Numeric(10, 2), nullable=False)
    total_price = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="ZAR", nullable=False)

    # Status
    status = Column(
        Enum(OrderStatusEnum),
        default=OrderStatusEnum.PENDING,
        nullable=False,
        index=True
    )

    # Status timestamps
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    declined_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)

    # Notes
    buyer_notes = Column(Text, nullable=True)
    seller_notes = Column(Text, nullable=True)
    decline_reason = Column(Text, nullable=True)

    # Relationships
    buyer_account = relationship(
        "Account",
        foreign_keys=[buyer_account_id],
        backref="buyer_orders"
    )
    seller_account = relationship(
        "Account",
        foreign_keys=[seller_account_id],
        backref="seller_orders"
    )
    listing = relationship("ProductListing", backref="orders")

    # Indexes for common queries
    __table_args__ = (
        Index('ix_orders_buyer_status', 'buyer_account_id', 'status'),
        Index('ix_orders_seller_status', 'seller_account_id', 'status'),
    )

    def __repr__(self):
        return f"<Order(id={self.id}, buyer={self.buyer_account_id}, seller={self.seller_account_id}, status='{self.status}')>"
