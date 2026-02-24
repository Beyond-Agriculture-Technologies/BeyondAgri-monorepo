# Frontend Quick Start: Inventory Management APIs

## TL;DR - What You Need to Know

✅ **Backend Status**: Phase 1 Complete (Inventory Management)
🔗 **API Base**: `/api/v1/inventory`
🔐 **Auth**: JWT Bearer token required on all endpoints
📖 **Full Docs**: See `FRONTEND_INVENTORY_INTEGRATION_GUIDE.md`

---

## Minimum Implementation to Get Started

### 1. Install Dependencies (if not already installed)

```bash
npm install axios
# or
yarn add axios
```

### 2. Copy Essential Files

Copy these two files to your project:

1. **Type Definitions**: `docs/FRONTEND_INVENTORY_INTEGRATION_GUIDE.md` → Section "TypeScript Type Definitions" → `src/types/inventory.ts`
2. **API Client**: `docs/FRONTEND_INVENTORY_INTEGRATION_GUIDE.md` → Section "API Client Implementation" → `src/services/inventoryApi.ts`

### 3. Configure Auth Token

Update `src/services/inventoryApi.ts` line 18-19 to match your auth implementation:

```typescript
// Current implementation (localStorage)
const token = localStorage.getItem('authToken')

// Change to match your auth system, e.g.:
// const token = useAuthStore().getToken();
// const token = await AsyncStorage.getItem('authToken'); // React Native
```

### 4. Test Connection

```typescript
import { inventoryApi } from './services/inventoryApi'

// Test in your component or console
async function testConnection() {
  try {
    const items = await inventoryApi.listInventoryItems({ limit: 5 })
    console.log('✅ Connection successful:', items)
  } catch (error) {
    console.error('❌ Connection failed:', error)
  }
}
```

---

## Essential Endpoints (Top 10 Most Used)

### 1. List Inventory Items (with filtering)

```typescript
const items = await inventoryApi.listInventoryItems({
  status: 'available',
  warehouse_id: 1,
  low_stock_only: true,
  skip: 0,
  limit: 50,
})
```

### 2. Create Inventory Item

```typescript
const newItem = await inventoryApi.createInventoryItem({
  item_name: 'Tomatoes',
  inventory_type_id: 1,
  current_quantity: 100,
  unit: 'kg',
  cost_per_unit: 25,
  currency: 'ZAR',
  status: InventoryStatusEnum.AVAILABLE,
  warehouse_id: 1,
  minimum_quantity: 20,
  expiry_date: '2025-10-22',
})
```

### 3. Update Inventory Item

```typescript
const updated = await inventoryApi.updateInventoryItem(itemId, {
  current_quantity: 150,
  status: InventoryStatusEnum.AVAILABLE,
})
```

### 4. Get Low Stock Alerts

```typescript
const lowStockItems = await inventoryApi.getLowStockAlerts()
// Returns items where current_quantity <= minimum_quantity
```

### 5. Get Expiring Items

```typescript
// Items expiring in 7 days
const expiring = await inventoryApi.getExpiringItems(7)

// Items expiring in 3 days (urgent)
const urgent = await inventoryApi.getExpiringItems(3)

// Already expired
const expired = await inventoryApi.getExpiringItems(0)
```

### 6. Get Inventory Valuation Report

```typescript
const report = await inventoryApi.getInventoryValuation()
// Returns: { total_items, total_quantity, total_value, by_category, by_status }
```

### 7. List Warehouses

```typescript
const warehouses = await inventoryApi.listWarehouses({ is_active: true })
```

### 8. List Storage Bins (in a warehouse)

```typescript
const bins = await inventoryApi.listWarehouseBins(warehouseId)
```

### 9. Transfer Item Between Locations

```typescript
await inventoryApi.transferItem(itemId, toWarehouseId, toBinId)
// Automatically logs transaction
```

### 10. Get Transaction History

```typescript
const transactions = await inventoryApi.getItemTransactions(itemId)
// Returns full audit trail for the item
```

---

## Component Priority (Build in This Order)

### Sprint 1: Core Functionality

1. **Inventory Dashboard** - Shows totals, alerts, quick stats
2. **Inventory List** - Table/grid with filtering
3. **Inventory Item Form** - Create/edit items

### Sprint 2: Warehouse & Alerts

4. **Warehouse Management** - List warehouses and bins
5. **Low Stock Alerts** - Display items below minimum
6. **Expiry Alerts** - Show items expiring soon

### Sprint 3: Advanced Features

7. **Transaction History** - Audit trail viewer
8. **Batch Tracking** - FIFO management
9. **Valuation Reports** - Charts and exports
10. **Item Transfer** - Move between locations

---

## Quick API Reference Card

| Endpoint                             | Method | Purpose                   |
| ------------------------------------ | ------ | ------------------------- |
| `/inventory/items`                   | GET    | List items (with filters) |
| `/inventory/items`                   | POST   | Create item               |
| `/inventory/items/{id}`              | PUT    | Update item               |
| `/inventory/items/{id}`              | DELETE | Delete item               |
| `/inventory/alerts/low-stock`        | GET    | Low stock items           |
| `/inventory/alerts/expiring?days=7`  | GET    | Expiring items            |
| `/inventory/reports/valuation`       | GET    | Total value report        |
| `/inventory/warehouses`              | GET    | List warehouses           |
| `/inventory/warehouses/{id}/bins`    | GET    | List bins in warehouse    |
| `/inventory/items/{id}/transfer`     | POST   | Transfer location         |
| `/inventory/items/{id}/transactions` | GET    | Transaction history       |
| `/inventory/types`                   | GET    | List inventory types      |

---

## Common Filters & Parameters

### Inventory Items Filters

```typescript
{
  status: 'available' | 'reserved' | 'sold' | 'expired' | 'damaged',
  warehouse_id: number,
  inventory_type_id: number,
  batch_number: string,
  low_stock_only: boolean,
  expiring_within_days: number,
  skip: number,  // Pagination offset
  limit: number  // Page size (default: 100)
}
```

### Status Enum Values

- `available` - Ready to sell
- `reserved` - Held for order
- `sold` - Already sold
- `expired` - Past expiry date
- `damaged` - Not sellable

### Category Enum Values

- `harvest` - Fresh produce
- `meat` - Beef, pork
- `poultry` - Chicken, eggs
- `packaging` - Containers, bags
- `supplies` - Other

---

## Error Handling Quick Guide

```typescript
try {
  const result = await inventoryApi.createInventoryItem(data)
  // Success
} catch (error) {
  if (error.response?.status === 400) {
    // Validation error - check error.response.data.detail
  } else if (error.response?.status === 403) {
    // Not authorized
  } else if (error.response?.status === 404) {
    // Not found
  } else {
    // Other error
  }
}
```

---

## Sample Dashboard Component

```typescript
import React, { useEffect, useState } from 'react';
import { inventoryApi } from '../services/inventoryApi';
import {
  InventoryValuationReport,
  LowStockAlert,
  ExpiringItemAlert
} from '../types/inventory';

export function InventoryDashboard() {
  const [valuation, setValuation] = useState<InventoryValuationReport | null>(null);
  const [lowStock, setLowStock] = useState<LowStockAlert[]>([]);
  const [expiring, setExpiring] = useState<ExpiringItemAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      const [valuationData, lowStockData, expiringData] = await Promise.all([
        inventoryApi.getInventoryValuation(),
        inventoryApi.getLowStockAlerts(),
        inventoryApi.getExpiringItems(7),
      ]);

      setValuation(valuationData);
      setLowStock(lowStockData);
      setExpiring(expiringData);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      alert('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading...</div>;

  return (
    <div className="inventory-dashboard">
      <h1>Inventory Dashboard</h1>

      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="card">
          <h3>Total Items</h3>
          <p className="value">{valuation?.total_items || 0}</p>
        </div>

        <div className="card">
          <h3>Total Value</h3>
          <p className="value">
            {valuation?.total_value || 0} {valuation?.currency}
          </p>
        </div>

        <div className="card alert">
          <h3>Low Stock Items</h3>
          <p className="value warning">{lowStock.length}</p>
        </div>

        <div className="card alert">
          <h3>Expiring Soon</h3>
          <p className="value warning">{expiring.length}</p>
        </div>
      </div>

      {/* Alerts Section */}
      {lowStock.length > 0 && (
        <div className="alert-section">
          <h2>⚠️ Low Stock Alerts</h2>
          {lowStock.slice(0, 5).map(alert => (
            <div key={alert.item_id} className="alert-item">
              <span>{alert.item_name}</span>
              <span>
                {alert.current_quantity} / {alert.minimum_quantity} {alert.unit}
              </span>
            </div>
          ))}
          {lowStock.length > 5 && (
            <a href="/alerts/low-stock">View all {lowStock.length} alerts</a>
          )}
        </div>
      )}

      {expiring.length > 0 && (
        <div className="alert-section">
          <h2>📅 Expiring Soon</h2>
          {expiring.slice(0, 5).map(alert => (
            <div key={alert.item_id} className="alert-item">
              <span>{alert.item_name}</span>
              <span>
                Expires in {alert.days_until_expiry} days
              </span>
            </div>
          ))}
          {expiring.length > 5 && (
            <a href="/alerts/expiring">View all {expiring.length} alerts</a>
          )}
        </div>
      )}

      {/* Category Breakdown */}
      {valuation && (
        <div className="category-breakdown">
          <h2>Value by Category</h2>
          {Object.entries(valuation.by_category).map(([category, value]) => (
            <div key={category} className="category-item">
              <span>{category}</span>
              <span>{value} {valuation.currency}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Testing Your Implementation

### 1. Test API Connection

```typescript
// In browser console or component
inventoryApi
  .listInventoryItems({ limit: 1 })
  .then(data => console.log('✅ API works:', data))
  .catch(err => console.error('❌ API failed:', err))
```

### 2. Test Creating an Item

```typescript
inventoryApi
  .createInventoryItem({
    item_name: 'Test Tomatoes',
    inventory_type_id: 1, // Make sure this type exists
    current_quantity: 50,
    unit: 'kg',
    cost_per_unit: 25,
    currency: 'ZAR',
    status: 'available',
    minimum_quantity: 10,
  })
  .then(item => console.log('✅ Item created:', item))
  .catch(err => console.error('❌ Failed:', err))
```

### 3. Test Alerts

```typescript
// Check if low stock detection works
inventoryApi
  .getLowStockAlerts()
  .then(alerts => console.log('Low stock items:', alerts))
  .catch(err => console.error('Failed:', err))
```

---

## Common Issues & Solutions

### Issue: "401 Unauthorized" or "403 Forbidden"

**Solution**: Check that JWT token is being sent correctly

```typescript
// Debug auth token
console.log('Auth token:', localStorage.getItem('authToken'))
```

### Issue: "404 Not Found"

**Solution**: Verify API base URL is correct

```typescript
// Check base URL in inventoryApi.ts constructor
baseURL: '/api/v1' // Should match your backend
```

### Issue: CORS errors

**Solution**: Backend should already handle CORS. If not, contact backend team.

### Issue: Empty responses

**Solution**: Make sure you're authenticated and have inventory items

```typescript
// Check if you have any items
const items = await inventoryApi.listInventoryItems({ limit: 100 })
console.log('Total items:', items.length)
```

---

## Next Steps

1. ✅ Copy type definitions and API client
2. ✅ Test API connection
3. ✅ Build dashboard component
4. ✅ Add inventory list with filtering
5. ✅ Implement create/edit forms
6. ✅ Add alerts screens
7. ✅ Build warehouse management
8. ✅ Add transaction history
9. ✅ Implement batch tracking
10. ✅ Create valuation reports

---

## Need Help?

- **API Documentation**: Visit `/api/v1/docs` on your backend server (Swagger UI)
- **Full Guide**: Read `FRONTEND_INVENTORY_INTEGRATION_GUIDE.md`
- **Backend Code**: Check `app/api/v1/endpoints/inventory.py`
- **Type Definitions**: See `app/schemas/inventory.py`

---

**Ready to start building!** 🚀

The backend Phase 1 is complete and fully tested. All endpoints are operational and ready for frontend integration.
