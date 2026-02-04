import { create } from 'zustand'
import {
  InventoryItemResponse,
  InventoryItemCreate,
  InventoryItemUpdate,
  WarehouseResponse,
  WarehouseCreate,
  WarehouseUpdate,
  InventoryTypeResponse,
  InventoryTypeCreate,
  StorageBinResponse,
  StorageBinCreate,
  StorageBinUpdate,
  InventoryTransactionResponse,
  LowStockAlert,
  ExpiringItemAlert,
  InventoryValuationReport,
  InventoryItemFilters,
  TransactionFilters,
} from '../types/inventory'
import { inventoryApi } from '../services/inventoryApi'
import { getErrorMessage } from '../utils/error-handler'

interface InventoryState {
  // Items
  items: InventoryItemResponse[]
  currentItem: InventoryItemResponse | null
  itemsLoading: boolean
  itemsError: string | null

  // Warehouses
  warehouses: WarehouseResponse[]
  warehousesLoading: boolean
  warehousesError: string | null

  // Bins
  bins: Record<number, StorageBinResponse[]> // keyed by warehouse_id
  binsLoading: boolean

  // Types
  inventoryTypes: InventoryTypeResponse[]
  typesLoading: boolean
  typesError: string | null

  // Alerts
  lowStockAlerts: LowStockAlert[]
  expiringAlerts: ExpiringItemAlert[]
  alertsLoading: boolean
  alertsError: string | null

  // Reports
  valuation: InventoryValuationReport | null
  valuationLoading: boolean
  valuationError: string | null

  // Transactions
  transactions: InventoryTransactionResponse[]
  transactionsLoading: boolean
  transactionsError: string | null

  // Batches (grouped items by batch_number)
  batches: Map<string, InventoryItemResponse[]>
  batchesLoading: boolean
  batchesError: string | null

  // Transfer Modal State
  transferModal: {
    open: boolean
    item: InventoryItemResponse | null
    sourceWarehouseId: number | null
    sourceBinId: number | null
  }

  // Advanced Search Filters
  searchFilters: InventoryItemFilters

  // Actions - Items
  fetchItems: (filters?: InventoryItemFilters) => Promise<void>
  fetchItem: (itemId: number) => Promise<void>
  fetchItemById: (itemId: number) => Promise<void> // Alias for fetchItem
  createItem: (data: InventoryItemCreate) => Promise<InventoryItemResponse | null>
  updateItem: (itemId: number, data: InventoryItemUpdate) => Promise<InventoryItemResponse | null>
  deleteItem: (itemId: number) => Promise<boolean>
  clearCurrentItem: () => void

  // Actions - Warehouses
  fetchWarehouses: () => Promise<void>
  createWarehouse: (data: WarehouseCreate) => Promise<WarehouseResponse | null>
  updateWarehouse: (warehouseId: number, data: WarehouseUpdate) => Promise<WarehouseResponse | null>
  deleteWarehouse: (warehouseId: number) => Promise<boolean>

  // Actions - Bins
  fetchBins: (warehouseId: number) => Promise<void>
  createBin: (warehouseId: number, data: StorageBinCreate) => Promise<StorageBinResponse | null>
  updateBin: (binId: number, data: StorageBinUpdate) => Promise<StorageBinResponse | null>
  deleteBin: (binId: number) => Promise<boolean>

  // Actions - Types
  fetchInventoryTypes: () => Promise<void>
  createInventoryType: (data: InventoryTypeCreate) => Promise<InventoryTypeResponse | null>

  // Actions - Alerts
  fetchLowStockAlerts: () => Promise<void>
  fetchExpiringAlerts: (days?: number) => Promise<void>
  markExpiredItems: () => Promise<number>

  // Actions - Reports
  fetchValuation: () => Promise<void>

  // Actions - Transfers
  transferItem: (itemId: number, toWarehouseId: number, toBinId?: number) => Promise<boolean>
  openTransferModal: (item: InventoryItemResponse) => void
  closeTransferModal: () => void

  // Actions - Transactions
  fetchTransactions: (itemId?: number, filters?: TransactionFilters) => Promise<void>

  // Actions - Batches
  fetchBatches: () => Promise<void>
  fetchBatchItems: (batchNumber: string) => Promise<void>

  // Actions - Search
  setSearchFilters: (filters: Partial<InventoryItemFilters>) => void
  clearSearchFilters: () => void
  searchItems: () => Promise<void>

  // Reset
  reset: () => void
}

const initialState = {
  items: [],
  currentItem: null,
  itemsLoading: false,
  itemsError: null,

  warehouses: [],
  warehousesLoading: false,
  warehousesError: null,

  bins: {},
  binsLoading: false,

  inventoryTypes: [],
  typesLoading: false,
  typesError: null,

  lowStockAlerts: [],
  expiringAlerts: [],
  alertsLoading: false,
  alertsError: null,

  valuation: null,
  valuationLoading: false,
  valuationError: null,

  transactions: [],
  transactionsLoading: false,
  transactionsError: null,

  batches: new Map(),
  batchesLoading: false,
  batchesError: null,

  transferModal: {
    open: false,
    item: null,
    sourceWarehouseId: null,
    sourceBinId: null,
  },

  searchFilters: {},
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  ...initialState,

  // ==================== Items ====================

  fetchItems: async (filters?: InventoryItemFilters) => {
    set({ itemsLoading: true, itemsError: null })
    try {
      const result = await inventoryApi.listInventoryItems(filters)
      if (result.success) {
        set({ items: result.data, itemsLoading: false })
      } else {
        set({ itemsError: result.message, itemsLoading: false })
      }
    } catch (error: unknown) {
      set({ itemsError: getErrorMessage(error), itemsLoading: false })
    }
  },

  fetchItem: async (itemId: number) => {
    set({ itemsLoading: true, itemsError: null })
    try {
      const result = await inventoryApi.getInventoryItem(itemId)
      if (result.success) {
        set({ currentItem: result.data, itemsLoading: false })
      } else {
        set({ itemsError: result.message, itemsLoading: false })
      }
    } catch (error: unknown) {
      set({ itemsError: getErrorMessage(error), itemsLoading: false })
    }
  },

  fetchItemById: async (itemId: number) => {
    // Alias for fetchItem
    return get().fetchItem(itemId)
  },

  createItem: async (data: InventoryItemCreate) => {
    set({ itemsLoading: true, itemsError: null })
    try {
      const result = await inventoryApi.createInventoryItem(data)
      if (result.success) {
        set(state => ({
          items: [...state.items, result.data],
          itemsLoading: false,
        }))
        return result.data
      } else {
        set({ itemsError: result.message, itemsLoading: false })
        return null
      }
    } catch (error: unknown) {
      set({ itemsError: getErrorMessage(error), itemsLoading: false })
      return null
    }
  },

  updateItem: async (itemId: number, data: InventoryItemUpdate) => {
    set({ itemsLoading: true, itemsError: null })
    try {
      const result = await inventoryApi.updateInventoryItem(itemId, data)
      if (result.success) {
        set(state => ({
          items: state.items.map(item => (item.id === itemId ? result.data : item)),
          currentItem: state.currentItem?.id === itemId ? result.data : state.currentItem,
          itemsLoading: false,
        }))
        return result.data
      } else {
        set({ itemsError: result.message, itemsLoading: false })
        return null
      }
    } catch (error: unknown) {
      set({ itemsError: getErrorMessage(error), itemsLoading: false })
      return null
    }
  },

  deleteItem: async (itemId: number) => {
    set({ itemsLoading: true, itemsError: null })
    try {
      const result = await inventoryApi.deleteInventoryItem(itemId)
      if (result.success) {
        set(state => ({
          items: state.items.filter(item => item.id !== itemId),
          currentItem: state.currentItem?.id === itemId ? null : state.currentItem,
          itemsLoading: false,
        }))
        return true
      } else {
        set({ itemsError: result.message, itemsLoading: false })
        return false
      }
    } catch (error: unknown) {
      set({ itemsError: getErrorMessage(error), itemsLoading: false })
      return false
    }
  },

  clearCurrentItem: () => {
    set({ currentItem: null })
  },

  // ==================== Warehouses ====================

  fetchWarehouses: async () => {
    set({ warehousesLoading: true, warehousesError: null })
    try {
      const result = await inventoryApi.listWarehouses({ is_active: true })
      if (result.success) {
        set({ warehouses: result.data, warehousesLoading: false })
      } else {
        set({ warehousesError: result.message, warehousesLoading: false })
      }
    } catch (error: unknown) {
      set({ warehousesError: getErrorMessage(error), warehousesLoading: false })
    }
  },

  createWarehouse: async (data: WarehouseCreate) => {
    set({ warehousesLoading: true, warehousesError: null })
    try {
      const result = await inventoryApi.createWarehouse(data)
      if (result.success) {
        set(state => ({
          warehouses: [...state.warehouses, result.data],
          warehousesLoading: false,
        }))
        return result.data
      } else {
        set({ warehousesError: result.message, warehousesLoading: false })
        return null
      }
    } catch (error: unknown) {
      set({ warehousesError: getErrorMessage(error), warehousesLoading: false })
      return null
    }
  },

  updateWarehouse: async (warehouseId: number, data: WarehouseUpdate) => {
    set({ warehousesLoading: true, warehousesError: null })
    try {
      const result = await inventoryApi.updateWarehouse(warehouseId, data)
      if (result.success) {
        set(state => ({
          warehouses: state.warehouses.map(warehouse =>
            warehouse.id === warehouseId ? result.data : warehouse
          ),
          warehousesLoading: false,
        }))
        return result.data
      } else {
        set({ warehousesError: result.message, warehousesLoading: false })
        return null
      }
    } catch (error: unknown) {
      set({ warehousesError: getErrorMessage(error), warehousesLoading: false })
      return null
    }
  },

  deleteWarehouse: async (warehouseId: number) => {
    set({ warehousesLoading: true, warehousesError: null })
    try {
      const result = await inventoryApi.deleteWarehouse(warehouseId)
      if (result.success) {
        set(state => ({
          warehouses: state.warehouses.filter(warehouse => warehouse.id !== warehouseId),
          warehousesLoading: false,
        }))
        return true
      } else {
        set({ warehousesError: result.message, warehousesLoading: false })
        return false
      }
    } catch (error: unknown) {
      set({ warehousesError: getErrorMessage(error), warehousesLoading: false })
      return false
    }
  },

  // ==================== Bins ====================

  fetchBins: async (warehouseId: number) => {
    set({ binsLoading: true })
    try {
      const result = await inventoryApi.listWarehouseBins(warehouseId, { is_active: true })
      if (result.success) {
        set(state => ({
          bins: { ...state.bins, [warehouseId]: result.data },
          binsLoading: false,
        }))
      } else {
        set({ binsLoading: false })
      }
    } catch {
      set({ binsLoading: false })
    }
  },

  createBin: async (warehouseId: number, data: StorageBinCreate) => {
    set({ binsLoading: true })
    try {
      const result = await inventoryApi.createStorageBin(warehouseId, data)
      if (result.success) {
        set(state => ({
          bins: {
            ...state.bins,
            [warehouseId]: [...(state.bins[warehouseId] || []), result.data],
          },
          binsLoading: false,
        }))
        return result.data
      } else {
        set({ binsLoading: false })
        return null
      }
    } catch {
      set({ binsLoading: false })
      return null
    }
  },

  updateBin: async (binId: number, data: StorageBinUpdate) => {
    set({ binsLoading: true })
    try {
      const result = await inventoryApi.updateStorageBin(binId, data)
      if (result.success) {
        set(state => {
          const updatedBins = { ...state.bins }
          Object.keys(updatedBins).forEach(warehouseId => {
            updatedBins[Number(warehouseId)] = updatedBins[Number(warehouseId)].map(bin =>
              bin.id === binId ? result.data : bin
            )
          })
          return { bins: updatedBins, binsLoading: false }
        })
        return result.data
      } else {
        set({ binsLoading: false })
        return null
      }
    } catch {
      set({ binsLoading: false })
      return null
    }
  },

  deleteBin: async (binId: number) => {
    set({ binsLoading: true })
    try {
      const result = await inventoryApi.deleteStorageBin(binId)
      if (result.success) {
        set(state => {
          const updatedBins = { ...state.bins }
          Object.keys(updatedBins).forEach(warehouseId => {
            updatedBins[Number(warehouseId)] = updatedBins[Number(warehouseId)].filter(
              bin => bin.id !== binId
            )
          })
          return { bins: updatedBins, binsLoading: false }
        })
        return true
      } else {
        set({ binsLoading: false })
        return false
      }
    } catch {
      set({ binsLoading: false })
      return false
    }
  },

  // ==================== Types ====================

  fetchInventoryTypes: async () => {
    set({ typesLoading: true, typesError: null })
    try {
      const result = await inventoryApi.listInventoryTypes()
      if (result.success) {
        set({ inventoryTypes: result.data, typesLoading: false })
      } else {
        set({ typesError: result.message, typesLoading: false })
      }
    } catch (error: unknown) {
      set({ typesError: getErrorMessage(error), typesLoading: false })
    }
  },

  createInventoryType: async (data: InventoryTypeCreate) => {
    set({ typesLoading: true, typesError: null })
    try {
      const result = await inventoryApi.createInventoryType(data)
      if (result.success) {
        set(state => ({
          inventoryTypes: [...state.inventoryTypes, result.data],
          typesLoading: false,
        }))
        return result.data
      } else {
        set({ typesError: result.message, typesLoading: false })
        return null
      }
    } catch (error: unknown) {
      set({ typesError: getErrorMessage(error), typesLoading: false })
      return null
    }
  },

  // ==================== Alerts ====================

  fetchLowStockAlerts: async () => {
    set({ alertsLoading: true, alertsError: null })
    try {
      const result = await inventoryApi.getLowStockAlerts()
      if (result.success) {
        set({ lowStockAlerts: result.data, alertsLoading: false })
      } else {
        set({
          alertsLoading: false,
          alertsError: result.message || 'Failed to fetch low stock alerts',
        })
      }
    } catch (error: unknown) {
      set({ alertsLoading: false, alertsError: getErrorMessage(error) })
    }
  },

  fetchExpiringAlerts: async (days: number = 7) => {
    set({ alertsLoading: true, alertsError: null })
    try {
      const result = await inventoryApi.getExpiringItems(days)
      if (result.success) {
        set({ expiringAlerts: result.data, alertsLoading: false })
      } else {
        set({
          alertsLoading: false,
          alertsError: result.message || 'Failed to fetch expiring items',
        })
      }
    } catch (error: unknown) {
      set({ alertsLoading: false, alertsError: getErrorMessage(error) })
    }
  },

  markExpiredItems: async () => {
    try {
      const result = await inventoryApi.markExpiredItems()
      if (result.success) {
        // Refresh items to reflect expired status
        await get().fetchItems()
        return result.data.count
      }
      return 0
    } catch {
      return 0
    }
  },

  // ==================== Reports ====================

  fetchValuation: async () => {
    set({ valuationLoading: true, valuationError: null })
    try {
      const result = await inventoryApi.getInventoryValuation()
      if (result.success) {
        set({ valuation: result.data, valuationLoading: false })
      } else {
        set({
          valuationLoading: false,
          valuationError: result.message || 'Failed to fetch inventory valuation',
        })
      }
    } catch (error: unknown) {
      set({ valuationLoading: false, valuationError: getErrorMessage(error) })
    }
  },

  // ==================== Transfers ====================

  transferItem: async (itemId: number, toWarehouseId: number, toBinId?: number) => {
    set({ itemsLoading: true, itemsError: null })
    try {
      const result = await inventoryApi.transferItem(itemId, toWarehouseId, toBinId)
      if (result.success) {
        // Update the item in the store
        set(state => ({
          items: state.items.map(item => (item.id === itemId ? result.data : item)),
          currentItem: state.currentItem?.id === itemId ? result.data : state.currentItem,
          itemsLoading: false,
        }))
        return true
      } else {
        set({ itemsError: result.message, itemsLoading: false })
        return false
      }
    } catch (error: unknown) {
      set({ itemsError: getErrorMessage(error), itemsLoading: false })
      return false
    }
  },

  openTransferModal: (item: InventoryItemResponse) => {
    set({
      transferModal: {
        open: true,
        item,
        sourceWarehouseId: item.warehouse_id ?? null,
        sourceBinId: item.bin_id ?? null,
      },
    })
  },

  closeTransferModal: () => {
    set({
      transferModal: {
        open: false,
        item: null,
        sourceWarehouseId: null,
        sourceBinId: null,
      },
    })
  },

  // ==================== Transactions ====================

  fetchTransactions: async (itemId?: number, filters?: TransactionFilters) => {
    set({ transactionsLoading: true, transactionsError: null })
    try {
      if (itemId) {
        // Fetch transactions for a specific item
        const result = await inventoryApi.getItemTransactions(itemId, filters)
        if (result.success) {
          set({ transactions: result.data, transactionsLoading: false })
        } else {
          set({ transactionsError: result.message, transactionsLoading: false })
        }
      } else {
        // Fetch all transactions (global history)
        const result = await inventoryApi.getAllTransactions(filters)
        if (result.success) {
          set({ transactions: result.data, transactionsLoading: false })
        } else {
          set({ transactionsError: result.message, transactionsLoading: false })
        }
      }
    } catch (error: unknown) {
      set({ transactionsError: getErrorMessage(error), transactionsLoading: false })
    }
  },

  // ==================== Batches ====================

  fetchBatches: async () => {
    set({ batchesLoading: true, batchesError: null })
    try {
      const result = await inventoryApi.listInventoryItems()
      if (result.success) {
        const batchMap = new Map<string, InventoryItemResponse[]>()
        result.data.forEach(item => {
          if (item.batch_number) {
            if (!batchMap.has(item.batch_number)) {
              batchMap.set(item.batch_number, [])
            }
            const batchItems = batchMap.get(item.batch_number)
            if (batchItems) {
              batchItems.push(item)
            }
          }
        })
        set({ batches: batchMap, batchesLoading: false })
      } else {
        set({ batchesLoading: false, batchesError: result.message || 'Failed to fetch batches' })
      }
    } catch (error: unknown) {
      set({ batchesLoading: false, batchesError: getErrorMessage(error) })
    }
  },

  fetchBatchItems: async (batchNumber: string) => {
    set({ batchesLoading: true, batchesError: null })
    try {
      const result = await inventoryApi.listInventoryItems({ batch_number: batchNumber })
      if (result.success) {
        const batches = new Map(get().batches)
        batches.set(batchNumber, result.data)
        set({ batches, batchesLoading: false })
      } else {
        set({
          batchesLoading: false,
          batchesError: result.message || `Failed to fetch batch items for ${batchNumber}`,
        })
      }
    } catch (error: unknown) {
      set({ batchesLoading: false, batchesError: getErrorMessage(error) })
    }
  },

  // ==================== Search & Filters ====================

  setSearchFilters: (filters: Partial<InventoryItemFilters>) => {
    set({ searchFilters: { ...get().searchFilters, ...filters } })
  },

  clearSearchFilters: () => {
    set({ searchFilters: {} })
  },

  searchItems: async () => {
    const filters = get().searchFilters
    await get().fetchItems(filters)
  },

  // ==================== Reset ====================

  reset: () => {
    set({ ...initialState, batches: new Map() })
  },
}))
