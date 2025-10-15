# Frontend Integration Guide: Phase 1 Inventory Management

## Overview

This guide provides complete instructions for integrating the Phase 1 Inventory Management backend APIs into your frontend application (mobile or web).

**Backend Status**: ✅ Fully Implemented
**API Base URL**: `/api/v1/inventory`
**Authentication**: Required on all endpoints (JWT token via Authorization header)

---

## Table of Contents

1. [API Endpoints Reference](#api-endpoints-reference)
2. [TypeScript Type Definitions](#typescript-type-definitions)
3. [API Client Implementation](#api-client-implementation)
4. [UI Components Guide](#ui-components-guide)
5. [Example Usage Patterns](#example-usage-patterns)
6. [Error Handling](#error-handling)
7. [Testing Checklist](#testing-checklist)

---

## API Endpoints Reference

### 1. Inventory Types

Manage inventory type catalog (vegetables, fruits, meat, poultry, etc.)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/inventory/types` | List inventory types | ✅ |
| POST | `/api/v1/inventory/types` | Create custom type | ✅ |
| GET | `/api/v1/inventory/types/{type_id}` | Get type details | ✅ |
| PUT | `/api/v1/inventory/types/{type_id}` | Update type | ✅ |
| DELETE | `/api/v1/inventory/types/{type_id}` | Delete type | ✅ |

**Query Parameters for GET /types:**
- `category`: Filter by category (harvest/meat/poultry/packaging/supplies)
- `skip`: Pagination offset (default: 0)
- `limit`: Page size (default: 100)

### 2. Warehouses

Manage storage facilities

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/inventory/warehouses` | List warehouses | ✅ |
| POST | `/api/v1/inventory/warehouses` | Create warehouse | ✅ |
| GET | `/api/v1/inventory/warehouses/{warehouse_id}` | Get warehouse | ✅ |
| PUT | `/api/v1/inventory/warehouses/{warehouse_id}` | Update warehouse | ✅ |
| DELETE | `/api/v1/inventory/warehouses/{warehouse_id}` | Delete warehouse | ✅ |

**Query Parameters for GET /warehouses:**
- `is_active`: Filter by active status (true/false)
- `skip`: Pagination offset
- `limit`: Page size

### 3. Storage Bins

Manage bins within warehouses

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/inventory/warehouses/{warehouse_id}/bins` | List bins in warehouse | ✅ |
| POST | `/api/v1/inventory/warehouses/{warehouse_id}/bins` | Create bin | ✅ |
| PUT | `/api/v1/inventory/bins/{bin_id}` | Update bin | ✅ |
| DELETE | `/api/v1/inventory/bins/{bin_id}` | Delete bin | ✅ |

**Query Parameters for GET /bins:**
- `is_active`: Filter by active status

### 4. Inventory Items

Manage actual inventory stock

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/inventory/items` | List items with filters | ✅ |
| POST | `/api/v1/inventory/items` | Create item | ✅ |
| GET | `/api/v1/inventory/items/{item_id}` | Get item details | ✅ |
| PUT | `/api/v1/inventory/items/{item_id}` | Update item | ✅ |
| DELETE | `/api/v1/inventory/items/{item_id}` | Delete item | ✅ |

**Query Parameters for GET /items (extensive filtering):**
- `status`: Filter by status (available/reserved/sold/expired/damaged)
- `warehouse_id`: Filter by warehouse
- `inventory_type_id`: Filter by type
- `batch_number`: Filter by batch
- `low_stock_only`: Show only low stock items (boolean)
- `expiring_within_days`: Show items expiring within X days
- `skip`: Pagination offset
- `limit`: Page size

### 5. Inventory Transactions

Track stock movements and changes

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/inventory/items/{item_id}/transactions` | Get transaction history | ✅ |
| POST | `/api/v1/inventory/items/{item_id}/transactions` | Log transaction | ✅ |
| POST | `/api/v1/inventory/items/{item_id}/transfer` | Transfer item | ✅ |

**Query Parameters for GET /transactions:**
- `skip`: Pagination offset
- `limit`: Page size

**Query Parameters for POST /transfer:**
- `to_warehouse_id`: Destination warehouse (required)
- `to_bin_id`: Destination bin (optional)

### 6. Alerts & Reports

Monitor inventory health and get insights

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/inventory/alerts/low-stock` | Get low stock items | ✅ |
| GET | `/api/v1/inventory/alerts/expiring` | Get expiring items | ✅ |
| POST | `/api/v1/inventory/alerts/mark-expired` | Auto-mark expired items | ✅ |
| GET | `/api/v1/inventory/reports/valuation` | Get inventory valuation | ✅ |
| GET | `/api/v1/inventory/reports/batch/{batch_number}` | Get items by batch | ✅ |

**Query Parameters for GET /alerts/expiring:**
- `days`: Days threshold (default: 7, 0 = already expired)

---

## TypeScript Type Definitions

Create a new file: `src/types/inventory.ts`

```typescript
// ==================== Enums ====================

export enum InventoryCategoryEnum {
  HARVEST = "harvest",
  MEAT = "meat",
  POULTRY = "poultry",
  PACKAGING = "packaging",
  SUPPLIES = "supplies",
}

export enum InventoryStatusEnum {
  AVAILABLE = "available",
  RESERVED = "reserved",
  SOLD = "sold",
  EXPIRED = "expired",
  DAMAGED = "damaged",
}

export enum TransactionTypeEnum {
  ADD = "add",
  REMOVE = "remove",
  ADJUSTMENT = "adjustment",
  TRANSFER = "transfer",
  SALE = "sale",
  SPOILAGE = "spoilage",
  RETURN = "return",
}

// ==================== Inventory Types ====================

export interface InventoryTypeBase {
  type_name: string;
  category: InventoryCategoryEnum;
  description?: string;
  unit_of_measure: string;
  perishable: boolean;
  typical_shelf_life_days?: number;
  reorder_point?: number;
  reorder_quantity?: number;
}

export interface InventoryTypeCreate extends InventoryTypeBase {
  account_id?: number;
}

export interface InventoryTypeUpdate {
  type_name?: string;
  category?: InventoryCategoryEnum;
  description?: string;
  unit_of_measure?: string;
  perishable?: boolean;
  typical_shelf_life_days?: number;
  reorder_point?: number;
  reorder_quantity?: number;
}

export interface InventoryTypeResponse extends InventoryTypeBase {
  id: number;
  account_id?: number;
  created_at: string;
  updated_at: string;
}

// ==================== Warehouses ====================

export interface WarehouseBase {
  warehouse_name: string;
  warehouse_code?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  storage_capacity?: number;
  capacity_unit?: string;
  temperature_controlled: boolean;
  min_temperature?: number;
  max_temperature?: number;
  is_active: boolean;
}

export interface WarehouseCreate extends WarehouseBase {}

export interface WarehouseUpdate {
  warehouse_name?: string;
  warehouse_code?: string;
  address?: string;
  city?: string;
  province?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  storage_capacity?: number;
  capacity_unit?: string;
  temperature_controlled?: boolean;
  min_temperature?: number;
  max_temperature?: number;
  is_active?: boolean;
}

export interface WarehouseResponse extends WarehouseBase {
  id: number;
  account_id: number;
  created_at: string;
  updated_at: string;
}

// ==================== Storage Bins ====================

export interface StorageBinBase {
  bin_name: string;
  bin_code: string;
  capacity?: number;
  capacity_unit?: string;
  is_active: boolean;
}

export interface StorageBinCreate extends StorageBinBase {
  warehouse_id: number;
}

export interface StorageBinUpdate {
  bin_name?: string;
  bin_code?: string;
  capacity?: number;
  capacity_unit?: string;
  is_active?: boolean;
}

export interface StorageBinResponse extends StorageBinBase {
  id: number;
  warehouse_id: number;
  created_at: string;
  updated_at: string;
}

// ==================== Inventory Items ====================

export interface InventoryItemBase {
  item_name: string;
  description?: string;
  sku?: string;
  current_quantity: number;
  unit: string;
  minimum_quantity?: number;
  acquisition_date?: string;
  expiry_date?: string;
  cost_per_unit?: number;
  currency: string;
  batch_number?: string;
  lot_number?: string;
  status: InventoryStatusEnum;
  related_crop_id?: number;
  related_animal_id?: number;
  photos?: string[];
  custom_fields?: Record<string, any>;
  notes?: string;
}

export interface InventoryItemCreate extends InventoryItemBase {
  inventory_type_id: number;
  warehouse_id?: number;
  bin_id?: number;
}

export interface InventoryItemUpdate {
  item_name?: string;
  description?: string;
  sku?: string;
  current_quantity?: number;
  unit?: string;
  minimum_quantity?: number;
  acquisition_date?: string;
  expiry_date?: string;
  cost_per_unit?: number;
  currency?: string;
  batch_number?: string;
  lot_number?: string;
  status?: InventoryStatusEnum;
  warehouse_id?: number;
  bin_id?: number;
  related_crop_id?: number;
  related_animal_id?: number;
  photos?: string[];
  custom_fields?: Record<string, any>;
  notes?: string;
}

export interface InventoryItemResponse extends InventoryItemBase {
  id: number;
  account_id: number;
  inventory_type_id: number;
  warehouse_id?: number;
  bin_id?: number;
  total_value?: number;
  created_at: string;
  updated_at: string;
  is_low_stock: boolean;
  is_expired: boolean;
}

// ==================== Transactions ====================

export interface InventoryTransactionBase {
  transaction_type: TransactionTypeEnum;
  quantity_change: number;
  from_location_id?: number;
  to_location_id?: number;
  cost_per_unit?: number;
  related_order_id?: number;
  related_task_id?: number;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface InventoryTransactionCreate extends InventoryTransactionBase {
  inventory_item_id: number;
}

export interface InventoryTransactionResponse extends InventoryTransactionBase {
  id: number;
  inventory_item_id: number;
  transaction_date: string;
  quantity_before?: number;
  quantity_after?: number;
  total_cost?: number;
  performed_by_account_id?: number;
  created_at: string;
  updated_at: string;
}

// ==================== Alerts & Reports ====================

export interface LowStockAlert {
  item_id: number;
  item_name: string;
  current_quantity: number;
  minimum_quantity: number;
  unit: string;
  warehouse_name?: string;
  bin_code?: string;
}

export interface ExpiringItemAlert {
  item_id: number;
  item_name: string;
  current_quantity: number;
  unit: string;
  expiry_date: string;
  days_until_expiry: number;
  batch_number?: string;
  warehouse_name?: string;
}

export interface InventoryValuationReport {
  total_items: number;
  total_quantity: number;
  total_value: number;
  currency: string;
  by_category: Record<string, number>;
  by_status: Record<string, number>;
}

// ==================== Query Parameters ====================

export interface InventoryItemFilters {
  status?: InventoryStatusEnum;
  warehouse_id?: number;
  inventory_type_id?: number;
  batch_number?: string;
  low_stock_only?: boolean;
  expiring_within_days?: number;
  skip?: number;
  limit?: number;
}

export interface InventoryTypeFilters {
  category?: InventoryCategoryEnum;
  skip?: number;
  limit?: number;
}

export interface WarehouseFilters {
  is_active?: boolean;
  skip?: number;
  limit?: number;
}

export interface StorageBinFilters {
  is_active?: boolean;
}

export interface TransactionFilters {
  skip?: number;
  limit?: number;
}
```

---

## API Client Implementation

Create a new file: `src/services/inventoryApi.ts`

```typescript
import axios, { AxiosInstance } from 'axios';
import {
  InventoryTypeResponse,
  InventoryTypeCreate,
  InventoryTypeUpdate,
  InventoryTypeFilters,
  WarehouseResponse,
  WarehouseCreate,
  WarehouseUpdate,
  WarehouseFilters,
  StorageBinResponse,
  StorageBinCreate,
  StorageBinUpdate,
  StorageBinFilters,
  InventoryItemResponse,
  InventoryItemCreate,
  InventoryItemUpdate,
  InventoryItemFilters,
  InventoryTransactionResponse,
  InventoryTransactionCreate,
  TransactionFilters,
  LowStockAlert,
  ExpiringItemAlert,
  InventoryValuationReport,
} from '../types/inventory';

class InventoryApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = '/api/v1') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token interceptor
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken'); // Adjust based on your auth implementation
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // ==================== Inventory Types ====================

  async listInventoryTypes(
    filters?: InventoryTypeFilters
  ): Promise<InventoryTypeResponse[]> {
    const response = await this.client.get('/inventory/types', {
      params: filters,
    });
    return response.data;
  }

  async createInventoryType(
    data: InventoryTypeCreate
  ): Promise<InventoryTypeResponse> {
    const response = await this.client.post('/inventory/types', data);
    return response.data;
  }

  async getInventoryType(typeId: number): Promise<InventoryTypeResponse> {
    const response = await this.client.get(`/inventory/types/${typeId}`);
    return response.data;
  }

  async updateInventoryType(
    typeId: number,
    data: InventoryTypeUpdate
  ): Promise<InventoryTypeResponse> {
    const response = await this.client.put(`/inventory/types/${typeId}`, data);
    return response.data;
  }

  async deleteInventoryType(typeId: number): Promise<void> {
    await this.client.delete(`/inventory/types/${typeId}`);
  }

  // ==================== Warehouses ====================

  async listWarehouses(filters?: WarehouseFilters): Promise<WarehouseResponse[]> {
    const response = await this.client.get('/inventory/warehouses', {
      params: filters,
    });
    return response.data;
  }

  async createWarehouse(data: WarehouseCreate): Promise<WarehouseResponse> {
    const response = await this.client.post('/inventory/warehouses', data);
    return response.data;
  }

  async getWarehouse(warehouseId: number): Promise<WarehouseResponse> {
    const response = await this.client.get(`/inventory/warehouses/${warehouseId}`);
    return response.data;
  }

  async updateWarehouse(
    warehouseId: number,
    data: WarehouseUpdate
  ): Promise<WarehouseResponse> {
    const response = await this.client.put(
      `/inventory/warehouses/${warehouseId}`,
      data
    );
    return response.data;
  }

  async deleteWarehouse(warehouseId: number): Promise<void> {
    await this.client.delete(`/inventory/warehouses/${warehouseId}`);
  }

  // ==================== Storage Bins ====================

  async listWarehouseBins(
    warehouseId: number,
    filters?: StorageBinFilters
  ): Promise<StorageBinResponse[]> {
    const response = await this.client.get(
      `/inventory/warehouses/${warehouseId}/bins`,
      { params: filters }
    );
    return response.data;
  }

  async createStorageBin(
    warehouseId: number,
    data: Omit<StorageBinCreate, 'warehouse_id'>
  ): Promise<StorageBinResponse> {
    const response = await this.client.post(
      `/inventory/warehouses/${warehouseId}/bins`,
      data
    );
    return response.data;
  }

  async updateStorageBin(
    binId: number,
    data: StorageBinUpdate
  ): Promise<StorageBinResponse> {
    const response = await this.client.put(`/inventory/bins/${binId}`, data);
    return response.data;
  }

  async deleteStorageBin(binId: number): Promise<void> {
    await this.client.delete(`/inventory/bins/${binId}`);
  }

  // ==================== Inventory Items ====================

  async listInventoryItems(
    filters?: InventoryItemFilters
  ): Promise<InventoryItemResponse[]> {
    const response = await this.client.get('/inventory/items', {
      params: filters,
    });
    return response.data;
  }

  async createInventoryItem(
    data: InventoryItemCreate
  ): Promise<InventoryItemResponse> {
    const response = await this.client.post('/inventory/items', data);
    return response.data;
  }

  async getInventoryItem(itemId: number): Promise<InventoryItemResponse> {
    const response = await this.client.get(`/inventory/items/${itemId}`);
    return response.data;
  }

  async updateInventoryItem(
    itemId: number,
    data: InventoryItemUpdate
  ): Promise<InventoryItemResponse> {
    const response = await this.client.put(`/inventory/items/${itemId}`, data);
    return response.data;
  }

  async deleteInventoryItem(itemId: number): Promise<void> {
    await this.client.delete(`/inventory/items/${itemId}`);
  }

  // ==================== Transactions ====================

  async getItemTransactions(
    itemId: number,
    filters?: TransactionFilters
  ): Promise<InventoryTransactionResponse[]> {
    const response = await this.client.get(
      `/inventory/items/${itemId}/transactions`,
      { params: filters }
    );
    return response.data;
  }

  async createTransaction(
    itemId: number,
    data: Omit<InventoryTransactionCreate, 'inventory_item_id'>
  ): Promise<InventoryTransactionResponse> {
    const response = await this.client.post(
      `/inventory/items/${itemId}/transactions`,
      data
    );
    return response.data;
  }

  async transferItem(
    itemId: number,
    toWarehouseId: number,
    toBinId?: number
  ): Promise<InventoryItemResponse> {
    const response = await this.client.post(
      `/inventory/items/${itemId}/transfer`,
      null,
      {
        params: {
          to_warehouse_id: toWarehouseId,
          to_bin_id: toBinId,
        },
      }
    );
    return response.data;
  }

  // ==================== Alerts & Reports ====================

  async getLowStockAlerts(): Promise<LowStockAlert[]> {
    const response = await this.client.get('/inventory/alerts/low-stock');
    return response.data;
  }

  async getExpiringItems(days: number = 7): Promise<ExpiringItemAlert[]> {
    const response = await this.client.get('/inventory/alerts/expiring', {
      params: { days },
    });
    return response.data;
  }

  async markExpiredItems(): Promise<{ message: string; count: number }> {
    const response = await this.client.post('/inventory/alerts/mark-expired');
    return response.data;
  }

  async getInventoryValuation(): Promise<InventoryValuationReport> {
    const response = await this.client.get('/inventory/reports/valuation');
    return response.data;
  }

  async getBatchItems(batchNumber: string): Promise<InventoryItemResponse[]> {
    const response = await this.client.get(
      `/inventory/reports/batch/${batchNumber}`
    );
    return response.data;
  }
}

// Export singleton instance
export const inventoryApi = new InventoryApiClient();
export default inventoryApi;
```

---

## UI Components Guide

### 1. Inventory Dashboard (Home/Overview)

**Purpose**: Main entry point showing key metrics and alerts

**Key Elements:**
- Total inventory value card
- Low stock alerts count (with badge)
- Expiring items count (with urgency indicators)
- Items by category breakdown (pie/donut chart)
- Items by status breakdown (bar chart)
- Quick actions: Add Item, View Alerts, Generate Report

**Data Sources:**
```typescript
// Component lifecycle
useEffect(() => {
  async function loadDashboard() {
    const [valuation, lowStock, expiring] = await Promise.all([
      inventoryApi.getInventoryValuation(),
      inventoryApi.getLowStockAlerts(),
      inventoryApi.getExpiringItems(7),
    ]);

    setValuation(valuation);
    setLowStockCount(lowStock.length);
    setExpiringCount(expiring.length);
  }
  loadDashboard();
}, []);
```

**Design Tips:**
- Use red badge for urgent alerts (expiring in 3 days or less)
- Use yellow badge for warnings (expiring in 7 days, low stock)
- Make cards clickable to navigate to detailed views
- Show loading skeletons during data fetch

---

### 2. Warehouse Management Screen

**Purpose**: Manage warehouses and their bins

**Layout:**
- Warehouse list (cards or table)
- "Add Warehouse" button
- Each warehouse shows:
  - Name, code, address
  - Temperature controlled indicator
  - Storage capacity utilization (progress bar)
  - Number of bins
  - Active/inactive status toggle
  - Edit/Delete actions

**Expandable Bin List:**
- Show bins when warehouse card is expanded
- Display bin code, capacity, items count
- Add/Edit/Delete bin actions

**Example Implementation:**
```typescript
function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [expandedWarehouse, setExpandedWarehouse] = useState<number | null>(null);
  const [bins, setBins] = useState<Record<number, StorageBinResponse[]>>({});

  useEffect(() => {
    loadWarehouses();
  }, []);

  async function loadWarehouses() {
    const data = await inventoryApi.listWarehouses({ is_active: true });
    setWarehouses(data);
  }

  async function loadBins(warehouseId: number) {
    if (!bins[warehouseId]) {
      const data = await inventoryApi.listWarehouseBins(warehouseId);
      setBins({ ...bins, [warehouseId]: data });
    }
    setExpandedWarehouse(warehouseId);
  }

  // Render logic...
}
```

---

### 3. Inventory Items List Screen

**Purpose**: Browse and manage all inventory items

**Features:**
- Advanced filtering sidebar/toolbar:
  - Status dropdown (all/available/reserved/sold/expired/damaged)
  - Warehouse dropdown
  - Inventory type dropdown
  - Batch number search
  - Low stock only checkbox
  - Expiring within X days slider
- Search bar (item name/SKU)
- Sorting (name, quantity, expiry date, value)
- Pagination
- Bulk actions (multi-select to transfer, mark expired, etc.)

**Table Columns:**
- Item name (with thumbnail if photos exist)
- SKU
- Type/Category
- Current quantity + unit
- Status badge
- Warehouse/Bin location
- Expiry date (with visual indicator for urgency)
- Total value
- Actions (View, Edit, Delete)

**Visual Indicators:**
- Red background for expired items
- Orange background for items expiring in 3 days
- Yellow warning icon for low stock items
- Gray out items that are sold/damaged

**Example Filter Implementation:**
```typescript
function InventoryList() {
  const [items, setItems] = useState<InventoryItemResponse[]>([]);
  const [filters, setFilters] = useState<InventoryItemFilters>({
    skip: 0,
    limit: 50,
  });

  useEffect(() => {
    loadItems();
  }, [filters]);

  async function loadItems() {
    const data = await inventoryApi.listInventoryItems(filters);
    setItems(data);
  }

  function handleFilterChange(key: keyof InventoryItemFilters, value: any) {
    setFilters({ ...filters, [key]: value, skip: 0 }); // Reset pagination
  }

  // Render with filters and table...
}
```

---

### 4. Inventory Item Form (Create/Edit)

**Purpose**: Add new inventory or edit existing

**Form Fields:**

**Basic Information:**
- Item name* (text input)
- Description (textarea)
- SKU (text input, auto-generate option)
- Inventory type* (dropdown/autocomplete)
- Status* (dropdown)

**Quantity & Location:**
- Current quantity* (number input)
- Unit* (dropdown: kg, dozen, bunch, etc.)
- Minimum quantity (number input, for low stock alerts)
- Warehouse* (dropdown)
- Storage bin (dropdown, filtered by selected warehouse)

**Dates & Cost:**
- Acquisition date (date picker)
- Expiry date (date picker, show warning if perishable)
- Cost per unit (number input)
- Currency (dropdown, default ZAR)

**Traceability:**
- Batch number (text input)
- Lot number (text input)
- Related crop (dropdown, optional)
- Related animal (dropdown, optional)

**Media & Notes:**
- Photos (image uploader, multiple files)
- Notes (textarea)
- Custom fields (JSON editor or key-value pairs, optional)

**Validation Rules:**
- Required fields marked with *
- Quantity must be >= 0
- Expiry date must be future date (warn if past)
- Cost per unit must be >= 0
- If perishable inventory type selected, suggest setting expiry date

**Example:**
```typescript
function InventoryItemForm({ itemId }: { itemId?: number }) {
  const [formData, setFormData] = useState<InventoryItemCreate>({
    item_name: '',
    current_quantity: 0,
    unit: 'kg',
    status: InventoryStatusEnum.AVAILABLE,
    currency: 'ZAR',
    // ... other fields
  });

  useEffect(() => {
    if (itemId) {
      loadItem();
    }
  }, [itemId]);

  async function loadItem() {
    const item = await inventoryApi.getInventoryItem(itemId!);
    setFormData(item);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (itemId) {
      await inventoryApi.updateInventoryItem(itemId, formData);
    } else {
      await inventoryApi.createInventoryItem(formData);
    }
    // Navigate back or show success message
  }

  // Render form...
}
```

---

### 5. Transaction History Viewer

**Purpose**: Show audit trail for inventory item

**Display:**
- Timeline view showing all transactions
- Each transaction shows:
  - Date/time
  - Transaction type badge (add/remove/adjustment/transfer/sale/spoilage)
  - Quantity change (with +/- indicator)
  - Quantity before → quantity after
  - Location changes (for transfers)
  - Cost information
  - Performed by (user name)
  - Notes
- Filter by transaction type
- Export to CSV button

**Example:**
```typescript
function TransactionHistory({ itemId }: { itemId: number }) {
  const [transactions, setTransactions] = useState<InventoryTransactionResponse[]>([]);

  useEffect(() => {
    loadTransactions();
  }, [itemId]);

  async function loadTransactions() {
    const data = await inventoryApi.getItemTransactions(itemId);
    setTransactions(data);
  }

  return (
    <div className="transaction-timeline">
      {transactions.map((txn) => (
        <div key={txn.id} className={`transaction-item ${txn.transaction_type}`}>
          <div className="transaction-date">{formatDate(txn.transaction_date)}</div>
          <div className="transaction-type-badge">{txn.transaction_type}</div>
          <div className="quantity-change">
            {txn.quantity_change > 0 ? '+' : ''}{txn.quantity_change}
          </div>
          <div className="quantity-summary">
            {txn.quantity_before} → {txn.quantity_after}
          </div>
          {txn.notes && <div className="notes">{txn.notes}</div>}
        </div>
      ))}
    </div>
  );
}
```

---

### 6. Low Stock Alerts Screen

**Purpose**: Show all items below minimum quantity

**Display:**
- Alert list showing:
  - Item name
  - Current quantity vs minimum quantity (with progress bar)
  - Unit
  - Warehouse/bin location
  - Reorder point (from inventory type)
  - Suggested reorder quantity (from inventory type)
  - Quick action: "Restock" button (opens form to log new stock)
- Sort by urgency (most critical first)
- Filter by warehouse
- "Mark as reviewed" or "Dismiss" actions

**Example:**
```typescript
function LowStockAlerts() {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    const data = await inventoryApi.getLowStockAlerts();
    setAlerts(data);
  }

  function calculateUrgency(alert: LowStockAlert): number {
    // Return percentage of how low we are
    return (alert.current_quantity / alert.minimum_quantity) * 100;
  }

  return (
    <div className="low-stock-alerts">
      {alerts
        .sort((a, b) => calculateUrgency(a) - calculateUrgency(b))
        .map((alert) => (
          <div key={alert.item_id} className="alert-card">
            <h3>{alert.item_name}</h3>
            <div className="quantity-bar">
              <ProgressBar
                current={alert.current_quantity}
                minimum={alert.minimum_quantity}
                unit={alert.unit}
                variant="warning"
              />
            </div>
            <p>Location: {alert.warehouse_name} - {alert.bin_code}</p>
            <button onClick={() => handleRestock(alert.item_id)}>
              Restock Now
            </button>
          </div>
        ))}
    </div>
  );
}
```

---

### 7. Expiry Management Screen

**Purpose**: Monitor items approaching expiry

**Tabs:**
1. **Expiring Soon (7 days)** - Yellow warning
2. **Urgent (3 days)** - Orange alert
3. **Expired** - Red critical

**For Each Item:**
- Item name
- Current quantity
- Expiry date (with countdown)
- Batch number
- Warehouse location
- Suggested actions:
  - Create discount/sale
  - Mark as expired
  - Extend expiry (if applicable)

**Bulk Actions:**
- Select multiple items to mark as expired
- Generate expiry report

**Example:**
```typescript
function ExpiryManagement() {
  const [expiring7d, setExpiring7d] = useState<ExpiringItemAlert[]>([]);
  const [expiring3d, setExpiring3d] = useState<ExpiringItemAlert[]>([]);
  const [expired, setExpired] = useState<ExpiringItemAlert[]>([]);
  const [activeTab, setActiveTab] = useState<'7d' | '3d' | 'expired'>('7d');

  useEffect(() => {
    loadExpiryData();
  }, []);

  async function loadExpiryData() {
    const [data7d, data3d, dataExpired] = await Promise.all([
      inventoryApi.getExpiringItems(7),
      inventoryApi.getExpiringItems(3),
      inventoryApi.getExpiringItems(0), // 0 = expired
    ]);
    setExpiring7d(data7d);
    setExpiring3d(data3d);
    setExpired(dataExpired);
  }

  async function handleMarkExpired() {
    const result = await inventoryApi.markExpiredItems();
    alert(`Marked ${result.count} items as expired`);
    loadExpiryData(); // Reload
  }

  // Render with tabs...
}
```

---

### 8. Batch Tracking Screen

**Purpose**: View all items from a specific batch (FIFO management)

**Features:**
- Batch number search input
- Display all items in batch:
  - Item details
  - Acquisition date (sorted oldest first for FIFO)
  - Current quantity
  - Status
  - Location
- Total quantity in batch
- Total value in batch
- Batch notes/metadata

**Use Cases:**
- Wholesalers tracking shipments from farmers
- Food safety recalls (trace batch origin)
- FIFO inventory management (sell oldest first)

**Example:**
```typescript
function BatchTracking() {
  const [batchNumber, setBatchNumber] = useState('');
  const [items, setItems] = useState<InventoryItemResponse[]>([]);

  async function searchBatch() {
    if (!batchNumber) return;
    const data = await inventoryApi.getBatchItems(batchNumber);
    setItems(data);
  }

  const totalQuantity = items.reduce((sum, item) => sum + item.current_quantity, 0);
  const totalValue = items.reduce((sum, item) => sum + (item.total_value || 0), 0);

  return (
    <div className="batch-tracking">
      <div className="search-bar">
        <input
          type="text"
          value={batchNumber}
          onChange={(e) => setBatchNumber(e.target.value)}
          placeholder="Enter batch number"
        />
        <button onClick={searchBatch}>Search</button>
      </div>

      {items.length > 0 && (
        <>
          <div className="batch-summary">
            <h3>Batch: {batchNumber}</h3>
            <p>Total Items: {items.length}</p>
            <p>Total Quantity: {totalQuantity}</p>
            <p>Total Value: {totalValue} ZAR</p>
          </div>

          <div className="batch-items">
            {items
              .sort((a, b) =>
                new Date(a.acquisition_date || 0).getTime() -
                new Date(b.acquisition_date || 0).getTime()
              )
              .map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
          </div>
        </>
      )}
    </div>
  );
}
```

---

### 9. Valuation Report Screen

**Purpose**: Show total inventory value and breakdowns

**Display:**
- **Summary Cards:**
  - Total items count
  - Total quantity
  - Total value (in ZAR)

- **By Category Chart** (Pie/Donut):
  - Harvest: X ZAR
  - Meat: Y ZAR
  - Poultry: Z ZAR
  - etc.

- **By Status Chart** (Bar):
  - Available: X items
  - Reserved: Y items
  - Sold: Z items
  - etc.

- Export options: PDF, Excel, CSV
- Date range filter (for historical trends in future phases)

**Example:**
```typescript
function ValuationReport() {
  const [report, setReport] = useState<InventoryValuationReport | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  async function loadReport() {
    const data = await inventoryApi.getInventoryValuation();
    setReport(data);
  }

  if (!report) return <LoadingSpinner />;

  return (
    <div className="valuation-report">
      <div className="summary-cards">
        <Card title="Total Items" value={report.total_items} />
        <Card title="Total Quantity" value={report.total_quantity} />
        <Card
          title="Total Value"
          value={`${report.total_value} ${report.currency}`}
        />
      </div>

      <div className="charts">
        <PieChart
          data={Object.entries(report.by_category)}
          title="Value by Category"
        />
        <BarChart
          data={Object.entries(report.by_status)}
          title="Items by Status"
        />
      </div>

      <button onClick={() => exportToPDF(report)}>Export PDF</button>
      <button onClick={() => exportToExcel(report)}>Export Excel</button>
    </div>
  );
}
```

---

### 10. Item Transfer Dialog/Modal

**Purpose**: Transfer inventory item between warehouses or bins

**Form:**
- Source location (read-only, current warehouse/bin)
- Destination warehouse* (dropdown)
- Destination bin (dropdown, filtered by selected warehouse)
- Transfer notes (textarea)
- Confirm button

**Validation:**
- Cannot transfer to same location
- Destination warehouse must be active

**On Success:**
- Update item location
- Log transaction automatically (backend does this)
- Show success notification
- Refresh item details

**Example:**
```typescript
function TransferItemDialog({
  item,
  isOpen,
  onClose
}: {
  item: InventoryItemResponse;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [toWarehouseId, setToWarehouseId] = useState<number | null>(null);
  const [toBinId, setToBinId] = useState<number | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [bins, setBins] = useState<StorageBinResponse[]>([]);

  useEffect(() => {
    loadWarehouses();
  }, []);

  useEffect(() => {
    if (toWarehouseId) {
      loadBins(toWarehouseId);
    }
  }, [toWarehouseId]);

  async function loadWarehouses() {
    const data = await inventoryApi.listWarehouses({ is_active: true });
    setWarehouses(data.filter(w => w.id !== item.warehouse_id));
  }

  async function loadBins(warehouseId: number) {
    const data = await inventoryApi.listWarehouseBins(warehouseId);
    setBins(data.filter(b => b.is_active));
  }

  async function handleTransfer() {
    if (!toWarehouseId) {
      alert('Please select a destination warehouse');
      return;
    }

    await inventoryApi.transferItem(item.id, toWarehouseId, toBinId || undefined);
    alert('Item transferred successfully');
    onClose();
  }

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose}>
      <h2>Transfer {item.item_name}</h2>

      <div className="current-location">
        <p>Current Location:</p>
        <p>Warehouse ID: {item.warehouse_id}</p>
        <p>Bin ID: {item.bin_id || 'None'}</p>
      </div>

      <div className="transfer-form">
        <label>
          Destination Warehouse*
          <select
            value={toWarehouseId || ''}
            onChange={(e) => setToWarehouseId(Number(e.target.value))}
          >
            <option value="">Select warehouse</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.warehouse_name}</option>
            ))}
          </select>
        </label>

        <label>
          Destination Bin (optional)
          <select
            value={toBinId || ''}
            onChange={(e) => setToBinId(Number(e.target.value) || null)}
            disabled={!toWarehouseId}
          >
            <option value="">No specific bin</option>
            {bins.map(b => (
              <option key={b.id} value={b.id}>{b.bin_name} ({b.bin_code})</option>
            ))}
          </select>
        </label>

        <div className="actions">
          <button onClick={handleTransfer}>Transfer</button>
          <button onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Modal>
  );
}
```

---

## Example Usage Patterns

### Pattern 1: Dashboard with Real-time Alerts

```typescript
function DashboardWithAlerts() {
  const [showLowStockBadge, setShowLowStockBadge] = useState(false);
  const [showExpiryBadge, setShowExpiryBadge] = useState(false);

  useEffect(() => {
    async function checkAlerts() {
      const [lowStock, expiring] = await Promise.all([
        inventoryApi.getLowStockAlerts(),
        inventoryApi.getExpiringItems(7),
      ]);

      setShowLowStockBadge(lowStock.length > 0);
      setShowExpiryBadge(expiring.length > 0);
    }

    checkAlerts();
    const interval = setInterval(checkAlerts, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <NavButton to="/alerts/low-stock" badge={showLowStockBadge} />
      <NavButton to="/alerts/expiring" badge={showExpiryBadge} />
    </div>
  );
}
```

### Pattern 2: Infinite Scroll for Inventory List

```typescript
function InfiniteInventoryList() {
  const [items, setItems] = useState<InventoryItemResponse[]>([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 50;

  async function loadMore() {
    const newItems = await inventoryApi.listInventoryItems({
      skip,
      limit,
    });

    if (newItems.length < limit) {
      setHasMore(false);
    }

    setItems([...items, ...newItems]);
    setSkip(skip + limit);
  }

  useEffect(() => {
    loadMore();
  }, []);

  return (
    <InfiniteScroll
      dataLength={items.length}
      next={loadMore}
      hasMore={hasMore}
      loader={<LoadingSpinner />}
    >
      {items.map(item => <ItemCard key={item.id} item={item} />)}
    </InfiniteScroll>
  );
}
```

### Pattern 3: Optimistic UI Updates

```typescript
async function updateItemQuantity(itemId: number, newQuantity: number) {
  // Optimistically update UI
  setItems(items.map(item =>
    item.id === itemId
      ? { ...item, current_quantity: newQuantity }
      : item
  ));

  try {
    // Make API call
    await inventoryApi.updateInventoryItem(itemId, {
      current_quantity: newQuantity,
    });
  } catch (error) {
    // Rollback on error
    console.error('Failed to update quantity:', error);
    // Reload from server to get correct state
    const updated = await inventoryApi.getInventoryItem(itemId);
    setItems(items.map(item =>
      item.id === itemId ? updated : item
    ));
    alert('Failed to update quantity');
  }
}
```

### Pattern 4: Dependent Dropdowns (Warehouse → Bin)

```typescript
function WarehouseAndBinSelector({
  onSelect
}: {
  onSelect: (warehouseId: number, binId?: number) => void
}) {
  const [warehouses, setWarehouses] = useState<WarehouseResponse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<number | null>(null);
  const [bins, setBins] = useState<StorageBinResponse[]>([]);
  const [selectedBin, setSelectedBin] = useState<number | null>(null);

  useEffect(() => {
    inventoryApi.listWarehouses({ is_active: true }).then(setWarehouses);
  }, []);

  useEffect(() => {
    if (selectedWarehouse) {
      inventoryApi
        .listWarehouseBins(selectedWarehouse, { is_active: true })
        .then(setBins);
    } else {
      setBins([]);
    }
    setSelectedBin(null); // Reset bin when warehouse changes
  }, [selectedWarehouse]);

  useEffect(() => {
    if (selectedWarehouse) {
      onSelect(selectedWarehouse, selectedBin || undefined);
    }
  }, [selectedWarehouse, selectedBin]);

  return (
    <>
      <select
        value={selectedWarehouse || ''}
        onChange={(e) => setSelectedWarehouse(Number(e.target.value))}
      >
        <option value="">Select Warehouse</option>
        {warehouses.map(w => (
          <option key={w.id} value={w.id}>{w.warehouse_name}</option>
        ))}
      </select>

      <select
        value={selectedBin || ''}
        onChange={(e) => setSelectedBin(Number(e.target.value) || null)}
        disabled={!selectedWarehouse || bins.length === 0}
      >
        <option value="">Select Bin (optional)</option>
        {bins.map(b => (
          <option key={b.id} value={b.id}>
            {b.bin_name} ({b.bin_code})
          </option>
        ))}
      </select>
    </>
  );
}
```

---

## Error Handling

### Standard Error Response Format

The backend returns errors in this format:

```json
{
  "detail": "Error message here"
}
```

### Common HTTP Status Codes

- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Success with no response body (DELETE operations)
- `400 Bad Request` - Validation error or invalid data
- `403 Forbidden` - Not authorized to access resource
- `404 Not Found` - Resource doesn't exist
- `500 Internal Server Error` - Server error

### Error Handling Pattern

```typescript
import { AxiosError } from 'axios';

async function handleApiCall() {
  try {
    const result = await inventoryApi.createInventoryItem(data);
    return result;
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.response?.status === 400) {
        alert('Invalid data: ' + error.response.data.detail);
      } else if (error.response?.status === 403) {
        alert('You do not have permission to perform this action');
      } else if (error.response?.status === 404) {
        alert('Resource not found');
      } else {
        alert('An error occurred. Please try again.');
      }
    }
    throw error;
  }
}
```

### Form Validation Before API Call

```typescript
function validateInventoryItem(data: InventoryItemCreate): string[] {
  const errors: string[] = [];

  if (!data.item_name || data.item_name.trim() === '') {
    errors.push('Item name is required');
  }

  if (data.current_quantity < 0) {
    errors.push('Quantity cannot be negative');
  }

  if (!data.inventory_type_id) {
    errors.push('Inventory type is required');
  }

  if (data.cost_per_unit && data.cost_per_unit < 0) {
    errors.push('Cost per unit cannot be negative');
  }

  if (data.expiry_date) {
    const expiryDate = new Date(data.expiry_date);
    if (expiryDate < new Date()) {
      errors.push('Warning: Expiry date is in the past');
    }
  }

  return errors;
}
```

---

## Testing Checklist

### Unit Tests

- [ ] API client methods call correct endpoints
- [ ] API client adds auth token to requests
- [ ] Type guards work correctly
- [ ] Validation functions catch invalid data
- [ ] Error handlers parse responses correctly

### Integration Tests

- [ ] Create inventory item → appears in list
- [ ] Update item → changes reflected
- [ ] Delete item → removed from list
- [ ] Filter by status → correct items shown
- [ ] Filter by warehouse → correct items shown
- [ ] Transfer item → location updated
- [ ] Low stock alerts → only items below minimum shown
- [ ] Expiring items → correct urgency levels
- [ ] Batch tracking → all items in batch returned
- [ ] Valuation report → totals calculated correctly

### User Acceptance Tests

- [ ] Farmer can add harvested produce to inventory
- [ ] Wholesaler can track batches from multiple farmers
- [ ] Low stock notifications appear on dashboard
- [ ] Expiring items show correct countdown
- [ ] Transfer between warehouses works smoothly
- [ ] Transaction history shows all changes
- [ ] Reports display accurate data
- [ ] Mobile responsive on all screens
- [ ] Loading states show during API calls
- [ ] Error messages are user-friendly

### Performance Tests

- [ ] List loads in < 2 seconds with 1000 items
- [ ] Filters apply without page reload
- [ ] Pagination works smoothly
- [ ] Image uploads don't freeze UI
- [ ] Dashboard loads all data in < 3 seconds

---

## Additional Notes

### Authentication

All endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

The API client automatically adds this from localStorage (adjust based on your auth implementation).

### Backend Features Automatically Handled

The backend automatically:
- Links all inventory to the authenticated user's account
- Logs transactions when quantity changes
- Calculates `total_value` (quantity × cost_per_unit)
- Sets computed properties (`is_low_stock`, `is_expired`)
- Validates ownership (users can only access their own inventory)
- Enforces business rules (can't delete inventory in use, etc.)

### Future Enhancements (Phase 2+)

These features are planned but not yet implemented:
- Harvest → Inventory automatic creation (Phase 2)
- Livestock yields → Inventory (Phase 2)
- Product listings linked to inventory (Phase 3)
- Order → Inventory reservation (Phase 4)
- Real-time notifications via WebSocket

### Mobile Considerations

For mobile apps (React Native, Flutter, etc.):
- Use the same REST API endpoints
- Implement offline support with local SQLite cache
- Sync changes when network available
- Use native date/time pickers
- Implement barcode scanning for SKU/batch numbers
- Use camera for photo uploads
- Show push notifications for alerts

### Accessibility

Ensure your UI components:
- Use semantic HTML elements
- Include ARIA labels for screen readers
- Support keyboard navigation
- Have sufficient color contrast
- Provide text alternatives for images
- Support screen reader announcements for dynamic content

---

## Support & Questions

If you encounter issues or have questions about the API:

1. Check the backend API documentation at `/api/v1/docs` (Swagger UI)
2. Review backend code:
   - Endpoints: `app/api/v1/endpoints/inventory.py`
   - Schemas: `app/schemas/inventory.py`
   - Service logic: `app/services/inventory_service.py`
3. Check database models: `app/models/inventory.py`
4. Contact backend team for clarifications

---

## Quick Start Checklist

- [ ] Copy type definitions to `src/types/inventory.ts`
- [ ] Copy API client to `src/services/inventoryApi.ts`
- [ ] Configure API base URL and auth token handling
- [ ] Test API connection with a simple GET request
- [ ] Build dashboard component first (shows all key data)
- [ ] Implement inventory list with filtering
- [ ] Add create/edit forms
- [ ] Implement alerts screens
- [ ] Add transaction history viewer
- [ ] Test end-to-end workflows
- [ ] Deploy and monitor

---

**Document Version**: 1.0
**Last Updated**: 2025-10-15
**Backend Phase**: Phase 1 Complete
**Status**: Ready for Frontend Implementation
