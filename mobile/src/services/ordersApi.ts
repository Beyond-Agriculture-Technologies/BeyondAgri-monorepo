import { API_FULL_URL } from '../utils/constants'
import { BackendAuthService } from './auth'
import { ApiResponse } from '../types'
import {
  OrderResponse,
  OrderListResponse,
  OrderStatsResponse,
  SupplierListResponse,
  CreateOrderRequest,
  ConfirmOrderRequest,
  DeclineOrderRequest,
  OrderStatusEnum,
} from '../types/order'

class OrdersApiClient {
  private baseURL: string
  private activeRequests: Map<string, AbortController> = new Map()
  private readonly REQUEST_TIMEOUT_MS = 30000

  constructor() {
    this.baseURL = `${API_FULL_URL}/orders`
  }

  cancelRequest(requestKey: string): void {
    const controller = this.activeRequests.get(requestKey)
    if (controller) {
      controller.abort()
      this.activeRequests.delete(requestKey)
    }
  }

  cancelAllRequests(): void {
    this.activeRequests.forEach(controller => controller.abort())
    this.activeRequests.clear()
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

  private buildQueryString(params?: Record<string, unknown>): string {
    if (!params) return ''
    const filtered = Object.entries(params)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    return filtered.length > 0 ? `?${filtered.join('&')}` : ''
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    requestKey?: string,
    preserveFullResponse?: boolean
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const controller = new AbortController()
    let timedOut = false
    const timeoutId = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, this.REQUEST_TIMEOUT_MS)

    if (requestKey) {
      this.cancelRequest(requestKey)
      this.activeRequests.set(requestKey, controller)
    }

    try {
      const headers = await this.getHeaders()

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const responseText = await response.text()

      let data: unknown
      try {
        data = JSON.parse(responseText)
      } catch (_jsonError) {
        console.error('Non-JSON response:', responseText.substring(0, 200), 'Status:', response.status)
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}: ${responseText.substring(0, 100) || response.statusText}`)
        }
        throw new Error('Server returned invalid response format (expected JSON)')
      }

      if (!response.ok) {
        const errorData = data as Record<string, unknown>
        const errorMessage =
          (errorData.detail as string) ||
          (errorData.message as string) ||
          (errorData.error as string) ||
          `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      const responseData = data as Record<string, unknown>
      return {
        success: true,
        data: (preserveFullResponse ? data : responseData.data || data) as T,
        message: responseData.message as string | undefined,
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId)

      if (requestKey) {
        this.activeRequests.delete(requestKey)
      }

      const errorObj = error as Error

      // Silently handle cancelled requests
      if (errorObj.name === 'AbortError' && !timedOut) {
        return {
          success: false,
          data: null as unknown as T,
          message: '',
        }
      }

      console.error('Orders API request error:', errorObj.message, 'Endpoint:', endpoint)

      let userMessage = errorObj.message || 'Network error'

      if (errorObj.name === 'AbortError') {
        userMessage = 'Request timeout - please try again'
      } else if (errorObj.message?.includes('Network request failed') || errorObj.message?.includes('fetch')) {
        userMessage = 'Unable to connect to server. Please check your internet connection.'
      } else if (errorObj.message?.includes('401') || errorObj.message?.includes('Unauthorized')) {
        userMessage = 'Session expired. Please log in again.'
      } else if (errorObj.message?.includes('403') || errorObj.message?.includes('Forbidden')) {
        userMessage = 'You do not have permission to perform this action.'
      }

      return {
        success: false,
        data: null as unknown as T,
        message: userMessage,
      }
    }
  }

  // ==================== Wholesaler Endpoints ====================

  async placeOrder(data: CreateOrderRequest): Promise<ApiResponse<OrderResponse>> {
    return this.request<OrderResponse>('', {
      method: 'POST',
      body: JSON.stringify(data),
    }, 'placeOrder')
  }

  async getMyOrders(params?: {
    status?: OrderStatusEnum
    page?: number
    page_size?: number
  }): Promise<ApiResponse<OrderListResponse>> {
    const queryString = this.buildQueryString(params as Record<string, unknown>)
    return this.request<OrderListResponse>(`/my-orders${queryString}`, {}, 'myOrders', true)
  }

  async getMyOrderDetail(orderId: number): Promise<ApiResponse<OrderResponse>> {
    return this.request<OrderResponse>(`/my-orders/${orderId}`, {}, `myOrder_${orderId}`)
  }

  async completeOrder(orderId: number): Promise<ApiResponse<OrderResponse>> {
    return this.request<OrderResponse>(`/my-orders/${orderId}/complete`, {
      method: 'POST',
    }, `completeOrder_${orderId}`)
  }

  async cancelOrder(orderId: number): Promise<ApiResponse<OrderResponse>> {
    return this.request<OrderResponse>(`/my-orders/${orderId}/cancel`, {
      method: 'POST',
    }, `cancelOrder_${orderId}`)
  }

  async getMyStats(): Promise<ApiResponse<OrderStatsResponse>> {
    return this.request<OrderStatsResponse>('/my-stats', {}, 'myStats')
  }

  async getMySuppliers(): Promise<ApiResponse<SupplierListResponse>> {
    return this.request<SupplierListResponse>('/my-suppliers', {}, 'mySuppliers', true)
  }

  // ==================== Farmer Endpoints ====================

  async getIncomingOrders(params?: {
    status?: OrderStatusEnum
    page?: number
    page_size?: number
  }): Promise<ApiResponse<OrderListResponse>> {
    const queryString = this.buildQueryString(params as Record<string, unknown>)
    return this.request<OrderListResponse>(`/incoming${queryString}`, {}, 'incomingOrders', true)
  }

  async getIncomingOrderDetail(orderId: number): Promise<ApiResponse<OrderResponse>> {
    return this.request<OrderResponse>(`/incoming/${orderId}`, {}, `incomingOrder_${orderId}`)
  }

  async confirmOrder(orderId: number, data?: ConfirmOrderRequest): Promise<ApiResponse<OrderResponse>> {
    return this.request<OrderResponse>(`/incoming/${orderId}/confirm`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, `confirmOrder_${orderId}`)
  }

  async declineOrder(orderId: number, data?: DeclineOrderRequest): Promise<ApiResponse<OrderResponse>> {
    return this.request<OrderResponse>(`/incoming/${orderId}/decline`, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }, `declineOrder_${orderId}`)
  }

  async getSellerStats(): Promise<ApiResponse<OrderStatsResponse>> {
    return this.request<OrderStatsResponse>('/seller-stats', {}, 'sellerStats')
  }
}

export const ordersApi = new OrdersApiClient()
export default ordersApi
