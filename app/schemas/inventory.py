from pydantic import BaseModel, Field, computed_field
from typing import Optional, List, Dict, Any
from datetime import datetime
from decimal import Decimal

from app.models.inventory import (
    InventoryCategoryEnum,
    InventoryStatusEnum,
    TransactionTypeEnum
)


# ==================== Inventory Type Schemas ====================

class InventoryTypeBase(BaseModel):
    type_name: str = Field(..., max_length=255, description="Name of the inventory type")
    category: InventoryCategoryEnum = Field(..., description="Category of inventory")
    description: Optional[str] = Field(None, description="Description of the inventory type")
    unit_of_measure: str = Field(..., max_length=50, description="Unit of measure (kg, dozen, bunch, etc.)")
    perishable: bool = Field(default=False, description="Whether the item is perishable")
    typical_shelf_life_days: Optional[int] = Field(None, ge=1, description="Typical shelf life in days (for perishable items)")
    reorder_point: Optional[Decimal] = Field(None, ge=0, description="Quantity threshold to trigger reorder alert")
    reorder_quantity: Optional[Decimal] = Field(None, ge=0, description="Suggested quantity to reorder")


class InventoryTypeCreate(InventoryTypeBase):
    account_id: Optional[int] = Field(None, description="Account ID (null for system defaults)")


class InventoryTypeUpdate(BaseModel):
    type_name: Optional[str] = Field(None, max_length=255)
    category: Optional[InventoryCategoryEnum] = None
    description: Optional[str] = None
    unit_of_measure: Optional[str] = Field(None, max_length=50)
    perishable: Optional[bool] = None
    typical_shelf_life_days: Optional[int] = Field(None, ge=1)
    reorder_point: Optional[Decimal] = Field(None, ge=0)
    reorder_quantity: Optional[Decimal] = Field(None, ge=0)


class InventoryTypeResponse(InventoryTypeBase):
    id: int
    account_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Warehouse Schemas ====================

class WarehouseBase(BaseModel):
    warehouse_name: str = Field(..., max_length=255, description="Name of the warehouse")
    warehouse_code: Optional[str] = Field(None, max_length=50, description="Short code for the warehouse")
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    province: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: str = Field(default="South Africa", max_length=100)
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90)
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180)
    storage_capacity: Optional[Decimal] = Field(None, ge=0)
    capacity_unit: Optional[str] = Field(None, max_length=50)
    temperature_controlled: bool = Field(default=False)
    min_temperature: Optional[float] = None
    max_temperature: Optional[float] = None
    is_active: bool = Field(default=True)


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(BaseModel):
    warehouse_name: Optional[str] = Field(None, max_length=255)
    warehouse_code: Optional[str] = Field(None, max_length=50)
    address: Optional[str] = Field(None, max_length=500)
    city: Optional[str] = Field(None, max_length=100)
    province: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    country: Optional[str] = Field(None, max_length=100)
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90)
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180)
    storage_capacity: Optional[Decimal] = Field(None, ge=0)
    capacity_unit: Optional[str] = Field(None, max_length=50)
    temperature_controlled: Optional[bool] = None
    min_temperature: Optional[float] = None
    max_temperature: Optional[float] = None
    is_active: Optional[bool] = None


class WarehouseResponse(WarehouseBase):
    id: int
    account_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Storage Bin Schemas ====================

class StorageBinBase(BaseModel):
    bin_name: str = Field(..., max_length=255, description="Name of the storage bin")
    bin_code: str = Field(..., max_length=50, description="Code for the bin (e.g., A1, ROW-2-SHELF-3)")
    capacity: Optional[Decimal] = Field(None, ge=0)
    capacity_unit: Optional[str] = Field(None, max_length=50)
    is_active: bool = Field(default=True)


class StorageBinCreate(StorageBinBase):
    warehouse_id: int = Field(..., description="ID of the warehouse this bin belongs to")


class StorageBinUpdate(BaseModel):
    bin_name: Optional[str] = Field(None, max_length=255)
    bin_code: Optional[str] = Field(None, max_length=50)
    capacity: Optional[Decimal] = Field(None, ge=0)
    capacity_unit: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None


class StorageBinResponse(StorageBinBase):
    id: int
    warehouse_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ==================== Inventory Item Schemas ====================

class InventoryItemBase(BaseModel):
    item_name: str = Field(..., max_length=255, description="Name of the inventory item")
    description: Optional[str] = None
    sku: Optional[str] = Field(None, max_length=100, description="Stock Keeping Unit")
    current_quantity: Decimal = Field(..., ge=0, description="Current quantity in stock")
    unit: str = Field(..., max_length=50, description="Unit of measure")
    minimum_quantity: Optional[Decimal] = Field(None, ge=0, description="Minimum quantity threshold for alerts")
    acquisition_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    cost_per_unit: Optional[Decimal] = Field(None, ge=0)
    currency: str = Field(default="ZAR", max_length=3)
    batch_number: Optional[str] = Field(None, max_length=100)
    lot_number: Optional[str] = Field(None, max_length=100)
    status: InventoryStatusEnum = Field(default=InventoryStatusEnum.AVAILABLE)
    related_crop_id: Optional[int] = None
    related_animal_id: Optional[int] = None
    photos: Optional[List[str]] = Field(None, description="Array of photo URLs")
    custom_fields: Optional[Dict[str, Any]] = Field(None, description="Additional custom data")
    notes: Optional[str] = None


class InventoryItemCreate(InventoryItemBase):
    inventory_type_id: int = Field(..., description="ID of the inventory type")
    warehouse_id: Optional[int] = Field(None, description="ID of the warehouse")
    bin_id: Optional[int] = Field(None, description="ID of the storage bin")


class InventoryItemUpdate(BaseModel):
    item_name: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    sku: Optional[str] = Field(None, max_length=100)
    current_quantity: Optional[Decimal] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=50)
    minimum_quantity: Optional[Decimal] = Field(None, ge=0)
    acquisition_date: Optional[datetime] = None
    expiry_date: Optional[datetime] = None
    cost_per_unit: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = Field(None, max_length=3)
    batch_number: Optional[str] = Field(None, max_length=100)
    lot_number: Optional[str] = Field(None, max_length=100)
    status: Optional[InventoryStatusEnum] = None
    warehouse_id: Optional[int] = None
    bin_id: Optional[int] = None
    related_crop_id: Optional[int] = None
    related_animal_id: Optional[int] = None
    photos: Optional[List[str]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


class InventoryItemResponse(InventoryItemBase):
    id: int
    account_id: int
    inventory_type_id: int
    warehouse_id: Optional[int]
    bin_id: Optional[int]
    total_value: Optional[Decimal]
    created_at: datetime
    updated_at: datetime

    # Computed properties
    is_low_stock: bool = Field(default=False, description="Whether item is below minimum quantity")
    is_expired: bool = Field(default=False, description="Whether item has expired")

    class Config:
        from_attributes = True


# ==================== Inventory Transaction Schemas ====================

class InventoryTransactionBase(BaseModel):
    transaction_type: TransactionTypeEnum = Field(..., description="Type of transaction")
    quantity_change: Decimal = Field(..., description="Quantity change (positive = add, negative = remove)")
    from_location_id: Optional[int] = Field(None, description="From warehouse ID (for transfers)")
    to_location_id: Optional[int] = Field(None, description="To warehouse ID (for transfers)")
    cost_per_unit: Optional[Decimal] = Field(None, ge=0)
    related_order_id: Optional[int] = None
    related_task_id: Optional[int] = None
    notes: Optional[str] = None
    transaction_metadata: Optional[Dict[str, Any]] = Field(None, serialization_alias="metadata")


class InventoryTransactionCreate(InventoryTransactionBase):
    inventory_item_id: int = Field(..., description="ID of the inventory item")


class InventoryTransactionResponse(InventoryTransactionBase):
    id: int
    inventory_item_id: int
    transaction_date: datetime
    quantity_before: Optional[Decimal]
    quantity_after: Optional[Decimal]
    total_cost: Optional[Decimal]
    performed_by_account_id: Optional[int]
    created_at: datetime
    updated_at: datetime

    # Nested item information (populated when relationships are loaded)
    item_name: Optional[str] = Field(None, description="Name of the inventory item")
    item_sku: Optional[str] = Field(None, description="SKU of the inventory item")
    item_unit: Optional[str] = Field(None, description="Unit of measurement")
    inventory_type_name: Optional[str] = Field(None, description="Inventory type name")
    warehouse_name: Optional[str] = Field(None, description="Warehouse name")

    class Config:
        from_attributes = True
        populate_by_name = True  # Allow using both 'metadata' and 'transaction_metadata'


# ==================== Alert and Report Schemas ====================

class LowStockAlert(BaseModel):
    item_id: int
    item_name: str
    current_quantity: Decimal
    minimum_quantity: Decimal
    unit: str
    warehouse_name: Optional[str] = None
    bin_code: Optional[str] = None


class ExpiringItemAlert(BaseModel):
    item_id: int
    item_name: str
    current_quantity: Decimal
    unit: str
    expiry_date: datetime
    days_until_expiry: int
    batch_number: Optional[str] = None
    warehouse_name: Optional[str] = None


class InventoryValuationReport(BaseModel):
    total_items: int
    total_quantity: Decimal
    total_value: Decimal
    currency: str
    by_category: Dict[str, Decimal]
    by_status: Dict[str, int]


class StockMovementReport(BaseModel):
    item_id: int
    item_name: str
    transactions: List[InventoryTransactionResponse]
    total_added: Decimal
    total_removed: Decimal
    net_change: Decimal


class TransactionListResponse(BaseModel):
    """Response wrapper for transaction history endpoint"""
    data: List[InventoryTransactionResponse]
    message: str = "Transactions retrieved successfully"
