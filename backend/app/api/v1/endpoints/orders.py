"""
Order API endpoints.

Provides endpoints for:
- Wholesalers: place, view, cancel, complete orders; view suppliers
- Farmers: view incoming orders, confirm, decline
"""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional

from app.schemas.account import AccountProfile
from app.schemas.order import (
    OrderCreate, OrderConfirm, OrderDecline,
    OrderResponse, OrderListResponse, OrderStatsResponse,
    SupplierSummary, SupplierListResponse
)
from app.models.order import OrderStatusEnum
from app.services.order_service import OrderService
from app.core.deps import (
    get_current_wholesaler_account,
    get_current_farmer_account,
    get_current_active_account,
    get_db
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ==================== Wholesaler Endpoints ====================

@router.post("", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def place_order(
    order_data: OrderCreate,
    current_account: AccountProfile = Depends(get_current_wholesaler_account),
    db: Session = Depends(get_db)
):
    """
    Place a new order on a marketplace listing.

    Restricted to wholesalers only.
    Validates listing is active and quantity is within bounds.
    """
    try:
        order = OrderService.create_order(
            db=db,
            order_data=order_data,
            buyer_account_id=current_account.id
        )
        enriched = OrderService.get_order_detail(db, order.id, current_account.id)
        logger.info(f"Wholesaler {current_account.id} placed order {order.id}")
        return enriched

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except SQLAlchemyError as e:
        logger.error(f"Database error placing order: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred. Please try again."
        )


@router.get("/my-orders", response_model=OrderListResponse)
async def get_my_orders(
    order_status: Optional[OrderStatusEnum] = Query(None, alias="status", description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_account: AccountProfile = Depends(get_current_wholesaler_account),
    db: Session = Depends(get_db)
):
    """
    Get orders placed by the current wholesaler.

    Supports status filtering and pagination.
    """
    try:
        orders, total = OrderService.get_buyer_orders(
            db=db,
            buyer_account_id=current_account.id,
            status=order_status,
            page=page,
            page_size=page_size
        )

        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        return OrderListResponse(
            data=orders,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    except SQLAlchemyError as e:
        logger.error(f"Database error fetching orders: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred. Please try again."
        )


@router.get("/my-orders/{order_id}", response_model=OrderResponse)
async def get_my_order_detail(
    order_id: int,
    current_account: AccountProfile = Depends(get_current_wholesaler_account),
    db: Session = Depends(get_db)
):
    """Get detail of a specific order placed by the wholesaler."""
    order = OrderService.get_order_detail(db, order_id, current_account.id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    return order


@router.post("/my-orders/{order_id}/complete", response_model=OrderResponse)
async def complete_order(
    order_id: int,
    current_account: AccountProfile = Depends(get_current_wholesaler_account),
    db: Session = Depends(get_db)
):
    """
    Mark an order as completed (received).

    Only works for orders in CONFIRMED status.
    """
    try:
        order = OrderService.complete_order(
            db=db,
            order_id=order_id,
            buyer_account_id=current_account.id
        )
        enriched = OrderService.get_order_detail(db, order.id, current_account.id)
        logger.info(f"Wholesaler {current_account.id} completed order {order_id}")
        return enriched

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/my-orders/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: int,
    current_account: AccountProfile = Depends(get_current_wholesaler_account),
    db: Session = Depends(get_db)
):
    """
    Cancel an order.

    Works for orders in PENDING or CONFIRMED status.
    If confirmed, restores listing quantity.
    """
    try:
        order = OrderService.cancel_order(
            db=db,
            order_id=order_id,
            buyer_account_id=current_account.id
        )
        enriched = OrderService.get_order_detail(db, order.id, current_account.id)
        logger.info(f"Wholesaler {current_account.id} cancelled order {order_id}")
        return enriched

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/my-stats", response_model=OrderStatsResponse)
async def get_my_stats(
    current_account: AccountProfile = Depends(get_current_wholesaler_account),
    db: Session = Depends(get_db)
):
    """Get spending statistics for the current wholesaler."""
    return OrderService.get_buyer_stats(db, current_account.id)


@router.get("/my-suppliers", response_model=SupplierListResponse)
async def get_my_suppliers(
    current_account: AccountProfile = Depends(get_current_wholesaler_account),
    db: Session = Depends(get_db)
):
    """Get list of suppliers (farmers) the wholesaler has ordered from."""
    suppliers = OrderService.get_buyer_suppliers(db, current_account.id)
    return SupplierListResponse(data=suppliers, total=len(suppliers))


# ==================== Farmer Endpoints ====================

@router.get("/incoming", response_model=OrderListResponse)
async def get_incoming_orders(
    order_status: Optional[OrderStatusEnum] = Query(None, alias="status", description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    current_account: AccountProfile = Depends(get_current_farmer_account),
    db: Session = Depends(get_db)
):
    """
    Get incoming orders for the current farmer.

    Supports status filtering and pagination.
    """
    try:
        orders, total = OrderService.get_seller_orders(
            db=db,
            seller_account_id=current_account.id,
            status=order_status,
            page=page,
            page_size=page_size
        )

        total_pages = (total + page_size - 1) // page_size if total > 0 else 0

        return OrderListResponse(
            data=orders,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    except SQLAlchemyError as e:
        logger.error(f"Database error fetching incoming orders: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database error occurred. Please try again."
        )


@router.get("/incoming/{order_id}", response_model=OrderResponse)
async def get_incoming_order_detail(
    order_id: int,
    current_account: AccountProfile = Depends(get_current_farmer_account),
    db: Session = Depends(get_db)
):
    """Get detail of a specific incoming order."""
    order = OrderService.get_order_detail(db, order_id, current_account.id)

    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )

    return order


@router.post("/incoming/{order_id}/confirm", response_model=OrderResponse)
async def confirm_order(
    order_id: int,
    body: Optional[OrderConfirm] = None,
    current_account: AccountProfile = Depends(get_current_farmer_account),
    db: Session = Depends(get_db)
):
    """
    Confirm an incoming order.

    Deducts quantity from the listing. Uses row-level locking to prevent overselling.
    """
    try:
        seller_notes = body.seller_notes if body else None
        order = OrderService.confirm_order(
            db=db,
            order_id=order_id,
            seller_account_id=current_account.id,
            seller_notes=seller_notes
        )
        enriched = OrderService.get_order_detail(db, order.id, current_account.id)
        logger.info(f"Farmer {current_account.id} confirmed order {order_id}")
        return enriched

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/incoming/{order_id}/decline", response_model=OrderResponse)
async def decline_order(
    order_id: int,
    body: Optional[OrderDecline] = None,
    current_account: AccountProfile = Depends(get_current_farmer_account),
    db: Session = Depends(get_db)
):
    """
    Decline an incoming order.

    Optionally provide a reason for declining.
    """
    try:
        decline_reason = body.decline_reason if body else None
        order = OrderService.decline_order(
            db=db,
            order_id=order_id,
            seller_account_id=current_account.id,
            decline_reason=decline_reason
        )
        enriched = OrderService.get_order_detail(db, order.id, current_account.id)
        logger.info(f"Farmer {current_account.id} declined order {order_id}")
        return enriched

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/seller-stats", response_model=OrderStatsResponse)
async def get_seller_stats(
    current_account: AccountProfile = Depends(get_current_farmer_account),
    db: Session = Depends(get_db)
):
    """Get earning statistics for the current farmer."""
    return OrderService.get_seller_stats(db, current_account.id)
