"""
Order service for the marketplace ordering system.

Handles business logic for:
- Wholesalers: placing, cancelling, completing orders
- Farmers: confirming, declining orders
"""
import logging
from typing import List, Optional, Tuple
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, func

from app.models.order import Order, OrderStatusEnum
from app.models.marketplace import ProductListing, ListingStatusEnum
from app.models.account import Account
from app.models.profile import UserProfile, FarmerProfile
from app.schemas.order import (
    OrderCreate, OrderResponse, OrderStatsResponse, SupplierSummary
)

logger = logging.getLogger(__name__)


class OrderService:
    """Service class for order operations."""

    # ==================== Order Creation ====================

    @staticmethod
    def create_order(
        db: Session,
        order_data: OrderCreate,
        buyer_account_id: int
    ) -> Order:
        """
        Place a new order from a listing.
        Validates listing is active and quantity is within bounds.
        Snapshots price at order time. Does NOT deduct listing quantity.
        """
        listing = db.query(ProductListing).filter(
            and_(
                ProductListing.id == order_data.listing_id,
                ProductListing.status == ListingStatusEnum.ACTIVE
            )
        ).first()

        if not listing:
            raise ValueError("Listing not found or not available")

        if listing.farmer_account_id == buyer_account_id:
            raise ValueError("Cannot place an order on your own listing")

        # Validate quantity bounds
        if listing.minimum_order_quantity and order_data.quantity < listing.minimum_order_quantity:
            raise ValueError(
                f"Minimum order quantity is {listing.minimum_order_quantity} {listing.unit}"
            )

        if order_data.quantity > listing.available_quantity:
            raise ValueError(
                f"Requested quantity exceeds available stock ({listing.available_quantity} {listing.unit})"
            )

        # Snapshot pricing
        total_price = Decimal(str(order_data.quantity)) * Decimal(str(listing.price_per_unit))

        order = Order(
            buyer_account_id=buyer_account_id,
            seller_account_id=listing.farmer_account_id,
            listing_id=listing.id,
            listing_title=listing.title,
            quantity=order_data.quantity,
            unit=listing.unit,
            price_per_unit=listing.price_per_unit,
            total_price=total_price,
            currency=listing.currency,
            status=OrderStatusEnum.PENDING,
            buyer_notes=order_data.buyer_notes,
        )

        db.add(order)
        db.commit()
        db.refresh(order)

        logger.info(f"Order {order.id} created: buyer={buyer_account_id}, listing={listing.id}, total={total_price}")
        return order

    # ==================== Status Transitions ====================

    @staticmethod
    def confirm_order(
        db: Session,
        order_id: int,
        seller_account_id: int,
        seller_notes: Optional[str] = None
    ) -> Order:
        """
        Farmer confirms an order. Deducts listing quantity with SELECT FOR UPDATE.
        """
        order = db.query(Order).filter(
            and_(
                Order.id == order_id,
                Order.seller_account_id == seller_account_id,
                Order.status == OrderStatusEnum.PENDING
            )
        ).first()

        if not order:
            raise ValueError("Order not found or not in PENDING status")

        # Lock listing row to prevent overselling
        listing = db.query(ProductListing).filter(
            ProductListing.id == order.listing_id
        ).with_for_update().first()

        if listing and listing.available_quantity < order.quantity:
            raise ValueError(
                f"Insufficient stock. Available: {listing.available_quantity} {listing.unit}"
            )

        # Deduct quantity from listing
        if listing:
            listing.available_quantity = listing.available_quantity - order.quantity
            if listing.available_quantity <= 0:
                listing.status = ListingStatusEnum.SOLD_OUT

        order.status = OrderStatusEnum.CONFIRMED
        order.confirmed_at = datetime.now(timezone.utc)
        order.seller_notes = seller_notes

        db.commit()
        db.refresh(order)

        logger.info(f"Order {order_id} confirmed by seller {seller_account_id}")
        return order

    @staticmethod
    def decline_order(
        db: Session,
        order_id: int,
        seller_account_id: int,
        decline_reason: Optional[str] = None
    ) -> Order:
        """Farmer declines an order."""
        order = db.query(Order).filter(
            and_(
                Order.id == order_id,
                Order.seller_account_id == seller_account_id,
                Order.status == OrderStatusEnum.PENDING
            )
        ).first()

        if not order:
            raise ValueError("Order not found or not in PENDING status")

        order.status = OrderStatusEnum.DECLINED
        order.declined_at = datetime.now(timezone.utc)
        order.decline_reason = decline_reason

        db.commit()
        db.refresh(order)

        logger.info(f"Order {order_id} declined by seller {seller_account_id}")
        return order

    @staticmethod
    def complete_order(
        db: Session,
        order_id: int,
        buyer_account_id: int
    ) -> Order:
        """Wholesaler marks order as received/completed."""
        order = db.query(Order).filter(
            and_(
                Order.id == order_id,
                Order.buyer_account_id == buyer_account_id,
                Order.status == OrderStatusEnum.CONFIRMED
            )
        ).first()

        if not order:
            raise ValueError("Order not found or not in CONFIRMED status")

        order.status = OrderStatusEnum.COMPLETED
        order.completed_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(order)

        logger.info(f"Order {order_id} completed by buyer {buyer_account_id}")
        return order

    @staticmethod
    def cancel_order(
        db: Session,
        order_id: int,
        buyer_account_id: int
    ) -> Order:
        """
        Wholesaler cancels an order.
        If order was CONFIRMED, restores listing quantity.
        """
        order = db.query(Order).filter(
            and_(
                Order.id == order_id,
                Order.buyer_account_id == buyer_account_id,
                Order.status.in_([OrderStatusEnum.PENDING, OrderStatusEnum.CONFIRMED])
            )
        ).first()

        if not order:
            raise ValueError("Order not found or cannot be cancelled")

        # Restore listing quantity if order was confirmed
        if order.status == OrderStatusEnum.CONFIRMED and order.listing_id:
            listing = db.query(ProductListing).filter(
                ProductListing.id == order.listing_id
            ).with_for_update().first()

            if listing:
                listing.available_quantity = listing.available_quantity + order.quantity
                if listing.status == ListingStatusEnum.SOLD_OUT:
                    listing.status = ListingStatusEnum.ACTIVE

        order.status = OrderStatusEnum.CANCELLED
        order.cancelled_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(order)

        logger.info(f"Order {order_id} cancelled by buyer {buyer_account_id}")
        return order

    # ==================== Order Queries ====================

    @staticmethod
    def _enrich_order(order: Order, db: Session) -> OrderResponse:
        """Convert Order model to OrderResponse with enriched names."""
        buyer_name = None
        seller_name = None
        seller_farm_name = None

        # Get buyer name
        buyer_profile = db.query(UserProfile).filter(
            UserProfile.account_id == order.buyer_account_id
        ).first()
        if buyer_profile:
            buyer_name = buyer_profile.name

        # Get seller name and farm name
        seller_profile = db.query(UserProfile).filter(
            UserProfile.account_id == order.seller_account_id
        ).first()
        if seller_profile:
            seller_name = seller_profile.name

        farmer_profile = db.query(FarmerProfile).filter(
            FarmerProfile.account_id == order.seller_account_id
        ).first()
        if farmer_profile:
            seller_farm_name = farmer_profile.farm_name

        return OrderResponse(
            id=order.id,
            buyer_account_id=order.buyer_account_id,
            seller_account_id=order.seller_account_id,
            listing_id=order.listing_id,
            listing_title=order.listing_title,
            quantity=order.quantity,
            unit=order.unit,
            price_per_unit=order.price_per_unit,
            total_price=order.total_price,
            currency=order.currency,
            status=order.status,
            buyer_notes=order.buyer_notes,
            seller_notes=order.seller_notes,
            decline_reason=order.decline_reason,
            confirmed_at=order.confirmed_at,
            declined_at=order.declined_at,
            completed_at=order.completed_at,
            cancelled_at=order.cancelled_at,
            created_at=order.created_at,
            updated_at=order.updated_at,
            buyer_name=buyer_name,
            seller_name=seller_name,
            seller_farm_name=seller_farm_name,
        )

    @staticmethod
    def get_buyer_orders(
        db: Session,
        buyer_account_id: int,
        status: Optional[OrderStatusEnum] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[OrderResponse], int]:
        """Get orders placed by a wholesaler (paginated)."""
        query = db.query(Order).filter(
            Order.buyer_account_id == buyer_account_id
        )

        if status:
            query = query.filter(Order.status == status)

        total = query.count()
        skip = (page - 1) * page_size

        orders = query.order_by(Order.created_at.desc()).offset(skip).limit(page_size).all()
        enriched = [OrderService._enrich_order(o, db) for o in orders]

        return enriched, total

    @staticmethod
    def get_seller_orders(
        db: Session,
        seller_account_id: int,
        status: Optional[OrderStatusEnum] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Tuple[List[OrderResponse], int]:
        """Get incoming orders for a farmer (paginated)."""
        query = db.query(Order).filter(
            Order.seller_account_id == seller_account_id
        )

        if status:
            query = query.filter(Order.status == status)

        total = query.count()
        skip = (page - 1) * page_size

        orders = query.order_by(Order.created_at.desc()).offset(skip).limit(page_size).all()
        enriched = [OrderService._enrich_order(o, db) for o in orders]

        return enriched, total

    @staticmethod
    def get_order_detail(
        db: Session,
        order_id: int,
        account_id: int
    ) -> Optional[OrderResponse]:
        """Get order detail (must be buyer or seller)."""
        order = db.query(Order).filter(
            and_(
                Order.id == order_id,
                (Order.buyer_account_id == account_id) | (Order.seller_account_id == account_id)
            )
        ).first()

        if not order:
            return None

        return OrderService._enrich_order(order, db)

    # ==================== Stats ====================

    @staticmethod
    def get_buyer_stats(db: Session, buyer_account_id: int) -> OrderStatsResponse:
        """Get spending stats for a wholesaler."""
        orders = db.query(Order).filter(
            Order.buyer_account_id == buyer_account_id
        ).all()

        stats = OrderStatsResponse()
        stats.total_orders = len(orders)

        for o in orders:
            if o.status == OrderStatusEnum.PENDING:
                stats.pending_orders += 1
            elif o.status == OrderStatusEnum.CONFIRMED:
                stats.confirmed_orders += 1
            elif o.status == OrderStatusEnum.COMPLETED:
                stats.completed_orders += 1
                stats.total_amount += Decimal(str(o.total_price))
            elif o.status == OrderStatusEnum.DECLINED:
                stats.declined_orders += 1
            elif o.status == OrderStatusEnum.CANCELLED:
                stats.cancelled_orders += 1

        return stats

    @staticmethod
    def get_seller_stats(db: Session, seller_account_id: int) -> OrderStatsResponse:
        """Get earning stats for a farmer."""
        orders = db.query(Order).filter(
            Order.seller_account_id == seller_account_id
        ).all()

        stats = OrderStatsResponse()
        stats.total_orders = len(orders)

        for o in orders:
            if o.status == OrderStatusEnum.PENDING:
                stats.pending_orders += 1
            elif o.status == OrderStatusEnum.CONFIRMED:
                stats.confirmed_orders += 1
            elif o.status == OrderStatusEnum.COMPLETED:
                stats.completed_orders += 1
                stats.total_amount += Decimal(str(o.total_price))
            elif o.status == OrderStatusEnum.DECLINED:
                stats.declined_orders += 1
            elif o.status == OrderStatusEnum.CANCELLED:
                stats.cancelled_orders += 1

        return stats

    # ==================== Suppliers ====================

    @staticmethod
    def get_buyer_suppliers(
        db: Session,
        buyer_account_id: int
    ) -> List[SupplierSummary]:
        """Get distinct suppliers (farmers) a wholesaler has ordered from."""
        # Aggregate orders by seller
        results = db.query(
            Order.seller_account_id,
            func.count(Order.id).label('total_orders'),
            func.sum(Order.total_price).label('total_spent'),
            func.max(Order.created_at).label('last_order_date')
        ).filter(
            Order.buyer_account_id == buyer_account_id
        ).group_by(
            Order.seller_account_id
        ).all()

        suppliers = []
        for row in results:
            seller_id = row[0]
            total_orders = row[1]
            total_spent = Decimal(str(row[2])) if row[2] else Decimal("0.00")
            last_order_date = row[3]

            # Get seller info
            account = db.query(Account).filter(Account.id == seller_id).first()
            name = None
            farm_name = None
            email = None
            phone = None

            if account:
                email = account.email
                if account.profile:
                    name = account.profile.name
                    phone = account.profile.phone_number
                if account.farmer_profile:
                    farm_name = account.farmer_profile.farm_name

            suppliers.append(SupplierSummary(
                account_id=seller_id,
                name=name,
                farm_name=farm_name,
                email=email,
                phone_number=phone,
                total_orders=total_orders,
                total_spent=total_spent,
                last_order_date=last_order_date,
            ))

        # Sort by total orders descending
        suppliers.sort(key=lambda s: s.total_orders, reverse=True)
        return suppliers
