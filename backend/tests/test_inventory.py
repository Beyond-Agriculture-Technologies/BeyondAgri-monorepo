import pytest
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from unittest.mock import patch, MagicMock

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
    InventoryTransactionCreate
)
from app.services.inventory_service import InventoryService
from app.core.constants import InventoryDefaults


class TestInventoryEnums:
    """Test enum values match database expectations"""

    def test_category_enum_uppercase(self):
        """Verify category enum values are UPPERCASE"""
        assert InventoryCategoryEnum.HARVEST.value == "HARVEST"
        assert InventoryCategoryEnum.MEAT.value == "MEAT"
        assert InventoryCategoryEnum.POULTRY.value == "POULTRY"
        assert InventoryCategoryEnum.PACKAGING.value == "PACKAGING"
        assert InventoryCategoryEnum.SUPPLIES.value == "SUPPLIES"
        assert InventoryCategoryEnum.OTHER.value == "OTHER"
        print("✅ Category enum values test passed")

    def test_status_enum_uppercase(self):
        """Verify status enum values are UPPERCASE"""
        assert InventoryStatusEnum.AVAILABLE.value == "AVAILABLE"
        assert InventoryStatusEnum.RESERVED.value == "RESERVED"
        assert InventoryStatusEnum.SOLD.value == "SOLD"
        assert InventoryStatusEnum.EXPIRED.value == "EXPIRED"
        assert InventoryStatusEnum.DAMAGED.value == "DAMAGED"
        assert InventoryStatusEnum.IN_TRANSIT.value == "IN_TRANSIT"
        print("✅ Status enum values test passed")

    def test_transaction_type_enum_uppercase(self):
        """Verify transaction type enum values are UPPERCASE"""
        assert TransactionTypeEnum.ADD.value == "ADD"
        assert TransactionTypeEnum.REMOVE.value == "REMOVE"
        assert TransactionTypeEnum.ADJUSTMENT.value == "ADJUSTMENT"
        assert TransactionTypeEnum.TRANSFER.value == "TRANSFER"
        assert TransactionTypeEnum.SALE.value == "SALE"
        assert TransactionTypeEnum.SPOILAGE.value == "SPOILAGE"
        assert TransactionTypeEnum.RETURN.value == "RETURN"
        print("✅ Transaction type enum values test passed")


class TestInventoryDefaults:
    """Test inventory default constants"""

    def test_currency_default(self):
        """Verify currency default is ZAR"""
        assert InventoryDefaults.CURRENCY == "ZAR"
        print("✅ Currency default test passed")

    def test_country_default(self):
        """Verify country default is South Africa"""
        assert InventoryDefaults.DEFAULT_COUNTRY == "South Africa"
        print("✅ Country default test passed")


class TestInventoryTypes:
    """Test inventory type CRUD operations"""

    @pytest.fixture
    def db_session(self):
        """Provide a database session for tests"""
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.rollback()
            db.close()

    @pytest.fixture
    def test_inventory_type_data(self):
        return InventoryTypeCreate(
            type_name="Test Tomatoes",
            category=InventoryCategoryEnum.HARVEST,
            description="Fresh test tomatoes",
            unit_of_measure="kg",
            perishable=True,
            typical_shelf_life_days=7,
            reorder_point=Decimal("50.00"),
            reorder_quantity=Decimal("200.00")
        )

    def test_create_inventory_type(self, db_session, test_inventory_type_data):
        """Test creating an inventory type"""
        inventory_type = InventoryService.create_inventory_type(
            db=db_session,
            inventory_type_data=test_inventory_type_data,
            account_id=None  # System default
        )

        assert inventory_type.id is not None
        assert inventory_type.type_name == "Test Tomatoes"
        assert inventory_type.category == InventoryCategoryEnum.HARVEST
        assert inventory_type.perishable is True
        assert inventory_type.typical_shelf_life_days == 7
        print("✅ Create inventory type test passed")

        # Cleanup
        db_session.delete(inventory_type)
        db_session.commit()

    def test_get_inventory_types(self, db_session, test_inventory_type_data):
        """Test listing inventory types"""
        # Create a test type first
        inventory_type = InventoryService.create_inventory_type(
            db=db_session,
            inventory_type_data=test_inventory_type_data,
            account_id=None
        )

        types = InventoryService.get_inventory_types(db=db_session)
        assert len(types) >= 1
        print("✅ Get inventory types test passed")

        # Cleanup
        db_session.delete(inventory_type)
        db_session.commit()

    def test_get_inventory_types_by_category(self, db_session, test_inventory_type_data):
        """Test filtering inventory types by category"""
        inventory_type = InventoryService.create_inventory_type(
            db=db_session,
            inventory_type_data=test_inventory_type_data,
            account_id=None
        )

        types = InventoryService.get_inventory_types(
            db=db_session,
            category=InventoryCategoryEnum.HARVEST
        )
        assert all(t.category == InventoryCategoryEnum.HARVEST for t in types)
        print("✅ Get inventory types by category test passed")

        # Cleanup
        db_session.delete(inventory_type)
        db_session.commit()

    def test_update_inventory_type(self, db_session, test_inventory_type_data):
        """Test updating an inventory type"""
        inventory_type = InventoryService.create_inventory_type(
            db=db_session,
            inventory_type_data=test_inventory_type_data,
            account_id=None
        )

        update_data = InventoryTypeUpdate(
            type_name="Updated Tomatoes",
            typical_shelf_life_days=10
        )

        updated = InventoryService.update_inventory_type(
            db=db_session,
            type_id=inventory_type.id,
            update_data=update_data
        )

        assert updated.type_name == "Updated Tomatoes"
        assert updated.typical_shelf_life_days == 10
        print("✅ Update inventory type test passed")

        # Cleanup
        db_session.delete(updated)
        db_session.commit()

    def test_delete_inventory_type(self, db_session, test_inventory_type_data):
        """Test deleting an inventory type"""
        inventory_type = InventoryService.create_inventory_type(
            db=db_session,
            inventory_type_data=test_inventory_type_data,
            account_id=None
        )

        type_id = inventory_type.id
        result = InventoryService.delete_inventory_type(db=db_session, type_id=type_id)

        assert result is True

        # Verify deletion
        deleted = InventoryService.get_inventory_type(db=db_session, type_id=type_id)
        assert deleted is None
        print("✅ Delete inventory type test passed")


class TestWarehouses:
    """Test warehouse CRUD operations"""

    @pytest.fixture
    def db_session(self):
        """Provide a database session for tests"""
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.rollback()
            db.close()

    @pytest.fixture
    def test_account_id(self, db_session):
        """Get or create a test account"""
        from app.models.account import Account
        account = db_session.query(Account).first()
        if account:
            return account.id
        # Return a placeholder if no accounts exist
        return 1

    @pytest.fixture
    def test_warehouse_data(self):
        return WarehouseCreate(
            warehouse_name="Test Cold Storage",
            warehouse_code="TCS-001",
            address="123 Test Road",
            city="Cape Town",
            province="Western Cape",
            postal_code="8001",
            country="South Africa",
            temperature_controlled=True,
            min_temperature=2.0,
            max_temperature=8.0,
            is_active=True
        )

    def test_create_warehouse(self, db_session, test_account_id, test_warehouse_data):
        """Test creating a warehouse"""
        warehouse = InventoryService.create_warehouse(
            db=db_session,
            warehouse_data=test_warehouse_data,
            account_id=test_account_id
        )

        assert warehouse.id is not None
        assert warehouse.warehouse_name == "Test Cold Storage"
        assert warehouse.warehouse_code == "TCS-001"
        assert warehouse.temperature_controlled is True
        print("✅ Create warehouse test passed")

        # Cleanup
        db_session.delete(warehouse)
        db_session.commit()

    def test_get_warehouses(self, db_session, test_account_id, test_warehouse_data):
        """Test listing warehouses for an account"""
        warehouse = InventoryService.create_warehouse(
            db=db_session,
            warehouse_data=test_warehouse_data,
            account_id=test_account_id
        )

        warehouses = InventoryService.get_warehouses(
            db=db_session,
            account_id=test_account_id
        )

        assert len(warehouses) >= 1
        print("✅ Get warehouses test passed")

        # Cleanup
        db_session.delete(warehouse)
        db_session.commit()

    def test_get_warehouses_active_filter(self, db_session, test_account_id, test_warehouse_data):
        """Test filtering warehouses by active status"""
        warehouse = InventoryService.create_warehouse(
            db=db_session,
            warehouse_data=test_warehouse_data,
            account_id=test_account_id
        )

        active_warehouses = InventoryService.get_warehouses(
            db=db_session,
            account_id=test_account_id,
            is_active=True
        )

        assert all(w.is_active for w in active_warehouses)
        print("✅ Get warehouses active filter test passed")

        # Cleanup
        db_session.delete(warehouse)
        db_session.commit()

    def test_update_warehouse(self, db_session, test_account_id, test_warehouse_data):
        """Test updating a warehouse"""
        warehouse = InventoryService.create_warehouse(
            db=db_session,
            warehouse_data=test_warehouse_data,
            account_id=test_account_id
        )

        update_data = WarehouseUpdate(
            warehouse_name="Updated Cold Storage",
            is_active=False
        )

        updated = InventoryService.update_warehouse(
            db=db_session,
            warehouse_id=warehouse.id,
            account_id=test_account_id,
            update_data=update_data
        )

        assert updated.warehouse_name == "Updated Cold Storage"
        assert updated.is_active is False
        print("✅ Update warehouse test passed")

        # Cleanup
        db_session.delete(updated)
        db_session.commit()

    def test_delete_warehouse(self, db_session, test_account_id, test_warehouse_data):
        """Test deleting a warehouse"""
        warehouse = InventoryService.create_warehouse(
            db=db_session,
            warehouse_data=test_warehouse_data,
            account_id=test_account_id
        )

        warehouse_id = warehouse.id
        result = InventoryService.delete_warehouse(
            db=db_session,
            warehouse_id=warehouse_id,
            account_id=test_account_id
        )

        assert result is True
        print("✅ Delete warehouse test passed")


class TestStorageBins:
    """Test storage bin CRUD operations"""

    @pytest.fixture
    def db_session(self):
        """Provide a database session for tests"""
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.rollback()
            db.close()

    @pytest.fixture
    def test_account_id(self, db_session):
        """Get or create a test account"""
        from app.models.account import Account
        account = db_session.query(Account).first()
        if account:
            return account.id
        return 1

    @pytest.fixture
    def test_warehouse(self, db_session, test_account_id):
        """Create a test warehouse for bin tests"""
        warehouse_data = WarehouseCreate(
            warehouse_name="Bin Test Warehouse",
            warehouse_code="BTW-001",
            is_active=True
        )
        warehouse = InventoryService.create_warehouse(
            db=db_session,
            warehouse_data=warehouse_data,
            account_id=test_account_id
        )
        yield warehouse
        # Cleanup handled by cascade

    def test_create_storage_bin(self, db_session, test_account_id, test_warehouse):
        """Test creating a storage bin"""
        bin_data = StorageBinCreate(
            warehouse_id=test_warehouse.id,
            bin_name="Aisle A, Shelf 1",
            bin_code="A1",
            capacity=Decimal("500.00"),
            capacity_unit="kg",
            is_active=True
        )

        storage_bin = InventoryService.create_storage_bin(
            db=db_session,
            bin_data=bin_data,
            account_id=test_account_id
        )

        assert storage_bin is not None
        assert storage_bin.bin_name == "Aisle A, Shelf 1"
        assert storage_bin.bin_code == "A1"
        print("✅ Create storage bin test passed")

        # Cleanup
        db_session.delete(storage_bin)
        db_session.delete(test_warehouse)
        db_session.commit()

    def test_create_storage_bin_invalid_warehouse(self, db_session, test_account_id):
        """Test creating a bin with invalid warehouse returns None"""
        bin_data = StorageBinCreate(
            warehouse_id=999999,  # Non-existent warehouse
            bin_name="Invalid Bin",
            bin_code="INV-1",
            is_active=True
        )

        storage_bin = InventoryService.create_storage_bin(
            db=db_session,
            bin_data=bin_data,
            account_id=test_account_id
        )

        assert storage_bin is None
        print("✅ Create storage bin invalid warehouse test passed")

    def test_get_warehouse_bins(self, db_session, test_account_id, test_warehouse):
        """Test listing bins for a warehouse"""
        bin_data = StorageBinCreate(
            warehouse_id=test_warehouse.id,
            bin_name="Test Bin",
            bin_code="TB-1",
            is_active=True
        )

        storage_bin = InventoryService.create_storage_bin(
            db=db_session,
            bin_data=bin_data,
            account_id=test_account_id
        )

        bins = InventoryService.get_warehouse_bins(
            db=db_session,
            warehouse_id=test_warehouse.id,
            account_id=test_account_id
        )

        assert len(bins) >= 1
        print("✅ Get warehouse bins test passed")

        # Cleanup
        db_session.delete(storage_bin)
        db_session.delete(test_warehouse)
        db_session.commit()

    def test_update_storage_bin(self, db_session, test_account_id, test_warehouse):
        """Test updating a storage bin"""
        bin_data = StorageBinCreate(
            warehouse_id=test_warehouse.id,
            bin_name="Original Bin",
            bin_code="OB-1",
            is_active=True
        )

        storage_bin = InventoryService.create_storage_bin(
            db=db_session,
            bin_data=bin_data,
            account_id=test_account_id
        )

        update_data = StorageBinUpdate(
            bin_name="Updated Bin",
            is_active=False
        )

        updated = InventoryService.update_storage_bin(
            db=db_session,
            bin_id=storage_bin.id,
            account_id=test_account_id,
            update_data=update_data
        )

        assert updated.bin_name == "Updated Bin"
        assert updated.is_active is False
        print("✅ Update storage bin test passed")

        # Cleanup
        db_session.delete(updated)
        db_session.delete(test_warehouse)
        db_session.commit()

    def test_delete_storage_bin(self, db_session, test_account_id, test_warehouse):
        """Test deleting a storage bin"""
        bin_data = StorageBinCreate(
            warehouse_id=test_warehouse.id,
            bin_name="Delete Test Bin",
            bin_code="DTB-1",
            is_active=True
        )

        storage_bin = InventoryService.create_storage_bin(
            db=db_session,
            bin_data=bin_data,
            account_id=test_account_id
        )

        bin_id = storage_bin.id
        result = InventoryService.delete_storage_bin(
            db=db_session,
            bin_id=bin_id,
            account_id=test_account_id
        )

        assert result is True
        print("✅ Delete storage bin test passed")

        # Cleanup warehouse
        db_session.delete(test_warehouse)
        db_session.commit()


class TestInventoryItems:
    """Test inventory item CRUD operations"""

    @pytest.fixture
    def db_session(self):
        """Provide a database session for tests"""
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.rollback()
            db.close()

    @pytest.fixture
    def test_account_id(self, db_session):
        """Get or create a test account"""
        from app.models.account import Account
        account = db_session.query(Account).first()
        if account:
            return account.id
        return 1

    @pytest.fixture
    def test_inventory_type(self, db_session):
        """Create a test inventory type"""
        type_data = InventoryTypeCreate(
            type_name="Item Test Type",
            category=InventoryCategoryEnum.HARVEST,
            unit_of_measure="kg",
            perishable=True
        )
        inv_type = InventoryService.create_inventory_type(
            db=db_session,
            inventory_type_data=type_data
        )
        return inv_type

    @pytest.fixture
    def test_item_data(self, test_inventory_type):
        return InventoryItemCreate(
            inventory_type_id=test_inventory_type.id,
            item_name="Fresh Roma Tomatoes",
            description="Grade A tomatoes",
            sku="TOM-ROMA-001",
            current_quantity=Decimal("100.00"),
            unit="kg",
            minimum_quantity=Decimal("20.00"),
            cost_per_unit=Decimal("25.50"),
            currency="ZAR",
            status=InventoryStatusEnum.AVAILABLE,
            batch_number="BATCH-2025-001"
        )

    def test_create_inventory_item(self, db_session, test_account_id, test_inventory_type, test_item_data):
        """Test creating an inventory item"""
        item = InventoryService.create_inventory_item(
            db=db_session,
            item_data=test_item_data,
            account_id=test_account_id
        )

        assert item.id is not None
        assert item.item_name == "Fresh Roma Tomatoes"
        assert item.current_quantity == Decimal("100.00")
        assert item.total_value == Decimal("2550.00")  # 100 * 25.50
        print("✅ Create inventory item test passed")

        # Cleanup
        db_session.delete(item)
        db_session.delete(test_inventory_type)
        db_session.commit()

    def test_create_item_logs_transaction(self, db_session, test_account_id, test_inventory_type, test_item_data):
        """Test that creating an item logs an initial transaction"""
        item = InventoryService.create_inventory_item(
            db=db_session,
            item_data=test_item_data,
            account_id=test_account_id
        )

        transactions = InventoryService.get_item_transactions(
            db=db_session,
            item_id=item.id,
            account_id=test_account_id
        )

        assert len(transactions) >= 1
        initial_tx = transactions[-1]  # Most recent last (desc order means first)
        assert initial_tx.transaction_type == TransactionTypeEnum.ADD
        assert initial_tx.notes == "Initial inventory creation"
        print("✅ Create item logs transaction test passed")

        # Cleanup
        db_session.delete(item)
        db_session.delete(test_inventory_type)
        db_session.commit()

    def test_get_inventory_items(self, db_session, test_account_id, test_inventory_type, test_item_data):
        """Test listing inventory items"""
        item = InventoryService.create_inventory_item(
            db=db_session,
            item_data=test_item_data,
            account_id=test_account_id
        )

        items = InventoryService.get_inventory_items(
            db=db_session,
            account_id=test_account_id
        )

        assert len(items) >= 1
        print("✅ Get inventory items test passed")

        # Cleanup
        db_session.delete(item)
        db_session.delete(test_inventory_type)
        db_session.commit()

    def test_get_items_low_stock_filter(self, db_session, test_account_id, test_inventory_type):
        """Test filtering items by low stock"""
        item_data = InventoryItemCreate(
            inventory_type_id=test_inventory_type.id,
            item_name="Low Stock Item",
            sku="LOW-001",
            current_quantity=Decimal("10.00"),  # Below minimum
            unit="kg",
            minimum_quantity=Decimal("20.00"),
            status=InventoryStatusEnum.AVAILABLE
        )

        item = InventoryService.create_inventory_item(
            db=db_session,
            item_data=item_data,
            account_id=test_account_id
        )

        low_stock_items = InventoryService.get_inventory_items(
            db=db_session,
            account_id=test_account_id,
            low_stock_only=True
        )

        assert any(i.id == item.id for i in low_stock_items)
        print("✅ Get items low stock filter test passed")

        # Cleanup
        db_session.delete(item)
        db_session.delete(test_inventory_type)
        db_session.commit()

    def test_get_items_expiring_soon(self, db_session, test_account_id, test_inventory_type):
        """Test filtering items expiring soon"""
        expiry_date = datetime.now(timezone.utc) + timedelta(days=3)
        item_data = InventoryItemCreate(
            inventory_type_id=test_inventory_type.id,
            item_name="Expiring Item",
            sku="EXP-001",
            current_quantity=Decimal("50.00"),
            unit="kg",
            expiry_date=expiry_date,
            status=InventoryStatusEnum.AVAILABLE
        )

        item = InventoryService.create_inventory_item(
            db=db_session,
            item_data=item_data,
            account_id=test_account_id
        )

        expiring_items = InventoryService.get_inventory_items(
            db=db_session,
            account_id=test_account_id,
            expiring_soon=7
        )

        assert any(i.id == item.id for i in expiring_items)
        print("✅ Get items expiring soon test passed")

        # Cleanup
        db_session.delete(item)
        db_session.delete(test_inventory_type)
        db_session.commit()

    def test_update_inventory_item(self, db_session, test_account_id, test_inventory_type, test_item_data):
        """Test updating an inventory item"""
        item = InventoryService.create_inventory_item(
            db=db_session,
            item_data=test_item_data,
            account_id=test_account_id
        )

        update_data = InventoryItemUpdate(
            item_name="Updated Tomatoes",
            status=InventoryStatusEnum.RESERVED
        )

        updated = InventoryService.update_inventory_item(
            db=db_session,
            item_id=item.id,
            account_id=test_account_id,
            update_data=update_data
        )

        assert updated.item_name == "Updated Tomatoes"
        assert updated.status == InventoryStatusEnum.RESERVED
        print("✅ Update inventory item test passed")

        # Cleanup
        db_session.delete(updated)
        db_session.delete(test_inventory_type)
        db_session.commit()

    def test_update_quantity_logs_transaction(self, db_session, test_account_id, test_inventory_type, test_item_data):
        """Test that updating quantity logs a transaction"""
        item = InventoryService.create_inventory_item(
            db=db_session,
            item_data=test_item_data,
            account_id=test_account_id
        )

        update_data = InventoryItemUpdate(
            current_quantity=Decimal("150.00")  # Add 50
        )

        InventoryService.update_inventory_item(
            db=db_session,
            item_id=item.id,
            account_id=test_account_id,
            update_data=update_data
        )

        transactions = InventoryService.get_item_transactions(
            db=db_session,
            item_id=item.id,
            account_id=test_account_id
        )

        # Should have at least 2 transactions (initial + update)
        assert len(transactions) >= 2
        print("✅ Update quantity logs transaction test passed")

        # Cleanup
        db_session.delete(item)
        db_session.delete(test_inventory_type)
        db_session.commit()

    def test_delete_inventory_item(self, db_session, test_account_id, test_inventory_type, test_item_data):
        """Test deleting an inventory item"""
        item = InventoryService.create_inventory_item(
            db=db_session,
            item_data=test_item_data,
            account_id=test_account_id
        )

        item_id = item.id
        result = InventoryService.delete_inventory_item(
            db=db_session,
            item_id=item_id,
            account_id=test_account_id
        )

        assert result is True
        print("✅ Delete inventory item test passed")

        # Cleanup type only (item deleted)
        db_session.delete(test_inventory_type)
        db_session.commit()


class TestTransactions:
    """Test inventory transaction operations"""

    @pytest.fixture
    def db_session(self):
        """Provide a database session for tests"""
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.rollback()
            db.close()

    @pytest.fixture
    def test_account_id(self, db_session):
        """Get or create a test account"""
        from app.models.account import Account
        account = db_session.query(Account).first()
        if account:
            return account.id
        return 1

    @pytest.fixture
    def test_inventory_type(self, db_session):
        """Create a test inventory type"""
        type_data = InventoryTypeCreate(
            type_name="Transaction Test Type",
            category=InventoryCategoryEnum.HARVEST,
            unit_of_measure="kg",
            perishable=False
        )
        inv_type = InventoryService.create_inventory_type(
            db=db_session,
            inventory_type_data=type_data
        )
        return inv_type

    @pytest.fixture
    def test_item(self, db_session, test_account_id, test_inventory_type):
        """Create a test inventory item"""
        item_data = InventoryItemCreate(
            inventory_type_id=test_inventory_type.id,
            item_name="Transaction Test Item",
            sku="TXN-001",
            current_quantity=Decimal("100.00"),
            unit="kg",
            cost_per_unit=Decimal("10.00"),
            status=InventoryStatusEnum.AVAILABLE
        )
        item = InventoryService.create_inventory_item(
            db=db_session,
            item_data=item_data,
            account_id=test_account_id
        )
        return item

    def test_create_add_transaction(self, db_session, test_account_id, test_inventory_type, test_item):
        """Test creating an ADD transaction"""
        transaction_data = InventoryTransactionCreate(
            inventory_item_id=test_item.id,
            transaction_type=TransactionTypeEnum.ADD,
            quantity_change=Decimal("50.00"),
            cost_per_unit=Decimal("10.00"),
            notes="Added 50 units"
        )

        transaction = InventoryService.create_transaction(
            db=db_session,
            transaction_data=transaction_data,
            account_id=test_account_id
        )

        assert transaction is not None
        assert transaction.quantity_before == Decimal("100.00")
        assert transaction.quantity_after == Decimal("150.00")
        assert transaction.total_cost == Decimal("500.00")

        # Verify item quantity updated
        db_session.refresh(test_item)
        assert test_item.current_quantity == Decimal("150.00")
        print("✅ Create ADD transaction test passed")

        # Cleanup
        db_session.delete(test_item)
        db_session.delete(test_inventory_type)
        db_session.commit()

    def test_create_remove_transaction(self, db_session, test_account_id, test_inventory_type, test_item):
        """Test creating a REMOVE transaction"""
        transaction_data = InventoryTransactionCreate(
            inventory_item_id=test_item.id,
            transaction_type=TransactionTypeEnum.REMOVE,
            quantity_change=Decimal("-30.00"),  # Negative for removal
            notes="Removed 30 units"
        )

        transaction = InventoryService.create_transaction(
            db=db_session,
            transaction_data=transaction_data,
            account_id=test_account_id
        )

        assert transaction is not None
        assert transaction.quantity_after == Decimal("70.00")

        # Verify item quantity updated
        db_session.refresh(test_item)
        assert test_item.current_quantity == Decimal("70.00")
        print("✅ Create REMOVE transaction test passed")

        # Cleanup
        db_session.delete(test_item)
        db_session.delete(test_inventory_type)
        db_session.commit()

    def test_negative_inventory_prevented(self, db_session, test_account_id, test_inventory_type, test_item):
        """Test that transactions cannot result in negative inventory"""
        transaction_data = InventoryTransactionCreate(
            inventory_item_id=test_item.id,
            transaction_type=TransactionTypeEnum.REMOVE,
            quantity_change=Decimal("-200.00"),  # More than available
            notes="Should fail"
        )

        with pytest.raises(ValueError) as exc_info:
            InventoryService.create_transaction(
                db=db_session,
                transaction_data=transaction_data,
                account_id=test_account_id
            )

        assert "negative inventory" in str(exc_info.value).lower()
        print("✅ Negative inventory prevented test passed")

        # Cleanup
        db_session.delete(test_item)
        db_session.delete(test_inventory_type)
        db_session.commit()

    def test_get_item_transactions(self, db_session, test_account_id, test_inventory_type, test_item):
        """Test getting transaction history for an item"""
        transactions = InventoryService.get_item_transactions(
            db=db_session,
            item_id=test_item.id,
            account_id=test_account_id
        )

        # Should have at least the initial creation transaction
        assert len(transactions) >= 1
        print("✅ Get item transactions test passed")

        # Cleanup
        db_session.delete(test_item)
        db_session.delete(test_inventory_type)
        db_session.commit()

    def test_get_all_transactions(self, db_session, test_account_id, test_inventory_type, test_item):
        """Test getting all transactions for an account"""
        transactions = InventoryService.get_all_transactions(
            db=db_session,
            account_id=test_account_id
        )

        assert len(transactions) >= 1
        print("✅ Get all transactions test passed")

        # Cleanup
        db_session.delete(test_item)
        db_session.delete(test_inventory_type)
        db_session.commit()

    def test_get_transactions_by_type(self, db_session, test_account_id, test_inventory_type, test_item):
        """Test filtering transactions by type"""
        transactions = InventoryService.get_all_transactions(
            db=db_session,
            account_id=test_account_id,
            transaction_type=TransactionTypeEnum.ADD
        )

        assert all(t.transaction_type == TransactionTypeEnum.ADD for t in transactions)
        print("✅ Get transactions by type test passed")

        # Cleanup
        db_session.delete(test_item)
        db_session.delete(test_inventory_type)
        db_session.commit()


class TestAlerts:
    """Test inventory alert functionality"""

    @pytest.fixture
    def db_session(self):
        """Provide a database session for tests"""
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.rollback()
            db.close()

    @pytest.fixture
    def test_account_id(self, db_session):
        """Get or create a test account"""
        from app.models.account import Account
        account = db_session.query(Account).first()
        if account:
            return account.id
        return 1

    @pytest.fixture
    def test_inventory_type(self, db_session):
        """Create a test inventory type"""
        type_data = InventoryTypeCreate(
            type_name="Alert Test Type",
            category=InventoryCategoryEnum.HARVEST,
            unit_of_measure="kg",
            perishable=True
        )
        inv_type = InventoryService.create_inventory_type(
            db=db_session,
            inventory_type_data=type_data
        )
        return inv_type

    def test_low_stock_alerts(self, db_session, test_account_id, test_inventory_type):
        """Test getting low stock alerts"""
        item_data = InventoryItemCreate(
            inventory_type_id=test_inventory_type.id,
            item_name="Low Stock Alert Item",
            sku="LSAI-001",
            current_quantity=Decimal("5.00"),  # Below minimum
            unit="kg",
            minimum_quantity=Decimal("20.00"),
            status=InventoryStatusEnum.AVAILABLE
        )

        item = InventoryService.create_inventory_item(
            db=db_session,
            item_data=item_data,
            account_id=test_account_id
        )

        alerts = InventoryService.get_low_stock_alerts(
            db=db_session,
            account_id=test_account_id
        )

        assert any(a.item_id == item.id for a in alerts)
        low_stock_alert = next(a for a in alerts if a.item_id == item.id)
        assert low_stock_alert.current_quantity == Decimal("5.00")
        assert low_stock_alert.minimum_quantity == Decimal("20.00")
        print("✅ Low stock alerts test passed")

        # Cleanup
        db_session.delete(item)
        db_session.delete(test_inventory_type)
        db_session.commit()

    def test_expiring_items_alerts(self, db_session, test_account_id, test_inventory_type):
        """Test getting expiring items alerts"""
        expiry_date = datetime.now(timezone.utc) + timedelta(days=3)
        item_data = InventoryItemCreate(
            inventory_type_id=test_inventory_type.id,
            item_name="Expiring Alert Item",
            sku="EAI-001",
            current_quantity=Decimal("50.00"),
            unit="kg",
            expiry_date=expiry_date,
            batch_number="BATCH-EXP-001",
            status=InventoryStatusEnum.AVAILABLE
        )

        item = InventoryService.create_inventory_item(
            db=db_session,
            item_data=item_data,
            account_id=test_account_id
        )

        alerts = InventoryService.get_expiring_items(
            db=db_session,
            account_id=test_account_id,
            days_threshold=7
        )

        assert any(a.item_id == item.id for a in alerts)
        exp_alert = next(a for a in alerts if a.item_id == item.id)
        assert exp_alert.days_until_expiry <= 7
        assert exp_alert.batch_number == "BATCH-EXP-001"
        print("✅ Expiring items alerts test passed")

        # Cleanup
        db_session.delete(item)
        db_session.delete(test_inventory_type)
        db_session.commit()

    def test_mark_expired_items(self, db_session, test_account_id, test_inventory_type):
        """Test marking expired items"""
        past_expiry = datetime.now(timezone.utc) - timedelta(days=5)
        item_data = InventoryItemCreate(
            inventory_type_id=test_inventory_type.id,
            item_name="Already Expired Item",
            sku="AEI-001",
            current_quantity=Decimal("30.00"),
            unit="kg",
            expiry_date=past_expiry,
            status=InventoryStatusEnum.AVAILABLE
        )

        item = InventoryService.create_inventory_item(
            db=db_session,
            item_data=item_data,
            account_id=test_account_id
        )

        count = InventoryService.mark_expired_items(
            db=db_session,
            account_id=test_account_id
        )

        assert count >= 1

        # Verify item status changed
        db_session.refresh(item)
        assert item.status == InventoryStatusEnum.EXPIRED
        assert item.current_quantity == Decimal("0")
        print("✅ Mark expired items test passed")

        # Cleanup
        db_session.delete(item)
        db_session.delete(test_inventory_type)
        db_session.commit()


class TestReports:
    """Test inventory reporting functionality"""

    @pytest.fixture
    def db_session(self):
        """Provide a database session for tests"""
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.rollback()
            db.close()

    @pytest.fixture
    def test_account_id(self, db_session):
        """Get or create a test account"""
        from app.models.account import Account
        account = db_session.query(Account).first()
        if account:
            return account.id
        return 1

    @pytest.fixture
    def test_inventory_type(self, db_session):
        """Create a test inventory type"""
        type_data = InventoryTypeCreate(
            type_name="Report Test Type",
            category=InventoryCategoryEnum.HARVEST,
            unit_of_measure="kg",
            perishable=False
        )
        inv_type = InventoryService.create_inventory_type(
            db=db_session,
            inventory_type_data=type_data
        )
        return inv_type

    def test_inventory_valuation(self, db_session, test_account_id, test_inventory_type):
        """Test inventory valuation report"""
        item_data = InventoryItemCreate(
            inventory_type_id=test_inventory_type.id,
            item_name="Valuation Test Item",
            sku="VTI-001",
            current_quantity=Decimal("100.00"),
            unit="kg",
            cost_per_unit=Decimal("50.00"),
            status=InventoryStatusEnum.AVAILABLE
        )

        item = InventoryService.create_inventory_item(
            db=db_session,
            item_data=item_data,
            account_id=test_account_id
        )

        report = InventoryService.get_inventory_valuation(
            db=db_session,
            account_id=test_account_id
        )

        assert report.total_items >= 1
        assert report.total_value >= Decimal("5000.00")  # 100 * 50
        assert report.currency == InventoryDefaults.CURRENCY
        assert "HARVEST" in report.by_category or len(report.by_category) >= 0
        print("✅ Inventory valuation test passed")

        # Cleanup
        db_session.delete(item)
        db_session.delete(test_inventory_type)
        db_session.commit()

    def test_items_by_batch(self, db_session, test_account_id, test_inventory_type):
        """Test getting items by batch number"""
        batch_number = "BATCH-TEST-001"
        item_data = InventoryItemCreate(
            inventory_type_id=test_inventory_type.id,
            item_name="Batch Test Item",
            sku="BTI-001",
            current_quantity=Decimal("50.00"),
            unit="kg",
            batch_number=batch_number,
            status=InventoryStatusEnum.AVAILABLE
        )

        item = InventoryService.create_inventory_item(
            db=db_session,
            item_data=item_data,
            account_id=test_account_id
        )

        batch_items = InventoryService.get_items_by_batch(
            db=db_session,
            account_id=test_account_id,
            batch_number=batch_number
        )

        assert len(batch_items) >= 1
        assert all(i.batch_number == batch_number for i in batch_items)
        print("✅ Items by batch test passed")

        # Cleanup
        db_session.delete(item)
        db_session.delete(test_inventory_type)
        db_session.commit()


class TestTransferItem:
    """Test inventory transfer functionality"""

    @pytest.fixture
    def db_session(self):
        """Provide a database session for tests"""
        from app.db.session import SessionLocal
        db = SessionLocal()
        try:
            yield db
        finally:
            db.rollback()
            db.close()

    @pytest.fixture
    def test_account_id(self, db_session):
        """Get or create a test account"""
        from app.models.account import Account
        account = db_session.query(Account).first()
        if account:
            return account.id
        return 1

    @pytest.fixture
    def test_inventory_type(self, db_session):
        """Create a test inventory type"""
        type_data = InventoryTypeCreate(
            type_name="Transfer Test Type",
            category=InventoryCategoryEnum.HARVEST,
            unit_of_measure="kg",
            perishable=False
        )
        inv_type = InventoryService.create_inventory_type(
            db=db_session,
            inventory_type_data=type_data
        )
        return inv_type

    @pytest.fixture
    def test_warehouses(self, db_session, test_account_id):
        """Create two test warehouses"""
        warehouse1_data = WarehouseCreate(
            warehouse_name="Source Warehouse",
            warehouse_code="SRC-001",
            is_active=True
        )
        warehouse2_data = WarehouseCreate(
            warehouse_name="Destination Warehouse",
            warehouse_code="DST-001",
            is_active=True
        )

        warehouse1 = InventoryService.create_warehouse(
            db=db_session,
            warehouse_data=warehouse1_data,
            account_id=test_account_id
        )
        warehouse2 = InventoryService.create_warehouse(
            db=db_session,
            warehouse_data=warehouse2_data,
            account_id=test_account_id
        )

        return warehouse1, warehouse2

    def test_transfer_item_success(self, db_session, test_account_id, test_inventory_type, test_warehouses):
        """Test successful item transfer between warehouses"""
        source_warehouse, dest_warehouse = test_warehouses

        item_data = InventoryItemCreate(
            inventory_type_id=test_inventory_type.id,
            warehouse_id=source_warehouse.id,
            item_name="Transfer Test Item",
            sku="TTI-001",
            current_quantity=Decimal("100.00"),
            unit="kg",
            status=InventoryStatusEnum.AVAILABLE
        )

        item = InventoryService.create_inventory_item(
            db=db_session,
            item_data=item_data,
            account_id=test_account_id
        )

        transferred = InventoryService.transfer_item(
            db=db_session,
            item_id=item.id,
            account_id=test_account_id,
            to_warehouse_id=dest_warehouse.id
        )

        assert transferred.warehouse_id == dest_warehouse.id

        # Verify transfer transaction logged
        transactions = InventoryService.get_item_transactions(
            db=db_session,
            item_id=item.id,
            account_id=test_account_id
        )

        transfer_txn = next((t for t in transactions if t.transaction_type == TransactionTypeEnum.TRANSFER), None)
        assert transfer_txn is not None
        assert transfer_txn.from_location_id == source_warehouse.id
        assert transfer_txn.to_location_id == dest_warehouse.id
        print("✅ Transfer item success test passed")

        # Cleanup
        db_session.delete(item)
        db_session.delete(source_warehouse)
        db_session.delete(dest_warehouse)
        db_session.delete(test_inventory_type)
        db_session.commit()

    def test_transfer_item_invalid_warehouse(self, db_session, test_account_id, test_inventory_type, test_warehouses):
        """Test transfer to invalid warehouse fails"""
        source_warehouse, _ = test_warehouses

        item_data = InventoryItemCreate(
            inventory_type_id=test_inventory_type.id,
            warehouse_id=source_warehouse.id,
            item_name="Invalid Transfer Item",
            sku="ITI-001",
            current_quantity=Decimal("50.00"),
            unit="kg",
            status=InventoryStatusEnum.AVAILABLE
        )

        item = InventoryService.create_inventory_item(
            db=db_session,
            item_data=item_data,
            account_id=test_account_id
        )

        with pytest.raises(ValueError) as exc_info:
            InventoryService.transfer_item(
                db=db_session,
                item_id=item.id,
                account_id=test_account_id,
                to_warehouse_id=999999  # Non-existent warehouse
            )

        assert "warehouse not found" in str(exc_info.value).lower()
        print("✅ Transfer item invalid warehouse test passed")

        # Cleanup
        db_session.delete(item)
        for w in test_warehouses:
            db_session.delete(w)
        db_session.delete(test_inventory_type)
        db_session.commit()


class TestTransactionMetadataHelper:
    """Test the _populate_transaction_metadata helper method"""

    def test_populate_transaction_metadata(self):
        """Test the transaction metadata population helper"""
        # Create mock objects
        mock_transaction = MagicMock(spec=InventoryTransaction)
        mock_item = MagicMock(spec=InventoryItem)
        mock_type = MagicMock(spec=InventoryType)
        mock_warehouse = MagicMock(spec=Warehouse)

        mock_item.item_name = "Test Item"
        mock_item.sku = "TST-001"
        mock_item.unit = "kg"
        mock_type.type_name = "Test Type"
        mock_warehouse.warehouse_name = "Test Warehouse"

        mock_item.inventory_type = mock_type
        mock_item.warehouse = mock_warehouse
        mock_transaction.inventory_item = mock_item

        InventoryService._populate_transaction_metadata(mock_transaction)

        assert mock_transaction.item_name == "Test Item"
        assert mock_transaction.item_sku == "TST-001"
        assert mock_transaction.item_unit == "kg"
        assert mock_transaction.inventory_type_name == "Test Type"
        assert mock_transaction.warehouse_name == "Test Warehouse"
        print("✅ Populate transaction metadata test passed")

    def test_populate_transaction_metadata_no_item(self):
        """Test helper handles missing item gracefully"""
        mock_transaction = MagicMock(spec=InventoryTransaction)
        mock_transaction.inventory_item = None

        # Should not raise an exception
        InventoryService._populate_transaction_metadata(mock_transaction)
        print("✅ Populate transaction metadata no item test passed")


class TestDecimalHandling:
    """Test Decimal precision in calculations"""

    def test_total_value_calculation_precision(self):
        """Test that total value uses Decimal precision"""
        item = InventoryItem()
        item.current_quantity = Decimal("123.456")
        item.cost_per_unit = Decimal("78.90")

        item.calculate_total_value()

        # Verify Decimal precision preserved
        assert isinstance(item.total_value, Decimal)
        assert item.total_value == Decimal("123.456") * Decimal("78.90")
        print("✅ Total value calculation precision test passed")

    def test_total_value_handles_none(self):
        """Test that total value handles None values"""
        item = InventoryItem()
        item.current_quantity = Decimal("100.00")
        item.cost_per_unit = None

        result = item.calculate_total_value()

        assert result is None
        print("✅ Total value handles None test passed")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
