from fastapi import APIRouter, Depends
from typing import Any, Optional

from app.schemas.account import AccountProfile
from app.core.deps import (
    get_current_active_account,
    get_current_farmer_account,
    get_current_wholesaler_account,
    get_optional_current_account
)

router = APIRouter()


@router.get("/products")
async def get_products(
    current_account: Optional[AccountProfile] = Depends(get_optional_current_account)
) -> Any:
    """
    Get marketplace products.

    Public endpoint - authentication is optional.
    Authenticated users may see additional details or personalized results.
    """
    account_type = current_account.account_type if current_account else "guest"

    return {
        "message": "Get products - to be implemented",
        "account_type": account_type,
        "note": "Public endpoint with optional authentication"
    }


@router.post("/products")
async def create_product(
    current_account: AccountProfile = Depends(get_current_farmer_account)
) -> Any:
    """
    Create a new product listing.

    Restricted to farmers only. Farmers can list their produce for sale.
    """
    return {
        "message": "Create product listing - to be implemented",
        "farmer_id": current_account.id,
        "note": "Only farmers can create product listings"
    }


@router.get("/orders")
async def get_orders(
    current_account: AccountProfile = Depends(get_current_active_account)
) -> Any:
    """
    Get user's orders.

    Returns orders relevant to the authenticated user:
    - Farmers: Orders for their products
    - Wholesalers: Orders they have placed
    """
    return {
        "message": "Get orders - to be implemented",
        "account_id": current_account.id,
        "account_type": current_account.account_type,
        "note": "Returns orders specific to authenticated user"
    }


@router.post("/orders")
async def create_order(
    current_account: AccountProfile = Depends(get_current_wholesaler_account)
) -> Any:
    """
    Create a new order.

    Restricted to wholesalers only. Wholesalers can place orders for farmer products.
    """
    return {
        "message": "Create order - to be implemented",
        "wholesaler_id": current_account.id,
        "note": "Only wholesalers can create orders"
    }