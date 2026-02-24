# Inventory Management API - Overview

## Introduction

The Inventory Management system (Phase 1) provides comprehensive tools for farmers and wholesalers to track their agricultural inventory including:

- ✅ Inventory item types (vegetables, fruits, meat, poultry)
- ✅ Multi-location warehousing with storage bins
- ✅ Batch/lot tracking for traceability
- ✅ Expiry date management with automated alerts
- ✅ Low stock detection and notifications
- ✅ Complete transaction audit trail
- ✅ Inventory valuation reporting

**Base Path:** `/api/v1/inventory`

## Key Concepts

### 1. Inventory Types
Master catalog of what you can stock (e.g., "Tomatoes", "Beef", "Chicken Eggs").
- Can be system-wide defaults or account-specific
- Includes category, unit of measure, shelf life
- Supports perishable vs non-perishable items

### 2. Warehouses
Physical storage locations for your inventory.
- GPS coordinates for mapping
- Temperature-controlled settings
- Capacity tracking
- Multiple warehouses per account

### 3. Storage Bins
Subdivisions within warehouses (aisles, shelves, sections).
- Organize inventory within warehouses
- Track capacity per bin
- Example codes: "A1", "ROW-2-SHELF-3"

### 4. Inventory Items
Actual stock with quantities, expiry dates, and batch numbers.
- Real-time quantity tracking
- Batch/lot numbers for FIFO management
- Expiry date tracking
- Cost per unit and total valuation
- Status tracking (available, reserved, sold, expired)

### 5. Transactions
Complete audit trail of every inventory change.
- Automatic logging of all quantity changes
- Transfer tracking between locations
- Links to related orders/tasks
- Performed by tracking for accountability

## Quick Reference

### All Endpoints

| Category | Endpoint | Method | Description |
|----------|----------|--------|-------------|
| **Types** | `/types` | GET | List inventory types |
| | `/types` | POST | Create custom type |
| | `/types/{id}` | GET/PUT/DELETE | Manage type |
| **Warehouses** | `/warehouses` | GET | List warehouses |
| | `/warehouses` | POST | Create warehouse |
| | `/warehouses/{id}` | GET/PUT/DELETE | Manage warehouse |
| | `/warehouses/{id}/bins` | GET | List bins in warehouse |
| | `/warehouses/{id}/bins` | POST | Create bin in warehouse |
| **Bins** | `/bins/{id}` | PUT/DELETE | Manage storage bin |
| **Items** | `/items` | GET | List items (with filters) |
| | `/items` | POST | Create inventory item |
| | `/items/{id}` | GET/PUT/DELETE | Manage item |
| | `/items/{id}/transfer` | POST | Transfer to different location |
| | `/items/{id}/transactions` | GET | View transaction history |
| | `/items/{id}/transactions` | POST | Record new transaction |
| **Alerts** | `/alerts/low-stock` | GET | Get low stock items |
| | `/alerts/expiring?days=7` | GET | Get expiring items |
| | `/alerts/mark-expired` | POST | Mark expired items |
| **Reports** | `/reports/valuation` | GET | Inventory valuation report |
| | `/reports/batch/{number}` | GET | Batch traceability |

## Common Workflows

### 1. Initial Setup

```javascript
// Step 1: Create a warehouse
const warehouse = await api.post('/inventory/warehouses', {
  warehouse_name: "Main Farm Storage",
  address: "123 Farm Road, Cape Town",
  city: "Cape Town",
  province: "Western Cape",
  temperature_controlled: true,
  min_temperature: 2,
  max_temperature: 8
});

// Step 2: Create storage bins
const bin1 = await api.post(`/inventory/warehouses/${warehouse.id}/bins`, {
  bin_name: "Cold Storage A",
  bin_code: "CS-A1",
  capacity: 500,
  capacity_unit: "kg"
});

// Step 3: Create an inventory item
const item = await api.post('/inventory/items', {
  inventory_type_id: 1,  // Tomatoes
  item_name: "Fresh Roma Tomatoes",
  current_quantity: 150,
  unit: "kg",
  minimum_quantity: 30,
  warehouse_id: warehouse.id,
  bin_id: bin1.id,
  expiry_date: "2025-10-20T00:00:00Z",
  batch_number: "HARVEST-2025-10-10",
  cost_per_unit: 25.50
});
```

### 2. Checking Alerts

```javascript
// Get low stock items
const lowStock = await api.get('/inventory/alerts/low-stock');
// Returns items where current_quantity <= minimum_quantity

// Get items expiring in 7 days
const expiringSoon = await api.get('/inventory/alerts/expiring?days=7');

// Get items expiring in 3 days (urgent)
const expiringUrgent = await api.get('/inventory/alerts/expiring?days=3');

// Get already expired items
const expired = await api.get('/inventory/alerts/expiring?days=0');
```

### 3. Recording Inventory Changes

```javascript
// Add inventory (harvest, purchase)
await api.post(`/inventory/items/${itemId}/transactions`, {
  transaction_type: "add",
  quantity_change: 50,  // Positive number
  cost_per_unit: 24.00,
  notes: "Harvest from Field 3"
});

// Remove inventory (sale, spoilage)
await api.post(`/inventory/items/${itemId}/transactions`, {
  transaction_type: "sale",
  quantity_change: -20,  // Negative number
  notes: "Sold to Wholesaler ABC"
});

// Transfer between locations
await api.post(`/inventory/items/${itemId}/transfer?to_warehouse_id=2&to_bin_id=5`);
```

### 4. Viewing Reports

```javascript
// Get total inventory valuation
const valuation = await api.get('/inventory/reports/valuation');
// Returns: total_value, breakdown by category, count by status

// Trace a specific batch
const batchItems = await api.get('/inventory/reports/batch/HARVEST-2025-10-10');
// Returns all items from this batch, ordered by date (FIFO)
```

## Data Flow Diagram

```
┌─────────────────┐
│ Inventory Types │  (System/Account-specific templates)
└────────┬────────┘
         │
         ↓
┌─────────────────┐       ┌──────────────┐
│ Inventory Items │◄──────┤  Warehouses  │
└────────┬────────┘       └──────┬───────┘
         │                       │
         │                       ↓
         │              ┌─────────────────┐
         │              │  Storage Bins   │
         │              └─────────────────┘
         ↓
┌─────────────────────┐
│ Inventory           │  (Audit trail of all changes)
│ Transactions        │
└─────────────────────┘
```

## Filtering and Querying

### Filter Inventory Items

```javascript
// By status
GET /inventory/items?status=available

// By warehouse
GET /inventory/items?warehouse_id=1

// By inventory type
GET /inventory/items?inventory_type_id=5

// By batch
GET /inventory/items?batch_number=HARVEST-2025-10-10

// Low stock only
GET /inventory/items?low_stock_only=true

// Expiring soon
GET /inventory/items?expiring_within_days=7

// Multiple filters
GET /inventory/items?status=available&warehouse_id=1&low_stock_only=true

// Pagination
GET /inventory/items?skip=0&limit=20
```

## Status Workflow

```
available ──┬──> reserved ──> sold
            │
            ├──> expired (automatic)
            │
            └──> damaged
```

**Status Descriptions:**
- **available**: Ready for sale/use
- **reserved**: Held for a pending order
- **sold**: Sold and removed from stock
- **expired**: Past expiry date (auto-marked)
- **damaged**: Not fit for sale
- **in_transit**: Being moved between locations

## Batch/Lot Tracking

Use batch numbers for full traceability:

**Format Examples:**
- `HARVEST-2025-10-10-FIELD-3`
- `PURCHASE-SUPPLIER-ABC-20251010`
- `BATCH-001-2025-Q4`

**Benefits:**
1. FIFO management (sell oldest first)
2. Quality control (isolate bad batches)
3. Regulatory compliance
4. Customer transparency

**Query batch:**
```javascript
const batchItems = await api.get('/inventory/reports/batch/HARVEST-2025-10-10');
// Returns items sorted by acquisition_date (oldest first)
```

## Expiry Management

**Three Alert Levels:**

1. **7 Days Warning** (`?days=7`)
   - Yellow alert
   - Plan sales/promotions

2. **3 Days Urgent** (`?days=3`)
   - Orange alert
   - Immediate action needed

3. **Expired** (`?days=0`)
   - Red alert
   - Automatic status change
   - Remove from sale

**Auto-expire items:**
```javascript
await api.post('/inventory/alerts/mark-expired');
// Sets status=expired for all items past expiry_date
// Logs spoilage transaction
// Sets quantity to 0
```

## Inventory Valuation

Automatic calculation:
```
total_value = current_quantity × cost_per_unit
```

Updated on:
- Item creation
- Quantity changes
- Cost per unit changes

**Get valuation report:**
```javascript
const report = await api.get('/inventory/reports/valuation');

// Response:
{
  total_items: 45,
  total_quantity: 1250.50,
  total_value: 31262.50,
  currency: "ZAR",
  by_category: {
    "harvest": 15000.00,
    "meat": 12000.00,
    "poultry": 4262.50
  },
  by_status: {
    "available": 40,
    "reserved": 5
  }
}
```

## Transaction Types

| Type | Use Case | Quantity Change |
|------|----------|-----------------|
| **add** | Harvest, purchase | Positive |
| **remove** | Sale, usage | Negative |
| **adjustment** | Inventory count correction | +/- |
| **transfer** | Move between locations | 0 (location change) |
| **sale** | Sold to customer | Negative |
| **spoilage** | Waste, expired | Negative |
| **return** | Customer return | Positive |

## Permissions

All inventory endpoints require authentication and return only the current account's data.

**Account Types:**
- **Farmers**: Full access to own inventory
- **Wholesalers**: Full access to own inventory + advanced batch management
- **Admin**: System-wide access

## Performance Tips

1. **Use pagination** for large datasets (`skip` and `limit`)
2. **Filter early** - use query parameters instead of client-side filtering
3. **Cache inventory types** - they rarely change
4. **Batch operations** - group multiple updates when possible
5. **Index by batch_number** - already indexed in database

## Error Handling

Common errors:

```javascript
// 404 - Item not found
{
  "detail": "Inventory item not found"
}

// 400 - Negative inventory
{
  "detail": "Transaction would result in negative inventory"
}

// 403 - Not your item
{
  "detail": "Not authorized to access this inventory type"
}
```

## Next Steps

Explore detailed documentation for each endpoint group:

- [Inventory Types](./types.md)
- [Warehouses](./warehouses.md)
- [Inventory Items](./items.md)
- [Transactions](./transactions.md)
- [Alerts](./alerts.md)
- [Reports](./reports.md)

Or jump to:
- [Common Workflows Guide](../../guides/common-workflows.md)
- [JavaScript Examples](../../examples/javascript-examples.md)
- [Error Handling](../../guides/error-handling.md)

---

**Last Updated:** 2025-10-10
