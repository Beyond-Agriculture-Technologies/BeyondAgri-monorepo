# Inventory Data Models

Complete reference for all inventory-related data models and schemas.

## Model Relationships

```
InventoryType ─┐
               ├──> InventoryItem ──> InventoryTransaction
Warehouse ─────┤                ↑
               │                │
StorageBin ────┘                │
                                │
Account ────────────────────────┘
```

## Enums

### InventoryCategoryEnum

```typescript
type InventoryCategoryEnum =
  | "harvest"     // Vegetables, fruits
  | "meat"        // Beef, pork
  | "poultry"     // Chicken, turkey, eggs
  | "packaging"   // Boxes, containers
  | "supplies"    // General supplies
  | "other";      // Miscellaneous
```

### InventoryStatusEnum

```typescript
type InventoryStatusEnum =
  | "available"   // Ready for sale/use
  | "reserved"    // Held for pending order
  | "sold"        // Sold and removed
  | "expired"     // Past expiry date
  | "damaged"     // Not fit for sale
  | "in_transit"; // Being moved
```

### TransactionTypeEnum

```typescript
type TransactionTypeEnum =
  | "add"         // Harvest, purchase
  | "remove"      // Sale, usage
  | "adjustment"  // Inventory count correction
  | "transfer"    // Move between locations
  | "sale"        // Sold to customer
  | "spoilage"    // Waste, expired
  | "return";     // Customer return
```

---

## 1. Inventory Type

Master catalog of inventory item types.

### Database Model

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | integer | Auto | Primary key |
| account_id | integer | No | Account owner (null = system default) |
| type_name | string(255) | Yes | Name (e.g., "Tomatoes") |
| category | InventoryCategoryEnum | Yes | Item category |
| description | text | No | Detailed description |
| unit_of_measure | string(50) | Yes | kg, dozen, bunch, etc. |
| perishable | boolean | Yes | Is item perishable? (default: false) |
| typical_shelf_life_days | integer | No | Shelf life in days (if perishable) |
| reorder_point | decimal(10,2) | No | Trigger reorder alert at this quantity |
| reorder_quantity | decimal(10,2) | No | Suggested reorder amount |
| created_at | timestamp | Auto | Creation timestamp |
| updated_at | timestamp | Auto | Last update timestamp |

### JSON Schema (Create)

```json
{
  "type_name": "Roma Tomatoes",
  "category": "harvest",
  "description": "Fresh roma tomatoes for cooking",
  "unit_of_measure": "kg",
  "perishable": true,
  "typical_shelf_life_days": 7,
  "reorder_point": 50,
  "reorder_quantity": 200
}
```

### JSON Response

```json
{
  "id": 1,
  "account_id": null,
  "type_name": "Roma Tomatoes",
  "category": "harvest",
  "description": "Fresh roma tomatoes for cooking",
  "unit_of_measure": "kg",
  "perishable": true,
  "typical_shelf_life_days": 7,
  "reorder_point": "50.00",
  "reorder_quantity": "200.00",
  "created_at": "2025-10-10T10:00:00Z",
  "updated_at": "2025-10-10T10:00:00Z"
}
```

---

## 2. Warehouse

Physical storage locations.

### Database Model

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | integer | Auto | Primary key |
| account_id | integer | Yes | Account owner |
| warehouse_name | string(255) | Yes | Warehouse name |
| warehouse_code | string(50) | No | Short code (e.g., "WH-001") |
| address | string(500) | No | Street address |
| city | string(100) | No | City |
| province | string(100) | No | Province/state |
| postal_code | string(20) | No | Postal code |
| country | string(100) | Yes | Country (default: "South Africa") |
| latitude | decimal(10,7) | No | GPS latitude |
| longitude | decimal(10,7) | No | GPS longitude |
| storage_capacity | decimal(10,2) | No | Total capacity |
| capacity_unit | string(50) | No | m³, pallets, etc. |
| temperature_controlled | boolean | Yes | Has temperature control? (default: false) |
| min_temperature | float | No | Min temp (°C) |
| max_temperature | float | No | Max temp (°C) |
| is_active | boolean | Yes | Is active? (default: true) |
| created_at | timestamp | Auto | Creation timestamp |
| updated_at | timestamp | Auto | Last update timestamp |

### JSON Schema (Create)

```json
{
  "warehouse_name": "Cold Storage Facility A",
  "warehouse_code": "CS-A",
  "address": "123 Farm Road",
  "city": "Cape Town",
  "province": "Western Cape",
  "postal_code": "8001",
  "country": "South Africa",
  "latitude": -33.9249,
  "longitude": 18.4241,
  "storage_capacity": 1000,
  "capacity_unit": "m³",
  "temperature_controlled": true,
  "min_temperature": 2,
  "max_temperature": 8,
  "is_active": true
}
```

---

## 3. Storage Bin

Storage subdivisions within warehouses.

### Database Model

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | integer | Auto | Primary key |
| warehouse_id | integer | Yes | Parent warehouse |
| bin_name | string(255) | Yes | Bin name |
| bin_code | string(50) | Yes | Short code (e.g., "A1") |
| capacity | decimal(10,2) | No | Bin capacity |
| capacity_unit | string(50) | No | Unit of capacity |
| is_active | boolean | Yes | Is active? (default: true) |
| created_at | timestamp | Auto | Creation timestamp |
| updated_at | timestamp | Auto | Last update timestamp |

### JSON Schema (Create)

```json
{
  "warehouse_id": 1,
  "bin_name": "Aisle A, Shelf 1",
  "bin_code": "A1",
  "capacity": 500,
  "capacity_unit": "kg",
  "is_active": true
}
```

---

## 4. Inventory Item

Actual inventory items with quantities.

### Database Model

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | integer | Auto | Primary key |
| account_id | integer | Yes | Account owner |
| inventory_type_id | integer | Yes | Type of item |
| warehouse_id | integer | No | Storage warehouse |
| bin_id | integer | No | Storage bin |
| item_name | string(255) | Yes | Item name |
| description | text | No | Item description |
| sku | string(100) | No | Stock Keeping Unit |
| current_quantity | decimal(10,2) | Yes | Current quantity (default: 0) |
| unit | string(50) | Yes | Unit of measure |
| minimum_quantity | decimal(10,2) | No | Low stock threshold |
| acquisition_date | timestamp | No | When acquired |
| expiry_date | timestamp | No | When expires |
| cost_per_unit | decimal(10,2) | No | Cost per unit |
| total_value | decimal(12,2) | Auto | current_quantity × cost_per_unit |
| currency | string(3) | Yes | Currency code (default: "ZAR") |
| batch_number | string(100) | No | Batch/lot number |
| lot_number | string(100) | No | Additional lot tracking |
| status | InventoryStatusEnum | Yes | Item status (default: "available") |
| related_crop_id | integer | No | Link to crop planting (Phase 2) |
| related_animal_id | integer | No | Link to animal (Phase 2) |
| photos | json | No | Array of photo URLs |
| custom_fields | json | No | Custom metadata (quality_grade, etc.) |
| notes | text | No | Additional notes |
| created_at | timestamp | Auto | Creation timestamp |
| updated_at | timestamp | Auto | Last update timestamp |

### Computed Properties

| Property | Type | Description |
|----------|------|-------------|
| is_low_stock | boolean | current_quantity <= minimum_quantity |
| is_expired | boolean | expiry_date < now() |

### JSON Schema (Create)

```json
{
  "inventory_type_id": 1,
  "warehouse_id": 1,
  "bin_id": 1,
  "item_name": "Fresh Roma Tomatoes - Grade A",
  "description": "Premium roma tomatoes from Field 3",
  "sku": "TOM-ROMA-001",
  "current_quantity": 150,
  "unit": "kg",
  "minimum_quantity": 30,
  "acquisition_date": "2025-10-10T08:00:00Z",
  "expiry_date": "2025-10-17T23:59:59Z",
  "cost_per_unit": 25.50,
  "currency": "ZAR",
  "batch_number": "HARVEST-2025-10-10-F3",
  "lot_number": "LOT-001",
  "status": "available",
  "photos": [
    "https://cdn.beyondagri.com/products/tomatoes-001.jpg"
  ],
  "custom_fields": {
    "quality_grade": "A",
    "organic": true,
    "certification": "GlobalGAP"
  },
  "notes": "Harvested early morning, excellent quality"
}
```

### JSON Response

```json
{
  "id": 1,
  "account_id": 123,
  "inventory_type_id": 1,
  "warehouse_id": 1,
  "bin_id": 1,
  "item_name": "Fresh Roma Tomatoes - Grade A",
  "description": "Premium roma tomatoes from Field 3",
  "sku": "TOM-ROMA-001",
  "current_quantity": "150.00",
  "unit": "kg",
  "minimum_quantity": "30.00",
  "acquisition_date": "2025-10-10T08:00:00Z",
  "expiry_date": "2025-10-17T23:59:59Z",
  "cost_per_unit": "25.50",
  "total_value": "3825.00",
  "currency": "ZAR",
  "batch_number": "HARVEST-2025-10-10-F3",
  "lot_number": "LOT-001",
  "status": "available",
  "related_crop_id": null,
  "related_animal_id": null,
  "photos": [
    "https://cdn.beyondagri.com/products/tomatoes-001.jpg"
  ],
  "custom_fields": {
    "quality_grade": "A",
    "organic": true,
    "certification": "GlobalGAP"
  },
  "notes": "Harvested early morning, excellent quality",
  "is_low_stock": false,
  "is_expired": false,
  "created_at": "2025-10-10T08:30:00Z",
  "updated_at": "2025-10-10T08:30:00Z"
}
```

---

## 5. Inventory Transaction

Audit trail of all inventory changes.

### Database Model

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | integer | Auto | Primary key |
| inventory_item_id | integer | Yes | Related inventory item |
| transaction_type | TransactionTypeEnum | Yes | Type of transaction |
| transaction_date | timestamp | Auto | When transaction occurred |
| quantity_change | decimal(10,2) | Yes | Quantity change (+/-) |
| quantity_before | decimal(10,2) | Auto | Quantity before change |
| quantity_after | decimal(10,2) | Auto | Quantity after change |
| from_location_id | integer | No | From warehouse (transfers) |
| to_location_id | integer | No | To warehouse (transfers) |
| cost_per_unit | decimal(10,2) | No | Cost per unit |
| total_cost | decimal(12,2) | Auto | abs(quantity_change) × cost_per_unit |
| related_order_id | integer | No | Related order (Phase 4) |
| related_task_id | integer | No | Related task |
| performed_by_account_id | integer | No | Who performed this |
| notes | text | No | Transaction notes |
| transaction_metadata | json | No | Additional metadata |
| created_at | timestamp | Auto | Creation timestamp |
| updated_at | timestamp | Auto | Last update timestamp |

### JSON Schema (Create)

```json
{
  "inventory_item_id": 1,
  "transaction_type": "add",
  "quantity_change": 50,
  "cost_per_unit": 24.00,
  "notes": "Additional harvest from Field 5"
}
```

### JSON Response

```json
{
  "id": 1,
  "inventory_item_id": 1,
  "transaction_type": "add",
  "transaction_date": "2025-10-10T14:30:00Z",
  "quantity_change": "50.00",
  "quantity_before": "150.00",
  "quantity_after": "200.00",
  "from_location_id": null,
  "to_location_id": null,
  "cost_per_unit": "24.00",
  "total_cost": "1200.00",
  "related_order_id": null,
  "related_task_id": null,
  "performed_by_account_id": 123,
  "notes": "Additional harvest from Field 5",
  "transaction_metadata": null,
  "created_at": "2025-10-10T14:30:00Z",
  "updated_at": "2025-10-10T14:30:00Z"
}
```

---

## TypeScript Interfaces

```typescript
// Inventory Type
interface InventoryType {
  id: number;
  account_id: number | null;
  type_name: string;
  category: InventoryCategoryEnum;
  description?: string;
  unit_of_measure: string;
  perishable: boolean;
  typical_shelf_life_days?: number;
  reorder_point?: string;  // Decimal as string
  reorder_quantity?: string;
  created_at: string;  // ISO 8601
  updated_at: string;
}

// Warehouse
interface Warehouse {
  id: number;
  account_id: number;
  warehouse_name: string;
  warehouse_code?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country: string;
  latitude?: string;
  longitude?: string;
  storage_capacity?: string;
  capacity_unit?: string;
  temperature_controlled: boolean;
  min_temperature?: number;
  max_temperature?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Storage Bin
interface StorageBin {
  id: number;
  warehouse_id: number;
  bin_name: string;
  bin_code: string;
  capacity?: string;
  capacity_unit?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Inventory Item
interface InventoryItem {
  id: number;
  account_id: number;
  inventory_type_id: number;
  warehouse_id?: number;
  bin_id?: number;
  item_name: string;
  description?: string;
  sku?: string;
  current_quantity: string;  // Decimal as string
  unit: string;
  minimum_quantity?: string;
  acquisition_date?: string;
  expiry_date?: string;
  cost_per_unit?: string;
  total_value?: string;
  currency: string;
  batch_number?: string;
  lot_number?: string;
  status: InventoryStatusEnum;
  related_crop_id?: number;
  related_animal_id?: number;
  photos?: string[];
  custom_fields?: Record<string, any>;
  notes?: string;
  is_low_stock: boolean;  // Computed
  is_expired: boolean;    // Computed
  created_at: string;
  updated_at: string;
}

// Inventory Transaction
interface InventoryTransaction {
  id: number;
  inventory_item_id: number;
  transaction_type: TransactionTypeEnum;
  transaction_date: string;
  quantity_change: string;
  quantity_before?: string;
  quantity_after?: string;
  from_location_id?: number;
  to_location_id?: number;
  cost_per_unit?: string;
  total_cost?: string;
  related_order_id?: number;
  related_task_id?: number;
  performed_by_account_id?: number;
  notes?: string;
  transaction_metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

---

## Notes

- **Decimal Numbers**: All decimal fields (quantities, prices) are returned as strings to preserve precision
- **Timestamps**: All timestamps are in ISO 8601 format with timezone (UTC)
- **Nullable Fields**: Optional fields may be `null` in responses
- **Computed Fields**: `is_low_stock`, `is_expired`, `total_value` are calculated server-side
- **Enums**: Always validate enum values on the client side before sending

---

**See Also:**
- [Inventory API Overview](../api/inventory/overview.md)
- [Enum Reference](./enums.md)
- [Account Models](./account-models.md)
