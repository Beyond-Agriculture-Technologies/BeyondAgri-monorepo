#!/usr/bin/env python3
"""
Seed script to populate database with 3 months of realistic farmer data.
Creates inventory, warehouses, and transaction history for testing.

Usage:
    python scripts/seed_farmer_data.py
"""

import sys
import os
from pathlib import Path
from datetime import datetime, timedelta, timezone
from decimal import Decimal
import random

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.account import Account
from app.models.profile import UserProfile, FarmerProfile, LandUnitEnum
from app.models.inventory import (
    InventoryType, Warehouse, StorageBin, InventoryItem, InventoryTransaction,
    InventoryCategoryEnum, InventoryStatusEnum, TransactionTypeEnum
)


# Configuration
TARGET_EMAIL = "sakhile.motha.254@gmail.com"
MONTHS_OF_DATA = 3


def get_random_date_in_range(start_date: datetime, end_date: datetime) -> datetime:
    """Generate random datetime between start and end dates."""
    time_between = end_date - start_date
    days_between = time_between.days
    random_days = random.randint(0, days_between)
    random_seconds = random.randint(0, 86400)
    return start_date + timedelta(days=random_days, seconds=random_seconds)


def setup_profiles(db: Session, account: Account):
    """Create or update user and farmer profiles."""
    print("Setting up profiles...")

    # User Profile
    user_profile = db.query(UserProfile).filter(UserProfile.account_id == account.id).first()
    if not user_profile:
        user_profile = UserProfile(
            account_id=account.id,
            name="Sakhile Motha",
            phone_number="+27123456789",
            address="Farm Road 123, Limpopo Province, South Africa"
        )
        db.add(user_profile)
        print("✓ Created UserProfile")
    else:
        print("✓ UserProfile already exists")

    # Farmer Profile
    farmer_profile = db.query(FarmerProfile).filter(FarmerProfile.account_id == account.id).first()
    if not farmer_profile:
        farmer_profile = FarmerProfile(
            account_id=account.id,
            farm_name="Motha Family Farm",
            farm_location="Polokwane, Limpopo",
            farm_size="50 hectares",
            total_land_area=Decimal("50.00"),
            land_unit=LandUnitEnum.HECTARES,
            farm_coordinates="-23.9045,29.4689",
            farm_registration_number="LP-FARM-2021-001234",
            certifications=["Organic Certified", "Good Agricultural Practice (GAP)"],
            crop_types=["Vegetables", "Livestock"],
            farming_methods=["Organic", "Rotational Grazing"],
            equipment=["Tractor", "Cold Storage", "Processing Facility"]
        )
        db.add(farmer_profile)
        print("✓ Created FarmerProfile")
    else:
        print("✓ FarmerProfile already exists")

    db.commit()


def create_inventory_types(db: Session, account: Account):
    """Create inventory type definitions."""
    print("\nCreating inventory types...")

    inventory_types = [
        # Harvested Crops
        {
            "type_name": "Tomatoes",
            "category": InventoryCategoryEnum.HARVEST,
            "description": "Fresh tomatoes",
            "unit_of_measure": "kg",
            "perishable": True,
            "typical_shelf_life_days": 14,
            "reorder_point": Decimal("50.00"),
            "reorder_quantity": Decimal("200.00")
        },
        {
            "type_name": "Spinach",
            "category": InventoryCategoryEnum.HARVEST,
            "description": "Fresh spinach leaves",
            "unit_of_measure": "kg",
            "perishable": True,
            "typical_shelf_life_days": 7,
            "reorder_point": Decimal("20.00"),
            "reorder_quantity": Decimal("100.00")
        },
        {
            "type_name": "Cabbage",
            "category": InventoryCategoryEnum.HARVEST,
            "description": "Fresh cabbage heads",
            "unit_of_measure": "kg",
            "perishable": True,
            "typical_shelf_life_days": 21,
            "reorder_point": Decimal("30.00"),
            "reorder_quantity": Decimal("150.00")
        },
        {
            "type_name": "Potatoes",
            "category": InventoryCategoryEnum.HARVEST,
            "description": "Fresh potatoes",
            "unit_of_measure": "kg",
            "perishable": True,
            "typical_shelf_life_days": 60,
            "reorder_point": Decimal("100.00"),
            "reorder_quantity": Decimal("500.00")
        },
        {
            "type_name": "Carrots",
            "category": InventoryCategoryEnum.HARVEST,
            "description": "Fresh carrots",
            "unit_of_measure": "kg",
            "perishable": True,
            "typical_shelf_life_days": 45,
            "reorder_point": Decimal("40.00"),
            "reorder_quantity": Decimal("200.00")
        },
        {
            "type_name": "Onions",
            "category": InventoryCategoryEnum.HARVEST,
            "description": "Fresh onions",
            "unit_of_measure": "kg",
            "perishable": True,
            "typical_shelf_life_days": 90,
            "reorder_point": Decimal("50.00"),
            "reorder_quantity": Decimal("250.00")
        },
        # Meat Products
        {
            "type_name": "Beef",
            "category": InventoryCategoryEnum.MEAT,
            "description": "Grass-fed beef",
            "unit_of_measure": "kg",
            "perishable": True,
            "typical_shelf_life_days": 5,
            "reorder_point": Decimal("20.00"),
            "reorder_quantity": Decimal("100.00")
        },
        {
            "type_name": "Pork",
            "category": InventoryCategoryEnum.MEAT,
            "description": "Farm-raised pork",
            "unit_of_measure": "kg",
            "perishable": True,
            "typical_shelf_life_days": 5,
            "reorder_point": Decimal("15.00"),
            "reorder_quantity": Decimal("75.00")
        },
        {
            "type_name": "Lamb",
            "category": InventoryCategoryEnum.MEAT,
            "description": "Fresh lamb meat",
            "unit_of_measure": "kg",
            "perishable": True,
            "typical_shelf_life_days": 5,
            "reorder_point": Decimal("10.00"),
            "reorder_quantity": Decimal("50.00")
        },
        {
            "type_name": "Goat Meat",
            "category": InventoryCategoryEnum.MEAT,
            "description": "Free-range goat meat",
            "unit_of_measure": "kg",
            "perishable": True,
            "typical_shelf_life_days": 5,
            "reorder_point": Decimal("10.00"),
            "reorder_quantity": Decimal("50.00")
        },
    ]

    created_types = {}
    for type_data in inventory_types:
        # Check if type already exists
        existing = db.query(InventoryType).filter(
            InventoryType.account_id == account.id,
            InventoryType.type_name == type_data["type_name"]
        ).first()

        if not existing:
            inv_type = InventoryType(account_id=account.id, **type_data)
            db.add(inv_type)
            db.flush()
            created_types[type_data["type_name"]] = inv_type
            print(f"  ✓ Created inventory type: {type_data['type_name']}")
        else:
            created_types[type_data["type_name"]] = existing
            print(f"  ✓ Using existing inventory type: {type_data['type_name']}")

    db.commit()
    return created_types


def create_warehouses(db: Session, account: Account):
    """Create warehouse and storage bin infrastructure."""
    print("\nCreating warehouses and storage bins...")

    warehouses_data = [
        {
            "warehouse_name": "Main Cold Storage Facility",
            "warehouse_code": "COLD-01",
            "address": "Farm Road 123, Section A",
            "city": "Polokwane",
            "province": "Limpopo",
            "postal_code": "0699",
            "country": "South Africa",
            "latitude": Decimal("-23.9045"),
            "longitude": Decimal("29.4689"),
            "storage_capacity": Decimal("500.00"),
            "capacity_unit": "cubic meters",
            "temperature_controlled": True,
            "min_temperature": 2.0,
            "max_temperature": 8.0,
            "is_active": True,
            "bins": [
                {"bin_name": "Cold Storage A1", "bin_code": "CS-A1", "capacity": Decimal("100.00"), "capacity_unit": "cubic meters"},
                {"bin_name": "Cold Storage A2", "bin_code": "CS-A2", "capacity": Decimal("100.00"), "capacity_unit": "cubic meters"},
                {"bin_name": "Freezer Section B1", "bin_code": "FZ-B1", "capacity": Decimal("80.00"), "capacity_unit": "cubic meters"},
            ]
        },
        {
            "warehouse_name": "Dry Goods Warehouse",
            "warehouse_code": "DRY-01",
            "address": "Farm Road 123, Section B",
            "city": "Polokwane",
            "province": "Limpopo",
            "postal_code": "0699",
            "country": "South Africa",
            "latitude": Decimal("-23.9050"),
            "longitude": Decimal("29.4695"),
            "storage_capacity": Decimal("800.00"),
            "capacity_unit": "cubic meters",
            "temperature_controlled": False,
            "is_active": True,
            "bins": [
                {"bin_name": "Dry Storage Row 1", "bin_code": "DRY-R1", "capacity": Decimal("200.00"), "capacity_unit": "cubic meters"},
                {"bin_name": "Dry Storage Row 2", "bin_code": "DRY-R2", "capacity": Decimal("200.00"), "capacity_unit": "cubic meters"},
                {"bin_name": "Dry Storage Row 3", "bin_code": "DRY-R3", "capacity": Decimal("200.00"), "capacity_unit": "cubic meters"},
            ]
        },
        {
            "warehouse_name": "Processing & Packaging Center",
            "warehouse_code": "PROC-01",
            "address": "Farm Road 123, Section C",
            "city": "Polokwane",
            "province": "Limpopo",
            "postal_code": "0699",
            "country": "South Africa",
            "latitude": Decimal("-23.9055"),
            "longitude": Decimal("29.4700"),
            "storage_capacity": Decimal("300.00"),
            "capacity_unit": "cubic meters",
            "temperature_controlled": True,
            "min_temperature": 10.0,
            "max_temperature": 18.0,
            "is_active": True,
            "bins": [
                {"bin_name": "Processing Area", "bin_code": "PROC-A", "capacity": Decimal("100.00"), "capacity_unit": "cubic meters"},
                {"bin_name": "Packaging Zone", "bin_code": "PACK-A", "capacity": Decimal("100.00"), "capacity_unit": "cubic meters"},
            ]
        }
    ]

    created_warehouses = []
    for warehouse_data in warehouses_data:
        bins_data = warehouse_data.pop("bins")

        # Check if warehouse exists
        existing = db.query(Warehouse).filter(
            Warehouse.account_id == account.id,
            Warehouse.warehouse_code == warehouse_data["warehouse_code"]
        ).first()

        if not existing:
            warehouse = Warehouse(account_id=account.id, **warehouse_data)
            db.add(warehouse)
            db.flush()
            print(f"  ✓ Created warehouse: {warehouse.warehouse_name}")

            # Create bins
            for bin_data in bins_data:
                storage_bin = StorageBin(warehouse_id=warehouse.id, **bin_data)
                db.add(storage_bin)
                print(f"    ✓ Created bin: {bin_data['bin_code']}")

            created_warehouses.append(warehouse)
        else:
            created_warehouses.append(existing)
            print(f"  ✓ Using existing warehouse: {existing.warehouse_name}")

    db.commit()
    return created_warehouses


def create_inventory_items_and_transactions(
    db: Session,
    account: Account,
    inventory_types: dict,
    warehouses: list
):
    """Create inventory items with comprehensive 3-month transaction history."""
    print("\nGenerating inventory items and transaction history...")

    now = datetime.now(timezone.utc)
    three_months_ago = now - timedelta(days=90)

    # Define product scenarios with realistic pricing and quantities
    product_scenarios = [
        # CROPS - Regular harvests every 1-2 weeks
        {
            "type": "Tomatoes",
            "cost_per_unit": Decimal("15.50"),  # ZAR per kg
            "harvest_cycles": 6,  # 6 harvests over 3 months
            "harvest_quantity_range": (80, 150),
            "sale_quantity_range": (20, 60),
            "spoilage_rate": 0.10,  # 10% spoilage
        },
        {
            "type": "Spinach",
            "cost_per_unit": Decimal("12.00"),
            "harvest_cycles": 8,
            "harvest_quantity_range": (40, 80),
            "sale_quantity_range": (10, 30),
            "spoilage_rate": 0.15,
        },
        {
            "type": "Cabbage",
            "cost_per_unit": Decimal("8.50"),
            "harvest_cycles": 5,
            "harvest_quantity_range": (100, 200),
            "sale_quantity_range": (30, 80),
            "spoilage_rate": 0.05,
        },
        {
            "type": "Potatoes",
            "cost_per_unit": Decimal("6.00"),
            "harvest_cycles": 4,
            "harvest_quantity_range": (200, 400),
            "sale_quantity_range": (50, 150),
            "spoilage_rate": 0.03,
        },
        {
            "type": "Carrots",
            "cost_per_unit": Decimal("7.50"),
            "harvest_cycles": 5,
            "harvest_quantity_range": (80, 160),
            "sale_quantity_range": (20, 60),
            "spoilage_rate": 0.05,
        },
        {
            "type": "Onions",
            "cost_per_unit": Decimal("9.00"),
            "harvest_cycles": 4,
            "harvest_quantity_range": (150, 300),
            "sale_quantity_range": (40, 100),
            "spoilage_rate": 0.02,
        },
        # MEAT - Monthly or bi-weekly processing
        {
            "type": "Beef",
            "cost_per_unit": Decimal("85.00"),
            "harvest_cycles": 6,  # Slaughter/processing events
            "harvest_quantity_range": (30, 60),
            "sale_quantity_range": (15, 40),
            "spoilage_rate": 0.02,
        },
        {
            "type": "Pork",
            "cost_per_unit": Decimal("65.00"),
            "harvest_cycles": 5,
            "harvest_quantity_range": (25, 50),
            "sale_quantity_range": (10, 30),
            "spoilage_rate": 0.02,
        },
        {
            "type": "Lamb",
            "cost_per_unit": Decimal("95.00"),
            "harvest_cycles": 4,
            "harvest_quantity_range": (15, 35),
            "sale_quantity_range": (8, 20),
            "spoilage_rate": 0.02,
        },
        {
            "type": "Goat Meat",
            "cost_per_unit": Decimal("75.00"),
            "harvest_cycles": 4,
            "harvest_quantity_range": (12, 30),
            "sale_quantity_range": (6, 18),
            "spoilage_rate": 0.02,
        },
    ]

    all_transactions = []

    for scenario in product_scenarios:
        type_name = scenario["type"]
        inv_type = inventory_types[type_name]

        # Determine appropriate warehouse
        if inv_type.category == InventoryCategoryEnum.MEAT:
            warehouse = warehouses[0]  # Cold storage
        elif type_name in ["Potatoes", "Onions"]:
            warehouse = warehouses[1]  # Dry storage
        else:
            warehouse = random.choice([warehouses[0], warehouses[2]])  # Cold or processing

        # Get a random bin from the warehouse
        bins = db.query(StorageBin).filter(StorageBin.warehouse_id == warehouse.id).all()
        storage_bin = random.choice(bins) if bins else None

        # Create base inventory item
        current_quantity = Decimal("0.00")

        # Generate batch number
        batch_number = f"BATCH-{type_name[:3].upper()}-{now.strftime('%Y%m')}-{random.randint(1000, 9999)}"

        # Calculate expiry date based on shelf life
        shelf_life_days = inv_type.typical_shelf_life_days or 30
        expiry_date = now + timedelta(days=shelf_life_days)

        inventory_item = InventoryItem(
            account_id=account.id,
            inventory_type_id=inv_type.id,
            warehouse_id=warehouse.id,
            bin_id=storage_bin.id if storage_bin else None,
            item_name=f"{type_name} - {batch_number}",
            description=f"Organic {type_name.lower()} from Motha Family Farm",
            sku=f"SKU-{type_name[:3].upper()}-{random.randint(100, 999)}",
            current_quantity=current_quantity,
            unit=inv_type.unit_of_measure,
            minimum_quantity=inv_type.reorder_point,
            acquisition_date=three_months_ago,
            expiry_date=expiry_date,
            cost_per_unit=scenario["cost_per_unit"],
            currency="ZAR",
            batch_number=batch_number,
            status=InventoryStatusEnum.AVAILABLE,
            notes=f"Fresh {type_name.lower()} - Grade A quality"
        )
        db.add(inventory_item)
        db.flush()

        print(f"  ✓ Created item: {inventory_item.item_name}")

        # Generate transactions over 3 months
        harvest_cycles = scenario["harvest_cycles"]
        days_between_harvests = 90 // harvest_cycles

        for cycle in range(harvest_cycles):
            # Harvest/Add transaction
            harvest_date = three_months_ago + timedelta(days=cycle * days_between_harvests + random.randint(0, 5))

            if harvest_date > now:
                break

            harvest_qty = Decimal(str(random.randint(*scenario["harvest_quantity_range"])))
            qty_before = current_quantity
            current_quantity += harvest_qty

            transaction = InventoryTransaction(
                inventory_item_id=inventory_item.id,
                transaction_type=TransactionTypeEnum.ADD,
                transaction_date=harvest_date,
                quantity_change=harvest_qty,
                quantity_before=qty_before,
                quantity_after=current_quantity,
                cost_per_unit=scenario["cost_per_unit"],
                total_cost=harvest_qty * scenario["cost_per_unit"],
                performed_by_account_id=account.id,
                notes=f"Harvest cycle {cycle + 1} - Fresh from farm"
            )
            db.add(transaction)
            all_transactions.append({
                "date": harvest_date,
                "type": "ADD",
                "item": type_name,
                "qty": harvest_qty
            })

            # Sales transactions (1-3 sales per harvest cycle)
            num_sales = random.randint(1, 3)
            for sale_idx in range(num_sales):
                sale_date = harvest_date + timedelta(days=random.randint(1, days_between_harvests - 2))

                if sale_date > now or current_quantity <= 0:
                    break

                max_sale = min(float(current_quantity), scenario["sale_quantity_range"][1])
                if max_sale < scenario["sale_quantity_range"][0]:
                    break

                sale_qty = Decimal(str(random.randint(
                    scenario["sale_quantity_range"][0],
                    int(max_sale)
                )))

                qty_before = current_quantity
                current_quantity -= sale_qty

                transaction = InventoryTransaction(
                    inventory_item_id=inventory_item.id,
                    transaction_type=TransactionTypeEnum.SALE,
                    transaction_date=sale_date,
                    quantity_change=-sale_qty,
                    quantity_before=qty_before,
                    quantity_after=current_quantity,
                    cost_per_unit=scenario["cost_per_unit"],
                    total_cost=sale_qty * scenario["cost_per_unit"],
                    performed_by_account_id=account.id,
                    notes=f"Sale to customer - Invoice #{random.randint(10000, 99999)}"
                )
                db.add(transaction)
                all_transactions.append({
                    "date": sale_date,
                    "type": "SALE",
                    "item": type_name,
                    "qty": sale_qty
                })

            # Spoilage (occasionally)
            if random.random() < scenario["spoilage_rate"] and current_quantity > 0:
                spoilage_date = harvest_date + timedelta(days=random.randint(7, days_between_harvests))

                if spoilage_date <= now:
                    max_spoilage = max(5, int(float(current_quantity) * 0.2))
                    min_spoilage = min(5, int(float(current_quantity)))

                    if min_spoilage <= max_spoilage:
                        spoilage_qty = min(
                            current_quantity,
                            Decimal(str(random.randint(min_spoilage, max_spoilage)))
                        )
                    else:
                        spoilage_qty = Decimal(str(min_spoilage))

                    if spoilage_qty > 0:
                        qty_before = current_quantity
                        current_quantity -= spoilage_qty

                        transaction = InventoryTransaction(
                            inventory_item_id=inventory_item.id,
                            transaction_type=TransactionTypeEnum.SPOILAGE,
                            transaction_date=spoilage_date,
                            quantity_change=-spoilage_qty,
                            quantity_before=qty_before,
                            quantity_after=current_quantity,
                            performed_by_account_id=account.id,
                            notes="Quality degradation - disposed per safety protocols"
                        )
                        db.add(transaction)
                        all_transactions.append({
                            "date": spoilage_date,
                            "type": "SPOILAGE",
                            "item": type_name,
                            "qty": spoilage_qty
                        })

        # Add occasional adjustments
        if random.random() < 0.3 and current_quantity > 0:
            adjustment_date = get_random_date_in_range(three_months_ago, now)
            adjustment_qty = Decimal(str(random.randint(-5, 10)))

            qty_before = current_quantity
            current_quantity += adjustment_qty

            if current_quantity >= 0:
                transaction = InventoryTransaction(
                    inventory_item_id=inventory_item.id,
                    transaction_type=TransactionTypeEnum.ADJUSTMENT,
                    transaction_date=adjustment_date,
                    quantity_change=adjustment_qty,
                    quantity_before=qty_before,
                    quantity_after=current_quantity,
                    performed_by_account_id=account.id,
                    notes="Inventory count adjustment - stocktake reconciliation"
                )
                db.add(transaction)
                all_transactions.append({
                    "date": adjustment_date,
                    "type": "ADJUSTMENT",
                    "item": type_name,
                    "qty": adjustment_qty
                })

        # Update final item status
        inventory_item.current_quantity = current_quantity
        inventory_item.calculate_total_value()

        if current_quantity == 0:
            inventory_item.status = InventoryStatusEnum.SOLD
        elif inventory_item.is_expired:
            inventory_item.status = InventoryStatusEnum.EXPIRED
        elif inventory_item.is_low_stock:
            inventory_item.status = InventoryStatusEnum.AVAILABLE  # Still available but low
        else:
            inventory_item.status = InventoryStatusEnum.AVAILABLE

    # Add some transfers between warehouses
    print("\n  Adding warehouse transfer transactions...")
    for _ in range(random.randint(3, 6)):
        # Pick random item that has quantity
        items_with_stock = db.query(InventoryItem).filter(
            InventoryItem.account_id == account.id,
            InventoryItem.current_quantity > 0
        ).all()

        if len(items_with_stock) > 0 and len(warehouses) > 1:
            item = random.choice(items_with_stock)
            from_warehouse = item.warehouse
            to_warehouse = random.choice([w for w in warehouses if w.id != from_warehouse.id])

            transfer_date = get_random_date_in_range(three_months_ago, now)
            transfer_qty = min(
                item.current_quantity,
                Decimal(str(random.randint(10, int(float(item.current_quantity) * 0.5))))
            )

            transaction = InventoryTransaction(
                inventory_item_id=item.id,
                transaction_type=TransactionTypeEnum.TRANSFER,
                transaction_date=transfer_date,
                quantity_change=Decimal("0.00"),  # Transfer doesn't change total quantity
                quantity_before=item.current_quantity,
                quantity_after=item.current_quantity,
                from_location_id=from_warehouse.id,
                to_location_id=to_warehouse.id,
                performed_by_account_id=account.id,
                notes=f"Transfer from {from_warehouse.warehouse_code} to {to_warehouse.warehouse_code}",
                transaction_metadata={"transfer_quantity": float(transfer_qty)}
            )
            db.add(transaction)

            # Update item location
            item.warehouse_id = to_warehouse.id
            # Update to a bin in the new warehouse
            new_bins = db.query(StorageBin).filter(StorageBin.warehouse_id == to_warehouse.id).all()
            if new_bins:
                item.bin_id = random.choice(new_bins).id

    db.commit()

    # Print summary
    print(f"\n  📊 Transaction Summary:")
    print(f"     Total transactions: {len(all_transactions)}")
    transaction_types = {}
    for t in all_transactions:
        transaction_types[t["type"]] = transaction_types.get(t["type"], 0) + 1
    for t_type, count in transaction_types.items():
        print(f"     {t_type}: {count}")


def main():
    """Main execution function."""
    print("=" * 60)
    print("DATABASE SEED SCRIPT - 3 Month Farmer Data")
    print("=" * 60)
    print(f"\nTarget Account: {TARGET_EMAIL}")
    print(f"Data Period: {MONTHS_OF_DATA} months")
    print()

    db = SessionLocal()

    try:
        # Find the account
        print("Looking up account...")
        account = db.query(Account).filter(Account.email == TARGET_EMAIL).first()

        if not account:
            print(f"❌ Error: Account with email {TARGET_EMAIL} not found!")
            print("Please ensure the account exists before running this script.")
            return

        print(f"✓ Found account: {account.email} (ID: {account.id})")
        print(f"  Account Type: {account.account_type}")
        print(f"  Status: {account.status}")
        print()

        # Setup profiles
        setup_profiles(db, account)

        # Create inventory types
        inventory_types = create_inventory_types(db, account)

        # Create warehouses and bins
        warehouses = create_warehouses(db, account)

        # Create inventory items and transaction history
        create_inventory_items_and_transactions(db, account, inventory_types, warehouses)

        print("\n" + "=" * 60)
        print("✅ DATA SEEDING COMPLETE!")
        print("=" * 60)
        print("\nYou can now:")
        print("  • View inventory items in the database")
        print("  • Check transaction history")
        print("  • Test reporting and analytics features")
        print("  • Verify warehouse and bin assignments")
        print()

    except Exception as e:
        print(f"\n❌ Error occurred: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
