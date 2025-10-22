from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, or_, func

from app.models.inventory import (
    InventoryType, InventoryItem, Warehouse, StorageBin,
    InventoryTransaction, InventoryStatusEnum, TransactionTypeEnum,
    InventoryCategoryEnum
)
from app.schemas.inventory import (
    InventoryTypeCreate, InventoryTypeUpdate,
    WarehouseCreate, WarehouseUpdate,
    StorageBinCreate, StorageBinUpdate,
    InventoryItemCreate, InventoryItemUpdate,
    InventoryTransactionCreate,
    LowStockAlert, ExpiringItemAlert, InventoryValuationReport
)


class InventoryService:
    """
    Service class for inventory management business logic.
    Handles CRUD operations, stock management, alerts, and reporting.
    """

    # ==================== Inventory Type Methods ====================

    @staticmethod
    def create_inventory_type(
        db: Session,
        inventory_type_data: InventoryTypeCreate,
        account_id: Optional[int] = None
    ) -> InventoryType:
        """Create a new inventory type (system or account-specific)"""
        inventory_type = InventoryType(
            **inventory_type_data.model_dump(),
            account_id=account_id
        )
        db.add(inventory_type)
        db.commit()
        db.refresh(inventory_type)
        return inventory_type

    @staticmethod
    def get_inventory_types(
        db: Session,
        account_id: Optional[int] = None,
        category: Optional[InventoryCategoryEnum] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[InventoryType]:
        """Get inventory types (system defaults + account-specific)"""
        query = db.query(InventoryType)

        # Include system defaults (account_id is None) and account-specific types
        if account_id:
            query = query.filter(
                or_(
                    InventoryType.account_id == None,
                    InventoryType.account_id == account_id
                )
            )
        else:
            query = query.filter(InventoryType.account_id == None)

        if category:
            query = query.filter(InventoryType.category == category)

        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_inventory_type(db: Session, type_id: int) -> Optional[InventoryType]:
        """Get a specific inventory type by ID"""
        return db.query(InventoryType).filter(InventoryType.id == type_id).first()

    @staticmethod
    def update_inventory_type(
        db: Session,
        type_id: int,
        update_data: InventoryTypeUpdate
    ) -> Optional[InventoryType]:
        """Update an inventory type"""
        inventory_type = db.query(InventoryType).filter(InventoryType.id == type_id).first()
        if not inventory_type:
            return None

        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(inventory_type, field, value)

        db.commit()
        db.refresh(inventory_type)
        return inventory_type

    @staticmethod
    def delete_inventory_type(db: Session, type_id: int) -> bool:
        """Delete an inventory type"""
        inventory_type = db.query(InventoryType).filter(InventoryType.id == type_id).first()
        if not inventory_type:
            return False

        db.delete(inventory_type)
        db.commit()
        return True

    # ==================== Warehouse Methods ====================

    @staticmethod
    def create_warehouse(
        db: Session,
        warehouse_data: WarehouseCreate,
        account_id: int
    ) -> Warehouse:
        """Create a new warehouse"""
        warehouse = Warehouse(**warehouse_data.model_dump(), account_id=account_id)
        db.add(warehouse)
        db.commit()
        db.refresh(warehouse)
        return warehouse

    @staticmethod
    def get_warehouses(
        db: Session,
        account_id: int,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Warehouse]:
        """Get warehouses for an account"""
        query = db.query(Warehouse).filter(Warehouse.account_id == account_id)

        if is_active is not None:
            query = query.filter(Warehouse.is_active == is_active)

        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_warehouse(db: Session, warehouse_id: int, account_id: int) -> Optional[Warehouse]:
        """Get a specific warehouse"""
        return db.query(Warehouse).filter(
            and_(
                Warehouse.id == warehouse_id,
                Warehouse.account_id == account_id
            )
        ).first()

    @staticmethod
    def update_warehouse(
        db: Session,
        warehouse_id: int,
        account_id: int,
        update_data: WarehouseUpdate
    ) -> Optional[Warehouse]:
        """Update a warehouse"""
        warehouse = db.query(Warehouse).filter(
            and_(
                Warehouse.id == warehouse_id,
                Warehouse.account_id == account_id
            )
        ).first()

        if not warehouse:
            return None

        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(warehouse, field, value)

        db.commit()
        db.refresh(warehouse)
        return warehouse

    @staticmethod
    def delete_warehouse(db: Session, warehouse_id: int, account_id: int) -> bool:
        """Delete a warehouse"""
        warehouse = db.query(Warehouse).filter(
            and_(
                Warehouse.id == warehouse_id,
                Warehouse.account_id == account_id
            )
        ).first()

        if not warehouse:
            return False

        db.delete(warehouse)
        db.commit()
        return True

    # ==================== Storage Bin Methods ====================

    @staticmethod
    def create_storage_bin(
        db: Session,
        bin_data: StorageBinCreate,
        account_id: int
    ) -> Optional[StorageBin]:
        """Create a storage bin (verify warehouse ownership)"""
        # Verify warehouse belongs to account
        warehouse = db.query(Warehouse).filter(
            and_(
                Warehouse.id == bin_data.warehouse_id,
                Warehouse.account_id == account_id
            )
        ).first()

        if not warehouse:
            return None

        storage_bin = StorageBin(**bin_data.model_dump())
        db.add(storage_bin)
        db.commit()
        db.refresh(storage_bin)
        return storage_bin

    @staticmethod
    def get_warehouse_bins(
        db: Session,
        warehouse_id: int,
        account_id: int,
        is_active: Optional[bool] = None
    ) -> List[StorageBin]:
        """Get all bins in a warehouse"""
        # Verify warehouse ownership
        warehouse = db.query(Warehouse).filter(
            and_(
                Warehouse.id == warehouse_id,
                Warehouse.account_id == account_id
            )
        ).first()

        if not warehouse:
            return []

        query = db.query(StorageBin).filter(StorageBin.warehouse_id == warehouse_id)

        if is_active is not None:
            query = query.filter(StorageBin.is_active == is_active)

        return query.all()

    @staticmethod
    def update_storage_bin(
        db: Session,
        bin_id: int,
        account_id: int,
        update_data: StorageBinUpdate
    ) -> Optional[StorageBin]:
        """Update a storage bin"""
        # Join to verify warehouse ownership
        storage_bin = db.query(StorageBin).join(Warehouse).filter(
            and_(
                StorageBin.id == bin_id,
                Warehouse.account_id == account_id
            )
        ).first()

        if not storage_bin:
            return None

        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(storage_bin, field, value)

        db.commit()
        db.refresh(storage_bin)
        return storage_bin

    @staticmethod
    def delete_storage_bin(db: Session, bin_id: int, account_id: int) -> bool:
        """Delete a storage bin"""
        storage_bin = db.query(StorageBin).join(Warehouse).filter(
            and_(
                StorageBin.id == bin_id,
                Warehouse.account_id == account_id
            )
        ).first()

        if not storage_bin:
            return False

        db.delete(storage_bin)
        db.commit()
        return True

    # ==================== Inventory Item Methods ====================

    @staticmethod
    def create_inventory_item(
        db: Session,
        item_data: InventoryItemCreate,
        account_id: int,
        performed_by_account_id: Optional[int] = None
    ) -> InventoryItem:
        """Create a new inventory item and log initial transaction"""
        # Calculate total value
        item_dict = item_data.model_dump()

        item = InventoryItem(**item_dict, account_id=account_id)

        # Calculate initial total value
        if item.cost_per_unit is not None:
            item.total_value = float(item.current_quantity) * float(item.cost_per_unit)

        db.add(item)
        db.flush()  # Get the ID without committing

        # Log initial transaction
        transaction = InventoryTransaction(
            inventory_item_id=item.id,
            transaction_type=TransactionTypeEnum.ADD,
            quantity_change=item.current_quantity,
            quantity_before=0,
            quantity_after=item.current_quantity,
            cost_per_unit=item.cost_per_unit,
            total_cost=item.total_value,
            performed_by_account_id=performed_by_account_id or account_id,
            notes="Initial inventory creation"
        )
        db.add(transaction)

        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def get_inventory_items(
        db: Session,
        account_id: int,
        status: Optional[InventoryStatusEnum] = None,
        warehouse_id: Optional[int] = None,
        inventory_type_id: Optional[int] = None,
        batch_number: Optional[str] = None,
        low_stock_only: bool = False,
        expiring_soon: Optional[int] = None,  # Days
        skip: int = 0,
        limit: int = 100
    ) -> List[InventoryItem]:
        """Get inventory items with various filters"""
        query = db.query(InventoryItem).filter(InventoryItem.account_id == account_id)

        if status:
            query = query.filter(InventoryItem.status == status)

        if warehouse_id:
            query = query.filter(InventoryItem.warehouse_id == warehouse_id)

        if inventory_type_id:
            query = query.filter(InventoryItem.inventory_type_id == inventory_type_id)

        if batch_number:
            query = query.filter(InventoryItem.batch_number == batch_number)

        if low_stock_only:
            query = query.filter(
                and_(
                    InventoryItem.minimum_quantity != None,
                    InventoryItem.current_quantity <= InventoryItem.minimum_quantity
                )
            )

        if expiring_soon:
            expiry_threshold = datetime.now(timezone.utc) + timedelta(days=expiring_soon)
            query = query.filter(
                and_(
                    InventoryItem.expiry_date != None,
                    InventoryItem.expiry_date <= expiry_threshold
                )
            )

        return query.offset(skip).limit(limit).all()

    @staticmethod
    def get_inventory_item(db: Session, item_id: int, account_id: int) -> Optional[InventoryItem]:
        """Get a specific inventory item"""
        return db.query(InventoryItem).filter(
            and_(
                InventoryItem.id == item_id,
                InventoryItem.account_id == account_id
            )
        ).first()

    @staticmethod
    def update_inventory_item(
        db: Session,
        item_id: int,
        account_id: int,
        update_data: InventoryItemUpdate,
        performed_by_account_id: Optional[int] = None
    ) -> Optional[InventoryItem]:
        """Update an inventory item and log transaction if quantity changes"""
        item = db.query(InventoryItem).filter(
            and_(
                InventoryItem.id == item_id,
                InventoryItem.account_id == account_id
            )
        ).first()

        if not item:
            return None

        update_dict = update_data.model_dump(exclude_unset=True)

        # Track quantity change
        quantity_changed = False
        old_quantity = item.current_quantity

        for field, value in update_dict.items():
            if field == "current_quantity" and value != old_quantity:
                quantity_changed = True
            setattr(item, field, value)

        # Recalculate total value if cost or quantity changed
        if "current_quantity" in update_dict or "cost_per_unit" in update_dict:
            if item.cost_per_unit is not None:
                item.total_value = float(item.current_quantity) * float(item.cost_per_unit)

        # Log transaction if quantity changed
        if quantity_changed:
            quantity_change = item.current_quantity - old_quantity
            transaction_type = TransactionTypeEnum.ADD if quantity_change > 0 else TransactionTypeEnum.REMOVE

            transaction = InventoryTransaction(
                inventory_item_id=item.id,
                transaction_type=transaction_type,
                quantity_change=quantity_change,
                quantity_before=old_quantity,
                quantity_after=item.current_quantity,
                cost_per_unit=item.cost_per_unit,
                performed_by_account_id=performed_by_account_id or account_id,
                notes="Inventory quantity updated"
            )
            db.add(transaction)

        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def delete_inventory_item(db: Session, item_id: int, account_id: int) -> bool:
        """Delete an inventory item"""
        item = db.query(InventoryItem).filter(
            and_(
                InventoryItem.id == item_id,
                InventoryItem.account_id == account_id
            )
        ).first()

        if not item:
            return False

        db.delete(item)
        db.commit()
        return True

    # ==================== Transaction Methods ====================

    @staticmethod
    def create_transaction(
        db: Session,
        transaction_data: InventoryTransactionCreate,
        account_id: int,
        performed_by_account_id: Optional[int] = None
    ) -> Optional[InventoryTransaction]:
        """Create an inventory transaction and update item quantity"""
        # Verify item ownership
        item = db.query(InventoryItem).filter(
            and_(
                InventoryItem.id == transaction_data.inventory_item_id,
                InventoryItem.account_id == account_id
            )
        ).first()

        if not item:
            return None

        # Store old quantity
        old_quantity = item.current_quantity
        new_quantity = old_quantity + transaction_data.quantity_change

        # Prevent negative inventory
        if new_quantity < 0:
            raise ValueError("Transaction would result in negative inventory")

        # Update item quantity
        item.current_quantity = new_quantity
        item.calculate_total_value()

        # Create transaction record
        transaction = InventoryTransaction(
            **transaction_data.model_dump(),
            quantity_before=old_quantity,
            quantity_after=new_quantity,
            performed_by_account_id=performed_by_account_id or account_id
        )

        # Calculate total cost if cost_per_unit provided
        if transaction.cost_per_unit:
            transaction.total_cost = abs(float(transaction.quantity_change)) * float(transaction.cost_per_unit)

        db.add(transaction)
        db.commit()
        db.refresh(transaction)
        return transaction

    @staticmethod
    def get_item_transactions(
        db: Session,
        item_id: int,
        account_id: int,
        skip: int = 0,
        limit: int = 100
    ) -> List[InventoryTransaction]:
        """Get transaction history for an item"""
        # Verify item ownership
        item = db.query(InventoryItem).filter(
            and_(
                InventoryItem.id == item_id,
                InventoryItem.account_id == account_id
            )
        ).first()

        if not item:
            return []

        # Query with eager loading of relationships
        transactions = db.query(InventoryTransaction).options(
            joinedload(InventoryTransaction.inventory_item).joinedload(InventoryItem.inventory_type),
            joinedload(InventoryTransaction.inventory_item).joinedload(InventoryItem.warehouse)
        ).filter(
            InventoryTransaction.inventory_item_id == item_id
        ).order_by(InventoryTransaction.transaction_date.desc()).offset(skip).limit(limit).all()

        # Populate nested item information
        for transaction in transactions:
            if transaction.inventory_item:
                transaction.item_name = transaction.inventory_item.item_name
                transaction.item_sku = transaction.inventory_item.sku
                transaction.item_unit = transaction.inventory_item.unit
                if transaction.inventory_item.inventory_type:
                    transaction.inventory_type_name = transaction.inventory_item.inventory_type.type_name
                if transaction.inventory_item.warehouse:
                    transaction.warehouse_name = transaction.inventory_item.warehouse.warehouse_name

        return transactions

    @staticmethod
    def get_all_transactions(
        db: Session,
        account_id: int,
        transaction_type: Optional[TransactionTypeEnum] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[InventoryTransaction]:
        """Get all transaction history for an account with optional filters"""
        # Query transactions for all items owned by the account with eager loading
        query = db.query(InventoryTransaction).options(
            joinedload(InventoryTransaction.inventory_item).joinedload(InventoryItem.inventory_type),
            joinedload(InventoryTransaction.inventory_item).joinedload(InventoryItem.warehouse)
        ).join(InventoryItem).filter(
            InventoryItem.account_id == account_id
        )

        # Apply optional filters
        if transaction_type:
            query = query.filter(InventoryTransaction.transaction_type == transaction_type)

        if start_date:
            query = query.filter(InventoryTransaction.transaction_date >= start_date)

        if end_date:
            query = query.filter(InventoryTransaction.transaction_date <= end_date)

        transactions = query.order_by(InventoryTransaction.transaction_date.desc()).offset(skip).limit(limit).all()

        # Populate nested item information
        for transaction in transactions:
            if transaction.inventory_item:
                transaction.item_name = transaction.inventory_item.item_name
                transaction.item_sku = transaction.inventory_item.sku
                transaction.item_unit = transaction.inventory_item.unit
                if transaction.inventory_item.inventory_type:
                    transaction.inventory_type_name = transaction.inventory_item.inventory_type.type_name
                if transaction.inventory_item.warehouse:
                    transaction.warehouse_name = transaction.inventory_item.warehouse.warehouse_name

        return transactions

    # ==================== Alert Methods ====================

    @staticmethod
    def get_low_stock_alerts(db: Session, account_id: int) -> List[LowStockAlert]:
        """Get items with low stock (current_quantity <= minimum_quantity)"""
        items = db.query(InventoryItem).filter(
            and_(
                InventoryItem.account_id == account_id,
                InventoryItem.minimum_quantity != None,
                InventoryItem.current_quantity <= InventoryItem.minimum_quantity,
                InventoryItem.status == InventoryStatusEnum.AVAILABLE
            )
        ).all()

        alerts = []
        for item in items:
            warehouse_name = item.warehouse.warehouse_name if item.warehouse else None
            bin_code = item.storage_bin.bin_code if item.storage_bin else None

            alerts.append(LowStockAlert(
                item_id=item.id,
                item_name=item.item_name,
                current_quantity=item.current_quantity,
                minimum_quantity=item.minimum_quantity,
                unit=item.unit,
                warehouse_name=warehouse_name,
                bin_code=bin_code
            ))

        return alerts

    @staticmethod
    def get_expiring_items(
        db: Session,
        account_id: int,
        days_threshold: int = 7
    ) -> List[ExpiringItemAlert]:
        """Get items expiring within specified days"""
        expiry_threshold = datetime.now(timezone.utc) + timedelta(days=days_threshold)

        items = db.query(InventoryItem).filter(
            and_(
                InventoryItem.account_id == account_id,
                InventoryItem.expiry_date != None,
                InventoryItem.expiry_date <= expiry_threshold,
                InventoryItem.status.in_([InventoryStatusEnum.AVAILABLE, InventoryStatusEnum.RESERVED])
            )
        ).all()

        alerts = []
        now = datetime.now(timezone.utc)

        for item in items:
            days_until_expiry = (item.expiry_date - now).days
            warehouse_name = item.warehouse.warehouse_name if item.warehouse else None

            alerts.append(ExpiringItemAlert(
                item_id=item.id,
                item_name=item.item_name,
                current_quantity=item.current_quantity,
                unit=item.unit,
                expiry_date=item.expiry_date,
                days_until_expiry=days_until_expiry,
                batch_number=item.batch_number,
                warehouse_name=warehouse_name
            ))

        return alerts

    @staticmethod
    def mark_expired_items(db: Session, account_id: int) -> int:
        """Mark all expired items as EXPIRED status"""
        now = datetime.now(timezone.utc)

        expired_items = db.query(InventoryItem).filter(
            and_(
                InventoryItem.account_id == account_id,
                InventoryItem.expiry_date != None,
                InventoryItem.expiry_date < now,
                InventoryItem.status != InventoryStatusEnum.EXPIRED
            )
        ).all()

        count = 0
        for item in expired_items:
            item.status = InventoryStatusEnum.EXPIRED

            # Log transaction
            transaction = InventoryTransaction(
                inventory_item_id=item.id,
                transaction_type=TransactionTypeEnum.SPOILAGE,
                quantity_change=-item.current_quantity,
                quantity_before=item.current_quantity,
                quantity_after=0,
                performed_by_account_id=account_id,
                notes=f"Automatically marked as expired on {now.isoformat()}"
            )
            db.add(transaction)

            # Set quantity to 0
            item.current_quantity = 0
            item.calculate_total_value()
            count += 1

        if count > 0:
            db.commit()

        return count

    # ==================== Reporting Methods ====================

    @staticmethod
    def get_inventory_valuation(db: Session, account_id: int) -> InventoryValuationReport:
        """Calculate total inventory valuation"""
        items = db.query(InventoryItem).filter(
            and_(
                InventoryItem.account_id == account_id,
                InventoryItem.status.in_([InventoryStatusEnum.AVAILABLE, InventoryStatusEnum.RESERVED])
            )
        ).all()

        total_items = len(items)
        total_quantity = sum(item.current_quantity for item in items)
        total_value = sum(item.total_value or 0 for item in items)

        # Group by category
        by_category = {}
        for item in items:
            category = item.inventory_type.category.value if item.inventory_type else "unknown"
            if category not in by_category:
                by_category[category] = Decimal(0)
            by_category[category] += item.total_value or Decimal(0)

        # Group by status
        by_status = {}
        for item in items:
            status = item.status.value
            if status not in by_status:
                by_status[status] = 0
            by_status[status] += 1

        return InventoryValuationReport(
            total_items=total_items,
            total_quantity=total_quantity,
            total_value=total_value,
            currency="ZAR",
            by_category=by_category,
            by_status=by_status
        )

    @staticmethod
    def get_items_by_batch(
        db: Session,
        account_id: int,
        batch_number: str
    ) -> List[InventoryItem]:
        """Get all items from a specific batch (for FIFO and traceability)"""
        return db.query(InventoryItem).filter(
            and_(
                InventoryItem.account_id == account_id,
                InventoryItem.batch_number == batch_number
            )
        ).order_by(InventoryItem.acquisition_date).all()

    @staticmethod
    def transfer_item(
        db: Session,
        item_id: int,
        account_id: int,
        to_warehouse_id: int,
        to_bin_id: Optional[int] = None,
        performed_by_account_id: Optional[int] = None
    ) -> Optional[InventoryItem]:
        """Transfer an item to a different warehouse/bin"""
        item = db.query(InventoryItem).filter(
            and_(
                InventoryItem.id == item_id,
                InventoryItem.account_id == account_id
            )
        ).first()

        if not item:
            return None

        # Verify new warehouse ownership
        new_warehouse = db.query(Warehouse).filter(
            and_(
                Warehouse.id == to_warehouse_id,
                Warehouse.account_id == account_id
            )
        ).first()

        if not new_warehouse:
            raise ValueError("New warehouse not found or not owned by account")

        # Store old location
        from_warehouse_id = item.warehouse_id

        # Update location
        item.warehouse_id = to_warehouse_id
        item.bin_id = to_bin_id

        # Log transfer transaction
        transaction = InventoryTransaction(
            inventory_item_id=item.id,
            transaction_type=TransactionTypeEnum.TRANSFER,
            quantity_change=0,
            quantity_before=item.current_quantity,
            quantity_after=item.current_quantity,
            from_location_id=from_warehouse_id,
            to_location_id=to_warehouse_id,
            performed_by_account_id=performed_by_account_id or account_id,
            notes=f"Transferred from warehouse {from_warehouse_id} to {to_warehouse_id}"
        )
        db.add(transaction)

        db.commit()
        db.refresh(item)
        return item
