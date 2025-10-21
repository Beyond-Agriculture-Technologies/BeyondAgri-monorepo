// ==================== Enums ====================

export enum InventoryCategoryEnum {
  HARVEST = 'harvest',
  MEAT = 'meat',
  POULTRY = 'poultry',
  PACKAGING = 'packaging',
  SUPPLIES = 'supplies',
}

export enum InventoryStatusEnum {
  AVAILABLE = 'available',
  RESERVED = 'reserved',
  SOLD = 'sold',
  EXPIRED = 'expired',
  DAMAGED = 'damaged',
}

export enum TransactionTypeEnum {
  ADD = 'add',
  REMOVE = 'remove',
  ADJUSTMENT = 'adjustment',
  TRANSFER = 'transfer',
  SALE = 'sale',
  SPOILAGE = 'spoilage',
  RETURN = 'return',
}

// ==================== Inventory Types ====================

export interface InventoryTypeBase {
  type_name: string
  category: InventoryCategoryEnum
  description?: string
  unit_of_measure: string
  perishable: boolean
  typical_shelf_life_days?: number
  reorder_point?: number
  reorder_quantity?: number
}

export interface InventoryTypeCreate extends InventoryTypeBase {
  account_id?: number
}

export interface InventoryTypeUpdate {
  type_name?: string
  category?: InventoryCategoryEnum
  description?: string
  unit_of_measure?: string
  perishable?: boolean
  typical_shelf_life_days?: number
  reorder_point?: number
  reorder_quantity?: number
}

export interface InventoryTypeResponse extends InventoryTypeBase {
  id: number
  account_id?: number
  created_at: string
  updated_at: string
}

// ==================== Warehouses ====================

export interface WarehouseBase {
  warehouse_name: string
  warehouse_code?: string
  address?: string
  city?: string
  province?: string
  postal_code?: string
  country: string
  latitude?: number
  longitude?: number
  storage_capacity?: number
  capacity_unit?: string
  temperature_controlled: boolean
  min_temperature?: number
  max_temperature?: number
  is_active: boolean
}

export type WarehouseCreate = WarehouseBase

export interface WarehouseUpdate {
  warehouse_name?: string
  warehouse_code?: string
  address?: string
  city?: string
  province?: string
  postal_code?: string
  country?: string
  latitude?: number
  longitude?: number
  storage_capacity?: number
  capacity_unit?: string
  temperature_controlled?: boolean
  min_temperature?: number
  max_temperature?: number
  is_active?: boolean
}

export interface WarehouseResponse extends WarehouseBase {
  id: number
  account_id: number
  created_at: string
  updated_at: string
  // Simplified properties for compatibility
  name?: string
  location?: string
}

// ==================== Storage Bins ====================

export interface StorageBinBase {
  bin_name: string
  bin_code: string
  capacity?: number
  capacity_unit?: string
  is_active: boolean
}

export interface StorageBinCreate extends StorageBinBase {
  warehouse_id: number
}

export interface StorageBinUpdate {
  bin_name?: string
  bin_code?: string
  capacity?: number
  capacity_unit?: string
  is_active?: boolean
}

export interface StorageBinResponse extends StorageBinBase {
  id: number
  warehouse_id: number
  created_at: string
  updated_at: string
}

// ==================== Inventory Items ====================

export interface InventoryItemBase {
  item_name: string
  description?: string
  sku?: string
  current_quantity: number
  unit: string
  minimum_quantity?: number
  acquisition_date?: string
  expiry_date?: string
  cost_per_unit?: number
  currency: string
  batch_number?: string
  lot_number?: string
  status: InventoryStatusEnum
  related_crop_id?: number
  related_animal_id?: number
  photos?: string[]
  custom_fields?: Record<string, any>
  notes?: string
}

export interface InventoryItemCreate extends InventoryItemBase {
  inventory_type_id: number
  warehouse_id?: number
  bin_id?: number
}

export interface InventoryItemUpdate {
  item_name?: string
  description?: string
  sku?: string
  current_quantity?: number
  unit?: string
  minimum_quantity?: number
  acquisition_date?: string
  expiry_date?: string
  cost_per_unit?: number
  currency?: string
  batch_number?: string
  lot_number?: string
  status?: InventoryStatusEnum
  warehouse_id?: number
  bin_id?: number
  related_crop_id?: number
  related_animal_id?: number
  photos?: string[]
  custom_fields?: Record<string, any>
  notes?: string
}

export interface InventoryItemResponse extends InventoryItemBase {
  id: number
  account_id: number
  inventory_type_id: number
  warehouse_id?: number
  bin_id?: number
  total_value?: number
  created_at: string
  updated_at: string
  is_low_stock: boolean
  is_expired: boolean
  // Extended properties from API joins
  product_name?: string
  quantity?: number
  warehouse_name?: string
  bin_number?: string
  supplier_name?: string
  origin?: string
  harvest_date?: string
}

// ==================== Transactions ====================

export interface InventoryTransactionBase {
  transaction_type: TransactionTypeEnum
  quantity_change: number
  from_location_id?: number
  to_location_id?: number
  cost_per_unit?: number
  related_order_id?: number
  related_task_id?: number
  notes?: string
  metadata?: Record<string, any>
}

export interface InventoryTransactionCreate extends InventoryTransactionBase {
  inventory_item_id: number
}

export interface InventoryTransactionResponse extends InventoryTransactionBase {
  id: number
  inventory_item_id: number
  transaction_date: string
  quantity_before?: number
  quantity_after?: number
  total_cost?: number
  performed_by_account_id?: number
  created_at: string
  updated_at: string
}

// ==================== Alerts & Reports ====================

export interface LowStockAlert {
  item_id: number
  item_name: string
  current_quantity: number
  minimum_quantity: number
  unit: string
  warehouse_name?: string
  bin_code?: string
}

export interface ExpiringItemAlert {
  item_id: number
  item_name: string
  current_quantity: number
  unit: string
  expiry_date: string
  days_until_expiry: number
  batch_number?: string
  warehouse_name?: string
}

export interface InventoryValuationReport {
  total_items: number
  total_quantity: number
  total_value: number
  currency: string
  by_category: Record<string, number>
  by_status: Record<string, number>
  by_warehouse?: Record<string, number>
  item_count?: number
  last_updated?: string
}

// ==================== Query Parameters ====================

export interface InventoryItemFilters {
  status?: InventoryStatusEnum
  warehouse_id?: number
  inventory_type_id?: number
  batch_number?: string
  low_stock_only?: boolean
  expiring_within_days?: number
  skip?: number
  limit?: number
}

export interface InventoryTypeFilters {
  category?: InventoryCategoryEnum
  skip?: number
  limit?: number
}

export interface WarehouseFilters {
  is_active?: boolean
  skip?: number
  limit?: number
}

export interface StorageBinFilters {
  is_active?: boolean
}

export interface TransactionFilters {
  skip?: number
  limit?: number
}
