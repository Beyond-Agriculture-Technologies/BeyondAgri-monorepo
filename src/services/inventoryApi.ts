import { API_FULL_URL } from '../utils/constants'
import { BackendAuthService } from './auth'
import { ApiResponse } from '../types'
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
} from '../types/inventory'

class InventoryApiClient {
  private baseURL: string

  constructor() {
    this.baseURL = `${API_FULL_URL}/inventory`
  }

  private async getHeaders(): Promise<HeadersInit> {
    const token = await BackendAuthService.getAuthToken()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return headers
  }

  private buildQueryString(params?: Record<string, any>): string {
    if (!params) return ''

    const filtered = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)

    return filtered.length > 0 ? `?${filtered.join('&')}` : ''
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`

    try {
      const headers = await this.getHeaders()

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      })

      // Get response as text first (can only read body once)
      const responseText = await response.text()

      // Try to parse as JSON
      let data: any
      try {
        data = JSON.parse(responseText)
      } catch (jsonError) {
        // Response is not valid JSON
        console.error(
          'Non-JSON response from server:',
          responseText.substring(0, 200),
          'Status:',
          response.status,
          'Endpoint:',
          endpoint
        )

        // If response is not ok and not JSON, throw error with status
        if (!response.ok) {
          throw new Error(
            `Server returned ${response.status}: ${responseText.substring(0, 100) || response.statusText}`
          )
        }

        // If response is ok but not JSON, treat as error
        throw new Error('Server returned invalid response format (expected JSON)')
      }

      // Check if response was successful
      if (!response.ok) {
        const errorMessage =
          data.detail ||
          data.message ||
          data.error ||
          `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      }
    } catch (error: any) {
      console.error('Inventory API request error:', error.message, 'Endpoint:', endpoint)

      let userMessage = error.message || 'Network error'
      if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
        userMessage = 'Unable to connect to server. Please check your internet connection.'
      } else if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        userMessage = 'Session expired. Please log in again.'
      } else if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        userMessage = 'You do not have permission to perform this action.'
      } else if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        userMessage = 'The requested resource was not found.'
      } else if (error.message?.includes('500') || error.message?.includes('Server returned 500')) {
        userMessage = 'Server error. Please try again later.'
      } else if (error.message?.includes('invalid response')) {
        userMessage = 'Server returned an invalid response. The feature may not be available yet.'
      }

      return {
        success: false,
        data: null as any,
        message: userMessage,
      }
    }
  }

  // ==================== Inventory Types ====================

  async listInventoryTypes(
    filters?: InventoryTypeFilters
  ): Promise<ApiResponse<InventoryTypeResponse[]>> {
    const queryString = this.buildQueryString(filters)
    return this.request<InventoryTypeResponse[]>(`/types${queryString}`)
  }

  async createInventoryType(
    data: InventoryTypeCreate
  ): Promise<ApiResponse<InventoryTypeResponse>> {
    return this.request<InventoryTypeResponse>('/types', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getInventoryType(typeId: number): Promise<ApiResponse<InventoryTypeResponse>> {
    return this.request<InventoryTypeResponse>(`/types/${typeId}`)
  }

  async updateInventoryType(
    typeId: number,
    data: InventoryTypeUpdate
  ): Promise<ApiResponse<InventoryTypeResponse>> {
    return this.request<InventoryTypeResponse>(`/types/${typeId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteInventoryType(typeId: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/types/${typeId}`, {
      method: 'DELETE',
    })
  }

  // ==================== Warehouses ====================

  async listWarehouses(filters?: WarehouseFilters): Promise<ApiResponse<WarehouseResponse[]>> {
    const queryString = this.buildQueryString(filters)
    return this.request<WarehouseResponse[]>(`/warehouses${queryString}`)
  }

  async createWarehouse(data: WarehouseCreate): Promise<ApiResponse<WarehouseResponse>> {
    return this.request<WarehouseResponse>('/warehouses', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getWarehouse(warehouseId: number): Promise<ApiResponse<WarehouseResponse>> {
    return this.request<WarehouseResponse>(`/warehouses/${warehouseId}`)
  }

  async updateWarehouse(
    warehouseId: number,
    data: WarehouseUpdate
  ): Promise<ApiResponse<WarehouseResponse>> {
    return this.request<WarehouseResponse>(`/warehouses/${warehouseId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteWarehouse(warehouseId: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/warehouses/${warehouseId}`, {
      method: 'DELETE',
    })
  }

  // ==================== Storage Bins ====================

  async listWarehouseBins(
    warehouseId: number,
    filters?: StorageBinFilters
  ): Promise<ApiResponse<StorageBinResponse[]>> {
    const queryString = this.buildQueryString(filters)
    return this.request<StorageBinResponse[]>(`/warehouses/${warehouseId}/bins${queryString}`)
  }

  async createStorageBin(
    warehouseId: number,
    data: Omit<StorageBinCreate, 'warehouse_id'>
  ): Promise<ApiResponse<StorageBinResponse>> {
    return this.request<StorageBinResponse>(`/warehouses/${warehouseId}/bins`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateStorageBin(
    binId: number,
    data: StorageBinUpdate
  ): Promise<ApiResponse<StorageBinResponse>> {
    return this.request<StorageBinResponse>(`/bins/${binId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteStorageBin(binId: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/bins/${binId}`, {
      method: 'DELETE',
    })
  }

  // ==================== Inventory Items ====================

  async listInventoryItems(
    filters?: InventoryItemFilters
  ): Promise<ApiResponse<InventoryItemResponse[]>> {
    const queryString = this.buildQueryString(filters)
    return this.request<InventoryItemResponse[]>(`/items${queryString}`)
  }

  async createInventoryItem(
    data: InventoryItemCreate
  ): Promise<ApiResponse<InventoryItemResponse>> {
    return this.request<InventoryItemResponse>('/items', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getInventoryItem(itemId: number): Promise<ApiResponse<InventoryItemResponse>> {
    return this.request<InventoryItemResponse>(`/items/${itemId}`)
  }

  async updateInventoryItem(
    itemId: number,
    data: InventoryItemUpdate
  ): Promise<ApiResponse<InventoryItemResponse>> {
    return this.request<InventoryItemResponse>(`/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteInventoryItem(itemId: number): Promise<ApiResponse<void>> {
    return this.request<void>(`/items/${itemId}`, {
      method: 'DELETE',
    })
  }

  // ==================== Transactions ====================

  async getAllTransactions(
    filters?: TransactionFilters
  ): Promise<ApiResponse<InventoryTransactionResponse[]>> {
    const queryString = this.buildQueryString(filters)
    return this.request<InventoryTransactionResponse[]>(`/transactions${queryString}`)
  }

  async getItemTransactions(
    itemId: number,
    filters?: TransactionFilters
  ): Promise<ApiResponse<InventoryTransactionResponse[]>> {
    const queryString = this.buildQueryString(filters)
    return this.request<InventoryTransactionResponse[]>(
      `/items/${itemId}/transactions${queryString}`
    )
  }

  async createTransaction(
    itemId: number,
    data: Omit<InventoryTransactionCreate, 'inventory_item_id'>
  ): Promise<ApiResponse<InventoryTransactionResponse>> {
    return this.request<InventoryTransactionResponse>(`/items/${itemId}/transactions`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async transferItem(
    itemId: number,
    toWarehouseId: number,
    toBinId?: number
  ): Promise<ApiResponse<InventoryItemResponse>> {
    const queryString = this.buildQueryString({
      to_warehouse_id: toWarehouseId,
      to_bin_id: toBinId,
    })
    return this.request<InventoryItemResponse>(`/items/${itemId}/transfer${queryString}`, {
      method: 'POST',
    })
  }

  // ==================== Alerts & Reports ====================

  async getLowStockAlerts(): Promise<ApiResponse<LowStockAlert[]>> {
    return this.request<LowStockAlert[]>('/alerts/low-stock')
  }

  async getExpiringItems(days: number = 7): Promise<ApiResponse<ExpiringItemAlert[]>> {
    const queryString = this.buildQueryString({ days })
    return this.request<ExpiringItemAlert[]>(`/alerts/expiring${queryString}`)
  }

  async markExpiredItems(): Promise<ApiResponse<{ message: string; count: number }>> {
    return this.request<{ message: string; count: number }>('/alerts/mark-expired', {
      method: 'POST',
    })
  }

  async getInventoryValuation(): Promise<ApiResponse<InventoryValuationReport>> {
    return this.request<InventoryValuationReport>('/reports/valuation')
  }

  async getBatchItems(batchNumber: string): Promise<ApiResponse<InventoryItemResponse[]>> {
    return this.request<InventoryItemResponse[]>(
      `/reports/batch/${encodeURIComponent(batchNumber)}`
    )
  }
}

export const inventoryApi = new InventoryApiClient()
export default inventoryApi
