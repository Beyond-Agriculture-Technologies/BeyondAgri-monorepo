import { create } from 'zustand'
import {
  OrderResponse,
  OrderListResponse,
  OrderStatsResponse,
  SupplierSummary,
  CreateOrderRequest,
  OrderStatusEnum,
  OrderPagination,
} from '../types/order'
import { ordersApi } from '../services/ordersApi'
import { getErrorMessage } from '../utils/error-handler'

interface OrderState {
  // Wholesaler orders
  myOrders: OrderResponse[]
  myOrdersPagination: OrderPagination
  myOrdersLoading: boolean
  myOrdersError: string | null
  myOrdersStatusFilter: OrderStatusEnum | null

  // Farmer incoming orders
  incomingOrders: OrderResponse[]
  incomingPagination: OrderPagination
  incomingLoading: boolean
  incomingError: string | null
  incomingStatusFilter: OrderStatusEnum | null

  // Current order detail
  currentOrder: OrderResponse | null
  detailLoading: boolean
  detailError: string | null

  // Stats
  myStats: OrderStatsResponse | null
  sellerStats: OrderStatsResponse | null
  statsLoading: boolean

  // Suppliers
  suppliers: SupplierSummary[]
  suppliersLoading: boolean
  suppliersError: string | null

  // Action loading (for individual actions like confirm/decline)
  actionLoading: boolean
  actionError: string | null

  // Actions - Wholesaler
  placeOrder: (data: CreateOrderRequest) => Promise<OrderResponse | null>
  fetchMyOrders: (params?: { status?: OrderStatusEnum; page?: number; page_size?: number }) => Promise<void>
  fetchMyOrderDetail: (orderId: number) => Promise<void>
  completeOrder: (orderId: number) => Promise<boolean>
  cancelOrder: (orderId: number) => Promise<boolean>
  fetchMyStats: () => Promise<void>
  fetchSuppliers: () => Promise<void>

  // Actions - Farmer
  fetchIncomingOrders: (params?: { status?: OrderStatusEnum; page?: number; page_size?: number }) => Promise<void>
  fetchIncomingOrderDetail: (orderId: number) => Promise<void>
  confirmOrder: (orderId: number, sellerNotes?: string) => Promise<boolean>
  declineOrder: (orderId: number, declineReason?: string) => Promise<boolean>
  fetchSellerStats: () => Promise<void>

  // Utility
  clearCurrentOrder: () => void
  clearActionError: () => void
  reset: () => void
}

const defaultPagination: OrderPagination = {
  total: 0,
  page: 1,
  page_size: 20,
  total_pages: 0,
}

const initialState = {
  myOrders: [],
  myOrdersPagination: { ...defaultPagination },
  myOrdersLoading: false,
  myOrdersError: null,
  myOrdersStatusFilter: null,

  incomingOrders: [],
  incomingPagination: { ...defaultPagination },
  incomingLoading: false,
  incomingError: null,
  incomingStatusFilter: null,

  currentOrder: null,
  detailLoading: false,
  detailError: null,

  myStats: null,
  sellerStats: null,
  statsLoading: false,

  suppliers: [],
  suppliersLoading: false,
  suppliersError: null,

  actionLoading: false,
  actionError: null,
}

export const useOrderStore = create<OrderState>((set, get) => ({
  ...initialState,

  // ==================== Wholesaler Actions ====================

  placeOrder: async (data: CreateOrderRequest) => {
    set({ actionLoading: true, actionError: null })
    try {
      const result = await ordersApi.placeOrder(data)
      if (result.success && result.data) {
        set({ actionLoading: false })
        return result.data
      } else {
        set({ actionError: result.message || 'Failed to place order', actionLoading: false })
        return null
      }
    } catch (error: unknown) {
      set({ actionError: getErrorMessage(error), actionLoading: false })
      return null
    }
  },

  fetchMyOrders: async (params?) => {
    set({
      myOrdersLoading: true,
      myOrdersError: null,
      myOrdersStatusFilter: params?.status || null,
    })
    try {
      const result = await ordersApi.getMyOrders(params)
      if (!result.success || !result.data) {
        set({
          myOrders: [],
          myOrdersError: result.message || 'Failed to fetch orders',
          myOrdersLoading: false,
        })
        return
      }
      const data = result.data as OrderListResponse
      set({
        myOrders: data?.data || [],
        myOrdersPagination: {
          total: data?.total || 0,
          page: data?.page || 1,
          page_size: data?.page_size || 20,
          total_pages: data?.total_pages || 0,
        },
        myOrdersLoading: false,
      })
    } catch (error: unknown) {
      set({ myOrdersError: getErrorMessage(error), myOrdersLoading: false })
    }
  },

  fetchMyOrderDetail: async (orderId: number) => {
    set({ detailLoading: true, detailError: null })
    try {
      const result = await ordersApi.getMyOrderDetail(orderId)
      if (result.success && result.data) {
        set({ currentOrder: result.data, detailLoading: false })
      } else {
        set({ detailError: result.message || 'Failed to fetch order', detailLoading: false })
      }
    } catch (error: unknown) {
      set({ detailError: getErrorMessage(error), detailLoading: false })
    }
  },

  completeOrder: async (orderId: number) => {
    set({ actionLoading: true, actionError: null })
    try {
      const result = await ordersApi.completeOrder(orderId)
      if (result.success && result.data) {
        // Update in lists
        set(state => ({
          myOrders: state.myOrders.map(o => o.id === orderId ? result.data : o),
          currentOrder: state.currentOrder?.id === orderId ? result.data : state.currentOrder,
          actionLoading: false,
        }))
        return true
      } else {
        set({ actionError: result.message || 'Failed to complete order', actionLoading: false })
        return false
      }
    } catch (error: unknown) {
      set({ actionError: getErrorMessage(error), actionLoading: false })
      return false
    }
  },

  cancelOrder: async (orderId: number) => {
    set({ actionLoading: true, actionError: null })
    try {
      const result = await ordersApi.cancelOrder(orderId)
      if (result.success && result.data) {
        set(state => ({
          myOrders: state.myOrders.map(o => o.id === orderId ? result.data : o),
          currentOrder: state.currentOrder?.id === orderId ? result.data : state.currentOrder,
          actionLoading: false,
        }))
        return true
      } else {
        set({ actionError: result.message || 'Failed to cancel order', actionLoading: false })
        return false
      }
    } catch (error: unknown) {
      set({ actionError: getErrorMessage(error), actionLoading: false })
      return false
    }
  },

  fetchMyStats: async () => {
    set({ statsLoading: true })
    try {
      const result = await ordersApi.getMyStats()
      if (result.success && result.data) {
        set({ myStats: result.data, statsLoading: false })
      } else {
        set({ statsLoading: false })
      }
    } catch (_error: unknown) {
      set({ statsLoading: false })
    }
  },

  fetchSuppliers: async () => {
    set({ suppliersLoading: true, suppliersError: null })
    try {
      const result = await ordersApi.getMySuppliers()
      if (!result.success || !result.data) {
        set({
          suppliers: [],
          suppliersError: result.message || 'Failed to fetch suppliers',
          suppliersLoading: false,
        })
        return
      }
      const data = result.data
      set({
        suppliers: data?.data || [],
        suppliersLoading: false,
      })
    } catch (error: unknown) {
      set({ suppliersError: getErrorMessage(error), suppliersLoading: false })
    }
  },

  // ==================== Farmer Actions ====================

  fetchIncomingOrders: async (params?) => {
    set({
      incomingLoading: true,
      incomingError: null,
      incomingStatusFilter: params?.status || null,
    })
    try {
      const result = await ordersApi.getIncomingOrders(params)
      if (!result.success || !result.data) {
        set({
          incomingOrders: [],
          incomingError: result.message || 'Failed to fetch incoming orders',
          incomingLoading: false,
        })
        return
      }
      const data = result.data as OrderListResponse
      set({
        incomingOrders: data?.data || [],
        incomingPagination: {
          total: data?.total || 0,
          page: data?.page || 1,
          page_size: data?.page_size || 20,
          total_pages: data?.total_pages || 0,
        },
        incomingLoading: false,
      })
    } catch (error: unknown) {
      set({ incomingError: getErrorMessage(error), incomingLoading: false })
    }
  },

  fetchIncomingOrderDetail: async (orderId: number) => {
    set({ detailLoading: true, detailError: null })
    try {
      const result = await ordersApi.getIncomingOrderDetail(orderId)
      if (result.success && result.data) {
        set({ currentOrder: result.data, detailLoading: false })
      } else {
        set({ detailError: result.message || 'Failed to fetch order', detailLoading: false })
      }
    } catch (error: unknown) {
      set({ detailError: getErrorMessage(error), detailLoading: false })
    }
  },

  confirmOrder: async (orderId: number, sellerNotes?: string) => {
    set({ actionLoading: true, actionError: null })
    try {
      const result = await ordersApi.confirmOrder(orderId, sellerNotes ? { seller_notes: sellerNotes } : undefined)
      if (result.success && result.data) {
        set(state => ({
          incomingOrders: state.incomingOrders.map(o => o.id === orderId ? result.data : o),
          currentOrder: state.currentOrder?.id === orderId ? result.data : state.currentOrder,
          actionLoading: false,
        }))
        return true
      } else {
        set({ actionError: result.message || 'Failed to confirm order', actionLoading: false })
        return false
      }
    } catch (error: unknown) {
      set({ actionError: getErrorMessage(error), actionLoading: false })
      return false
    }
  },

  declineOrder: async (orderId: number, declineReason?: string) => {
    set({ actionLoading: true, actionError: null })
    try {
      const result = await ordersApi.declineOrder(orderId, declineReason ? { decline_reason: declineReason } : undefined)
      if (result.success && result.data) {
        set(state => ({
          incomingOrders: state.incomingOrders.map(o => o.id === orderId ? result.data : o),
          currentOrder: state.currentOrder?.id === orderId ? result.data : state.currentOrder,
          actionLoading: false,
        }))
        return true
      } else {
        set({ actionError: result.message || 'Failed to decline order', actionLoading: false })
        return false
      }
    } catch (error: unknown) {
      set({ actionError: getErrorMessage(error), actionLoading: false })
      return false
    }
  },

  fetchSellerStats: async () => {
    set({ statsLoading: true })
    try {
      const result = await ordersApi.getSellerStats()
      if (result.success && result.data) {
        set({ sellerStats: result.data, statsLoading: false })
      } else {
        set({ statsLoading: false })
      }
    } catch (_error: unknown) {
      set({ statsLoading: false })
    }
  },

  // ==================== Utility ====================

  clearCurrentOrder: () => {
    set({ currentOrder: null, detailError: null })
  },

  clearActionError: () => {
    set({ actionError: null })
  },

  reset: () => {
    set(initialState)
  },
}))
