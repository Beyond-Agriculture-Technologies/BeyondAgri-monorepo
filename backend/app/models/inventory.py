from datetime import datetime, timezone
from decimal import Decimal
import enum

from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, Enum, ForeignKey, JSON, Numeric, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import BaseModel
from app.core.constants import InventoryDefaults


class InventoryCategoryEnum(str, enum.Enum):
    """Categories for inventory items"""
    HARVEST = "HARVEST"
    MEAT = "MEAT"
    POULTRY = "POULTRY"
    PACKAGING = "PACKAGING"
    SUPPLIES = "SUPPLIES"
    OTHER = "OTHER"


class InventoryStatusEnum(str, enum.Enum):
    """Status of inventory items"""
    AVAILABLE = "AVAILABLE"
    RESERVED = "RESERVED"
    SOLD = "SOLD"
    EXPIRED = "EXPIRED"
    DAMAGED = "DAMAGED"
    IN_TRANSIT = "IN_TRANSIT"


class TransactionTypeEnum(str, enum.Enum):
    """Types of inventory transactions"""
    ADD = "ADD"
    REMOVE = "REMOVE"
    ADJUSTMENT = "ADJUSTMENT"
    TRANSFER = "TRANSFER"
    SALE = "SALE"
    SPOILAGE = "SPOILAGE"
    RETURN = "RETURN"


class InventoryType(BaseModel):
    """
    Master catalog of inventory item types.
    Can be system-wide defaults or account-specific.
    """
    __tablename__ = "inventory_types"

    # Nullable account_id means it's a system default
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=True, index=True)

    # Basic information
    type_name = Column(String(255), nullable=False, index=True)
    category = Column(Enum(InventoryCategoryEnum), nullable=False, index=True)
    description = Column(Text, nullable=True)

    # Measurement
    unit_of_measure = Column(String(50), nullable=False)  # kg, dozen, bunch, liters, etc.

    # Perishability
    perishable = Column(Boolean, default=False, nullable=False)
    typical_shelf_life_days = Column(Integer, nullable=True)  # Only for perishable items

    # Reorder management
    reorder_point = Column(Numeric(10, 2), nullable=True)  # Quantity threshold to trigger reorder alert
    reorder_quantity = Column(Numeric(10, 2), nullable=True)  # Suggested quantity to reorder

    # Relationships
    account = relationship("Account", backref="inventory_types")
    inventory_items = relationship("InventoryItem", back_populates="inventory_type", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<InventoryType(type_name='{self.type_name}', category='{self.category}')>"


class Warehouse(BaseModel):
    """
    Physical storage locations for farmers and wholesalers.
    """
    __tablename__ = "warehouses"

    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)

    # Basic information
    warehouse_name = Column(String(255), nullable=False)
    warehouse_code = Column(String(50), nullable=True, index=True)  # Optional short code

    # Location
    address = Column(String(500), nullable=True)
    city = Column(String(100), nullable=True)
    province = Column(String(100), nullable=True)
    postal_code = Column(String(20), nullable=True)
    country = Column(String(100), default="South Africa", nullable=False)

    # Location coordinates (for future mapping features)
    latitude = Column(Numeric(10, 7), nullable=True)
    longitude = Column(Numeric(10, 7), nullable=True)

    # Capacity
    storage_capacity = Column(Numeric(10, 2), nullable=True)
    capacity_unit = Column(String(50), nullable=True)  # m³, pallets, etc.

    # Features
    temperature_controlled = Column(Boolean, default=False, nullable=False)
    min_temperature = Column(Float, nullable=True)  # Celsius
    max_temperature = Column(Float, nullable=True)  # Celsius

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    account = relationship("Account", backref="warehouses")
    storage_bins = relationship("StorageBin", back_populates="warehouse", cascade="all, delete-orphan")
    inventory_items = relationship("InventoryItem", back_populates="warehouse")

    def __repr__(self):
        return f"<Warehouse(warehouse_name='{self.warehouse_name}', account_id={self.account_id})>"


class StorageBin(BaseModel):
    """
    Storage subdivisions within warehouses (sections, bins, shelves).
    """
    __tablename__ = "storage_bins"

    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="CASCADE"), nullable=False, index=True)

    # Identification
    bin_name = Column(String(255), nullable=False)
    bin_code = Column(String(50), nullable=False, index=True)  # e.g., "A1", "ROW-2-SHELF-3"

    # Capacity
    capacity = Column(Numeric(10, 2), nullable=True)
    capacity_unit = Column(String(50), nullable=True)

    # Status
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    warehouse = relationship("Warehouse", back_populates="storage_bins")
    inventory_items = relationship("InventoryItem", back_populates="storage_bin")

    def __repr__(self):
        return f"<StorageBin(bin_code='{self.bin_code}', warehouse_id={self.warehouse_id})>"


class InventoryItem(BaseModel):
    """
    Individual inventory items in stock.
    Represents actual physical inventory.
    """
    __tablename__ = "inventory_items"

    # Ownership
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)

    # Type and location
    inventory_type_id = Column(Integer, ForeignKey("inventory_types.id", ondelete="RESTRICT"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True, index=True)
    bin_id = Column(Integer, ForeignKey("storage_bins.id", ondelete="SET NULL"), nullable=True, index=True)

    # Basic information
    item_name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    sku = Column(String(100), nullable=True, index=True)  # Stock Keeping Unit

    # Quantity
    current_quantity = Column(Numeric(10, 2), nullable=False, default=0)
    unit = Column(String(50), nullable=False)
    minimum_quantity = Column(Numeric(10, 2), nullable=True)  # For low stock alerts

    # Dates
    acquisition_date = Column(DateTime(timezone=True), nullable=True)
    expiry_date = Column(DateTime(timezone=True), nullable=True, index=True)

    # Financials
    cost_per_unit = Column(Numeric(10, 2), nullable=True)
    total_value = Column(Numeric(12, 2), nullable=True)  # current_quantity × cost_per_unit
    currency = Column(String(3), default=InventoryDefaults.CURRENCY, nullable=False)

    # Batch/Lot tracking (critical for traceability)
    batch_number = Column(String(100), nullable=True, index=True)
    lot_number = Column(String(100), nullable=True, index=True)

    # Status
    status = Column(Enum(InventoryStatusEnum), default=InventoryStatusEnum.AVAILABLE, nullable=False, index=True)

    # Traceability (link back to farm production)
    related_crop_id = Column(Integer, nullable=True)  # Future: FK to crop_plantings
    related_animal_id = Column(Integer, nullable=True)  # Future: FK to animals

    # Media
    photos = Column(JSON, nullable=True)  # Array of S3 URLs

    # Additional metadata
    custom_fields = Column(JSON, nullable=True)  # For extensibility (e.g., quality_grade, certifications)
    notes = Column(Text, nullable=True)

    # Relationships
    account = relationship("Account", backref="inventory_items")
    inventory_type = relationship("InventoryType", back_populates="inventory_items")
    warehouse = relationship("Warehouse", back_populates="inventory_items")
    storage_bin = relationship("StorageBin", back_populates="inventory_items")
    transactions = relationship("InventoryTransaction", back_populates="inventory_item", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<InventoryItem(item_name='{self.item_name}', quantity={self.current_quantity} {self.unit}, status='{self.status}')>"

    @property
    def is_low_stock(self) -> bool:
        """Check if item is below minimum quantity threshold"""
        if self.minimum_quantity is None:
            return False
        return self.current_quantity <= self.minimum_quantity

    @property
    def is_expired(self) -> bool:
        """Check if item has expired"""
        if self.expiry_date is None:
            return False
        return datetime.now(timezone.utc) > self.expiry_date

    def calculate_total_value(self):
        """Calculate and update total value using Decimal for precision"""
        if self.cost_per_unit is not None and self.current_quantity is not None:
            self.total_value = Decimal(str(self.current_quantity)) * Decimal(str(self.cost_per_unit))
        return self.total_value


class InventoryTransaction(BaseModel):
    """
    Track all inventory changes for audit trail.
    Every change to inventory must be logged here.
    """
    __tablename__ = "inventory_transactions"

    inventory_item_id = Column(Integer, ForeignKey("inventory_items.id", ondelete="CASCADE"), nullable=False, index=True)

    # Transaction details
    transaction_type = Column(Enum(TransactionTypeEnum), nullable=False, index=True)
    transaction_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Quantity change
    quantity_change = Column(Numeric(10, 2), nullable=False)  # Positive = add, Negative = remove
    quantity_before = Column(Numeric(10, 2), nullable=True)
    quantity_after = Column(Numeric(10, 2), nullable=True)

    # Transfer tracking
    from_location_id = Column(Integer, ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True)
    to_location_id = Column(Integer, ForeignKey("warehouses.id", ondelete="SET NULL"), nullable=True)

    # Financials
    cost_per_unit = Column(Numeric(10, 2), nullable=True)
    total_cost = Column(Numeric(12, 2), nullable=True)

    # Related entities (for traceability)
    related_order_id = Column(Integer, nullable=True)  # Future: FK to orders
    related_task_id = Column(Integer, nullable=True)  # Future: FK to tasks

    # Performed by
    performed_by_account_id = Column(Integer, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True)

    # Notes
    notes = Column(Text, nullable=True)
    transaction_metadata = Column(JSON, nullable=True)  # Additional data

    # Relationships
    inventory_item = relationship("InventoryItem", back_populates="transactions")
    performed_by = relationship("Account", foreign_keys=[performed_by_account_id], backref="inventory_transactions")
    from_location = relationship("Warehouse", foreign_keys=[from_location_id], backref="outbound_transactions")
    to_location = relationship("Warehouse", foreign_keys=[to_location_id], backref="inbound_transactions")

    def __repr__(self):
        return f"<InventoryTransaction(type='{self.transaction_type}', quantity_change={self.quantity_change}, date={self.transaction_date})>"
