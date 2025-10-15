from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_account
from app.schemas.account import AccountProfile
from app.schemas.inventory import (
    # Inventory Types
    InventoryTypeCreate, InventoryTypeUpdate, InventoryTypeResponse,
    # Warehouses
    WarehouseCreate, WarehouseUpdate, WarehouseResponse,
    # Storage Bins
    StorageBinCreate, StorageBinUpdate, StorageBinResponse,
    # Inventory Items
    InventoryItemCreate, InventoryItemUpdate, InventoryItemResponse,
    # Transactions
    InventoryTransactionCreate, InventoryTransactionResponse,
    # Alerts & Reports
    LowStockAlert, ExpiringItemAlert, InventoryValuationReport
)
from app.services.inventory_service import InventoryService
from app.models.inventory import InventoryCategoryEnum, InventoryStatusEnum

router = APIRouter()


# ==================== Inventory Types Endpoints ====================

@router.get("/types", response_model=List[InventoryTypeResponse])
async def list_inventory_types(
    category: Optional[InventoryCategoryEnum] = None,
    skip: int = 0,
    limit: int = 100,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    List all inventory types (system defaults + account-specific).
    Available to all authenticated users.
    """
    types = InventoryService.get_inventory_types(
        db=db,
        account_id=current_account.id,
        category=category,
        skip=skip,
        limit=limit
    )
    return types


@router.post("/types", response_model=InventoryTypeResponse, status_code=status.HTTP_201_CREATED)
async def create_inventory_type(
    type_data: InventoryTypeCreate,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Create a new custom inventory type for your account.
    """
    inventory_type = InventoryService.create_inventory_type(
        db=db,
        inventory_type_data=type_data,
        account_id=current_account.id
    )
    return inventory_type


@router.get("/types/{type_id}", response_model=InventoryTypeResponse)
async def get_inventory_type(
    type_id: int,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Get details of a specific inventory type.
    """
    inventory_type = InventoryService.get_inventory_type(db=db, type_id=type_id)
    if not inventory_type:
        raise HTTPException(status_code=404, detail="Inventory type not found")

    # Check permission: must be system default or owned by current account
    if inventory_type.account_id is not None and inventory_type.account_id != current_account.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this inventory type")

    return inventory_type


@router.put("/types/{type_id}", response_model=InventoryTypeResponse)
async def update_inventory_type(
    type_id: int,
    update_data: InventoryTypeUpdate,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Update an inventory type (only if you own it).
    """
    # Verify ownership
    existing = InventoryService.get_inventory_type(db=db, type_id=type_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Inventory type not found")

    if existing.account_id != current_account.id:
        raise HTTPException(status_code=403, detail="Cannot update system defaults or types owned by others")

    updated = InventoryService.update_inventory_type(db=db, type_id=type_id, update_data=update_data)
    return updated


@router.delete("/types/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inventory_type(
    type_id: int,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Delete an inventory type (only if you own it and it's not in use).
    """
    # Verify ownership
    existing = InventoryService.get_inventory_type(db=db, type_id=type_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Inventory type not found")

    if existing.account_id != current_account.id:
        raise HTTPException(status_code=403, detail="Cannot delete system defaults or types owned by others")

    success = InventoryService.delete_inventory_type(db=db, type_id=type_id)
    if not success:
        raise HTTPException(status_code=400, detail="Cannot delete inventory type (may be in use)")


# ==================== Warehouse Endpoints ====================

@router.get("/warehouses", response_model=List[WarehouseResponse])
async def list_warehouses(
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    List all warehouses for the current account.
    """
    warehouses = InventoryService.get_warehouses(
        db=db,
        account_id=current_account.id,
        is_active=is_active,
        skip=skip,
        limit=limit
    )
    return warehouses


@router.post("/warehouses", response_model=WarehouseResponse, status_code=status.HTTP_201_CREATED)
async def create_warehouse(
    warehouse_data: WarehouseCreate,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Create a new warehouse.
    """
    warehouse = InventoryService.create_warehouse(
        db=db,
        warehouse_data=warehouse_data,
        account_id=current_account.id
    )
    return warehouse


@router.get("/warehouses/{warehouse_id}", response_model=WarehouseResponse)
async def get_warehouse(
    warehouse_id: int,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Get details of a specific warehouse.
    """
    warehouse = InventoryService.get_warehouse(db=db, warehouse_id=warehouse_id, account_id=current_account.id)
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return warehouse


@router.put("/warehouses/{warehouse_id}", response_model=WarehouseResponse)
async def update_warehouse(
    warehouse_id: int,
    update_data: WarehouseUpdate,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Update a warehouse.
    """
    warehouse = InventoryService.update_warehouse(
        db=db,
        warehouse_id=warehouse_id,
        account_id=current_account.id,
        update_data=update_data
    )
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return warehouse


@router.delete("/warehouses/{warehouse_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_warehouse(
    warehouse_id: int,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Delete a warehouse.
    """
    success = InventoryService.delete_warehouse(db=db, warehouse_id=warehouse_id, account_id=current_account.id)
    if not success:
        raise HTTPException(status_code=404, detail="Warehouse not found")


# ==================== Storage Bin Endpoints ====================

@router.get("/warehouses/{warehouse_id}/bins", response_model=List[StorageBinResponse])
async def list_warehouse_bins(
    warehouse_id: int,
    is_active: Optional[bool] = None,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    List all storage bins in a warehouse.
    """
    bins = InventoryService.get_warehouse_bins(
        db=db,
        warehouse_id=warehouse_id,
        account_id=current_account.id,
        is_active=is_active
    )
    return bins


@router.post("/warehouses/{warehouse_id}/bins", response_model=StorageBinResponse, status_code=status.HTTP_201_CREATED)
async def create_storage_bin(
    warehouse_id: int,
    bin_data: StorageBinCreate,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Create a new storage bin in a warehouse.
    """
    # Override warehouse_id from URL
    bin_data.warehouse_id = warehouse_id

    storage_bin = InventoryService.create_storage_bin(
        db=db,
        bin_data=bin_data,
        account_id=current_account.id
    )
    if not storage_bin:
        raise HTTPException(status_code=404, detail="Warehouse not found or not owned by you")
    return storage_bin


@router.put("/bins/{bin_id}", response_model=StorageBinResponse)
async def update_storage_bin(
    bin_id: int,
    update_data: StorageBinUpdate,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Update a storage bin.
    """
    storage_bin = InventoryService.update_storage_bin(
        db=db,
        bin_id=bin_id,
        account_id=current_account.id,
        update_data=update_data
    )
    if not storage_bin:
        raise HTTPException(status_code=404, detail="Storage bin not found")
    return storage_bin


@router.delete("/bins/{bin_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_storage_bin(
    bin_id: int,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Delete a storage bin.
    """
    success = InventoryService.delete_storage_bin(db=db, bin_id=bin_id, account_id=current_account.id)
    if not success:
        raise HTTPException(status_code=404, detail="Storage bin not found")


# ==================== Inventory Item Endpoints ====================

@router.get("/items", response_model=List[InventoryItemResponse])
async def list_inventory_items(
    status: Optional[InventoryStatusEnum] = None,
    warehouse_id: Optional[int] = None,
    inventory_type_id: Optional[int] = None,
    batch_number: Optional[str] = None,
    low_stock_only: bool = False,
    expiring_within_days: Optional[int] = None,
    skip: int = 0,
    limit: int = 100,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    List inventory items with various filters.

    - **status**: Filter by item status (available, reserved, sold, etc.)
    - **warehouse_id**: Filter by warehouse
    - **inventory_type_id**: Filter by inventory type
    - **batch_number**: Filter by batch number
    - **low_stock_only**: Show only items below minimum quantity
    - **expiring_within_days**: Show items expiring within X days
    """
    items = InventoryService.get_inventory_items(
        db=db,
        account_id=current_account.id,
        status=status,
        warehouse_id=warehouse_id,
        inventory_type_id=inventory_type_id,
        batch_number=batch_number,
        low_stock_only=low_stock_only,
        expiring_soon=expiring_within_days,
        skip=skip,
        limit=limit
    )
    return items


@router.post("/items", response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED)
async def create_inventory_item(
    item_data: InventoryItemCreate,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Create a new inventory item.
    """
    item = InventoryService.create_inventory_item(
        db=db,
        item_data=item_data,
        account_id=current_account.id,
        performed_by_account_id=current_account.id
    )
    return item


@router.get("/items/{item_id}", response_model=InventoryItemResponse)
async def get_inventory_item(
    item_id: int,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Get details of a specific inventory item.
    """
    item = InventoryService.get_inventory_item(db=db, item_id=item_id, account_id=current_account.id)
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item


@router.put("/items/{item_id}", response_model=InventoryItemResponse)
async def update_inventory_item(
    item_id: int,
    update_data: InventoryItemUpdate,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Update an inventory item.
    If quantity changes, a transaction will be automatically logged.
    """
    item = InventoryService.update_inventory_item(
        db=db,
        item_id=item_id,
        account_id=current_account.id,
        update_data=update_data,
        performed_by_account_id=current_account.id
    )
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inventory_item(
    item_id: int,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Delete an inventory item.
    """
    success = InventoryService.delete_inventory_item(db=db, item_id=item_id, account_id=current_account.id)
    if not success:
        raise HTTPException(status_code=404, detail="Inventory item not found")


# ==================== Transaction Endpoints ====================

@router.get("/items/{item_id}/transactions", response_model=List[InventoryTransactionResponse])
async def get_item_transactions(
    item_id: int,
    skip: int = 0,
    limit: int = 100,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Get transaction history for a specific inventory item.
    """
    transactions = InventoryService.get_item_transactions(
        db=db,
        item_id=item_id,
        account_id=current_account.id,
        skip=skip,
        limit=limit
    )
    return transactions


@router.post("/items/{item_id}/transactions", response_model=InventoryTransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    item_id: int,
    transaction_data: InventoryTransactionCreate,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Create a new inventory transaction.
    This will automatically update the item's quantity.
    """
    # Override item_id from URL
    transaction_data.inventory_item_id = item_id

    try:
        transaction = InventoryService.create_transaction(
            db=db,
            transaction_data=transaction_data,
            account_id=current_account.id,
            performed_by_account_id=current_account.id
        )
        if not transaction:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        return transaction
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/items/{item_id}/transfer", response_model=InventoryItemResponse)
async def transfer_inventory_item(
    item_id: int,
    to_warehouse_id: int = Query(..., description="Destination warehouse ID"),
    to_bin_id: Optional[int] = Query(None, description="Destination bin ID"),
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Transfer an inventory item to a different warehouse/bin.
    """
    try:
        item = InventoryService.transfer_item(
            db=db,
            item_id=item_id,
            account_id=current_account.id,
            to_warehouse_id=to_warehouse_id,
            to_bin_id=to_bin_id,
            performed_by_account_id=current_account.id
        )
        if not item:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        return item
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== Alert Endpoints ====================

@router.get("/alerts/low-stock", response_model=List[LowStockAlert])
async def get_low_stock_alerts(
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Get items with low stock (current quantity <= minimum quantity).
    """
    alerts = InventoryService.get_low_stock_alerts(db=db, account_id=current_account.id)
    return alerts


@router.get("/alerts/expiring", response_model=List[ExpiringItemAlert])
async def get_expiring_items(
    days: int = Query(7, ge=0, description="Number of days threshold (default 7)"),
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Get items expiring within specified number of days.

    - **days=7**: Items expiring in next 7 days (warning)
    - **days=3**: Items expiring in next 3 days (urgent)
    - **days=0**: Already expired items (critical)
    """
    alerts = InventoryService.get_expiring_items(db=db, account_id=current_account.id, days_threshold=days)
    return alerts


@router.post("/alerts/mark-expired", status_code=status.HTTP_200_OK)
async def mark_expired_items(
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Automatically mark all expired items as EXPIRED status.
    This should typically be run as a scheduled job.
    """
    count = InventoryService.mark_expired_items(db=db, account_id=current_account.id)
    return {"message": f"Marked {count} items as expired", "count": count}


# ==================== Report Endpoints ====================

@router.get("/reports/valuation", response_model=InventoryValuationReport)
async def get_inventory_valuation(
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Get total inventory valuation report.
    Includes total value, breakdown by category, and status summary.
    """
    report = InventoryService.get_inventory_valuation(db=db, account_id=current_account.id)
    return report


@router.get("/reports/batch/{batch_number}", response_model=List[InventoryItemResponse])
async def get_batch_items(
    batch_number: str,
    current_account: AccountProfile = Depends(get_current_account),
    db: Session = Depends(get_db)
):
    """
    Get all items from a specific batch (for FIFO and traceability).
    Returns items ordered by acquisition date (oldest first).
    """
    items = InventoryService.get_items_by_batch(
        db=db,
        account_id=current_account.id,
        batch_number=batch_number
    )
    return items
