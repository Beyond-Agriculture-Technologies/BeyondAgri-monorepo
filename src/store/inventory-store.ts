import { create } from 'zustand'
import {
  InventoryItemResponse,
  WarehouseResponse,
  InventoryTypeResponse,
  LowStockAlert,
  ExpiringItemAlert,
  InventoryValuationReport,
  StorageBinResponse,
} from '../types/inventory'
import { inventoryApi } from '../services/inventoryApi'

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
  types: InventoryTypeResponse[] // Alias for inventoryTypes
  typesLoading: boolean
  typesError: string | null

  // Alerts
  lowStockAlerts: LowStockAlert[]
  expiringAlerts: ExpiringItemAlert[]
  alertsLoading: boolean

  // Reports
  valuation: InventoryValuationReport | null
  valuationLoading: boolean

  // Actions - Items
  fetchItems: (filters?: any) => Promise<void>
  fetchItem: (itemId: number) => Promise<void>
  fetchItemById: (itemId: number) => Promise<void> // Alias for fetchItem
  createItem: (data: any) => Promise<InventoryItemResponse | null>
  updateItem: (itemId: number, data: any) => Promise<InventoryItemResponse | null>
  deleteItem: (itemId: number) => Promise<boolean>
  clearCurrentItem: () => void

  // Actions - Warehouses
  fetchWarehouses: () => Promise<void>
  createWarehouse: (data: any) => Promise<WarehouseResponse | null>
  updateWarehouse: (warehouseId: number, data: any) => Promise<WarehouseResponse | null>
  deleteWarehouse: (warehouseId: number) => Promise<boolean>

  // Actions - Bins
  fetchBins: (warehouseId: number) => Promise<void>
  createBin: (warehouseId: number, data: any) => Promise<StorageBinResponse | null>
  updateBin: (binId: number, data: any) => Promise<StorageBinResponse | null>
  deleteBin: (binId: number) => Promise<boolean>

  // Actions - Types
  fetchInventoryTypes: () => Promise<void>
  fetchTypes: () => Promise<void> // Alias for fetchInventoryTypes
  createInventoryType: (data: any) => Promise<InventoryTypeResponse | null>

  // Actions - Alerts
  fetchLowStockAlerts: () => Promise<void>
  fetchExpiringAlerts: (days?: number) => Promise<void>
  markExpiredItems: () => Promise<number>

  // Actions - Reports
  fetchValuation: () => Promise<void>

  // Actions - Transfers
  transferItem: (itemId: number, toWarehouseId: number, toBinId?: number) => Promise<boolean>

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
  types: [], // Alias for inventoryTypes
  typesLoading: false,
  typesError: null,

  lowStockAlerts: [],
  expiringAlerts: [],
  alertsLoading: false,

  valuation: null,
  valuationLoading: false,
}

export const useInventoryStore = create<InventoryState>((set, get) => ({
  ...initialState,

  // ==================== Items ====================

  fetchItems: async (filters?: any) => {
    set({ itemsLoading: true, itemsError: null })
    try {
      const result = await inventoryApi.listInventoryItems(filters)
      if (result.success) {
        set({ items: result.data, itemsLoading: false })
      } else {
        set({ itemsError: result.message, itemsLoading: false })
      }
    } catch (error: any) {
      set({ itemsError: error.message, itemsLoading: false })
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
    } catch (error: any) {
      set({ itemsError: error.message, itemsLoading: false })
    }
  },

  fetchItemById: async (itemId: number) => {
    // Alias for fetchItem
    return get().fetchItem(itemId)
  },

  createItem: async (data: any) => {
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
    } catch (error: any) {
      set({ itemsError: error.message, itemsLoading: false })
      return null
    }
  },

  updateItem: async (itemId: number, data: any) => {
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
    } catch (error: any) {
      set({ itemsError: error.message, itemsLoading: false })
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
    } catch (error: any) {
      set({ itemsError: error.message, itemsLoading: false })
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
    } catch (error: any) {
      set({ warehousesError: error.message, warehousesLoading: false })
    }
  },

  createWarehouse: async (data: any) => {
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
    } catch (error: any) {
      set({ warehousesError: error.message, warehousesLoading: false })
      return null
    }
  },

  updateWarehouse: async (warehouseId: number, data: any) => {
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
    } catch (error: any) {
      set({ warehousesError: error.message, warehousesLoading: false })
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
    } catch (error: any) {
      set({ warehousesError: error.message, warehousesLoading: false })
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
    } catch (error: any) {
      set({ binsLoading: false })
    }
  },

  createBin: async (warehouseId: number, data: any) => {
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
    } catch (error: any) {
      set({ binsLoading: false })
      return null
    }
  },

  updateBin: async (binId: number, data: any) => {
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
    } catch (error: any) {
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
    } catch (error: any) {
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
        set({ inventoryTypes: result.data, types: result.data, typesLoading: false })
      } else {
        set({ typesError: result.message, typesLoading: false })
      }
    } catch (error: any) {
      set({ typesError: error.message, typesLoading: false })
    }
  },

  fetchTypes: async () => {
    // Alias for fetchInventoryTypes
    return get().fetchInventoryTypes()
  },

  createInventoryType: async (data: any) => {
    set({ typesLoading: true, typesError: null })
    try {
      const result = await inventoryApi.createInventoryType(data)
      if (result.success) {
        set(state => ({
          inventoryTypes: [...state.inventoryTypes, result.data],
          types: [...state.inventoryTypes, result.data],
          typesLoading: false,
        }))
        return result.data
      } else {
        set({ typesError: result.message, typesLoading: false })
        return null
      }
    } catch (error: any) {
      set({ typesError: error.message, typesLoading: false })
      return null
    }
  },

  // ==================== Alerts ====================

  fetchLowStockAlerts: async () => {
    set({ alertsLoading: true })
    try {
      const result = await inventoryApi.getLowStockAlerts()
      if (result.success) {
        set({ lowStockAlerts: result.data, alertsLoading: false })
      } else {
        set({ alertsLoading: false })
      }
    } catch (error: any) {
      set({ alertsLoading: false })
    }
  },

  fetchExpiringAlerts: async (days: number = 7) => {
    set({ alertsLoading: true })
    try {
      const result = await inventoryApi.getExpiringItems(days)
      if (result.success) {
        set({ expiringAlerts: result.data, alertsLoading: false })
      } else {
        set({ alertsLoading: false })
      }
    } catch (error: any) {
      set({ alertsLoading: false })
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
    } catch (error: any) {
      return 0
    }
  },

  // ==================== Reports ====================

  fetchValuation: async () => {
    set({ valuationLoading: true })
    try {
      const result = await inventoryApi.getInventoryValuation()
      if (result.success) {
        set({ valuation: result.data, valuationLoading: false })
      } else {
        set({ valuationLoading: false })
      }
    } catch (error: any) {
      set({ valuationLoading: false })
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
    } catch (error: any) {
      set({ itemsError: error.message, itemsLoading: false })
      return false
    }
  },

  // ==================== Reset ====================

  reset: () => {
    set(initialState)
  },
}))
