import { API_FULL_URL } from '../utils/constants'
import { BackendAuthService } from './auth'
import { ApiResponse } from '../types'
import {
  ProductListingBrowse,
  ProductListingFull,
  PaginatedListingsResponse,
  CreateListingRequest,
  UpdateListingRequest,
  BrowseListingsParams,
  ListingStatusEnum,
} from '../types/marketplace'

class MarketplaceApiClient {
  private baseURL: string
  private activeRequests: Map<string, AbortController> = new Map()
  private readonly REQUEST_TIMEOUT_MS = 30000 // 30 seconds
  private readonly MAX_RETRIES = 2

  constructor() {
    this.baseURL = `${API_FULL_URL}/marketplace`
  }

  /**
   * Cancel a specific request by key
   */
  cancelRequest(requestKey: string): void {
    const controller = this.activeRequests.get(requestKey)
    if (controller) {
      controller.abort()
      this.activeRequests.delete(requestKey)
    }
  }

  /**
   * Cancel all active requests
   */
  cancelAllRequests(): void {
    this.activeRequests.forEach(controller => controller.abort())
    this.activeRequests.clear()
  }

  private async getHeaders(): Promise<HeadersInit> {
    const token = await BackendAuthService.getAuthToken()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    // Always send token if available - backend may use it for personalization
    // even on "public" endpoints
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
    requestKey?: string
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT_MS)

    // Track this request if key provided
    if (requestKey) {
      this.cancelRequest(requestKey) // Cancel any existing request with same key
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

      // Get response as text first (can only read body once)
      const responseText = await response.text()

      // Try to parse as JSON
      let data: unknown
      try {
        data = JSON.parse(responseText)
      } catch (_jsonError) {
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
        data: (responseData.data || data) as T,
        message: responseData.message as string | undefined,
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId)

      // Cleanup request tracking
      if (requestKey) {
        this.activeRequests.delete(requestKey)
      }

      const errorObj = error as Error
      console.error('Marketplace API request error:', errorObj.message, 'Endpoint:', endpoint)

      let userMessage = errorObj.message || 'Network error'

      // Handle timeout specifically
      if (errorObj.name === 'AbortError') {
        userMessage = 'Request timeout - please try again'
      } else if (
        errorObj.message?.includes('Network request failed') ||
        errorObj.message?.includes('fetch')
      ) {
        userMessage = 'Unable to connect to server. Please check your internet connection.'
      } else if (errorObj.message?.includes('401') || errorObj.message?.includes('Unauthorized')) {
        userMessage = 'Session expired. Please log in again.'
      } else if (errorObj.message?.includes('403') || errorObj.message?.includes('Forbidden')) {
        userMessage = 'You do not have permission to perform this action.'
      } else if (errorObj.message?.includes('404') || errorObj.message?.includes('Not Found')) {
        userMessage = 'The requested resource was not found.'
      } else if (
        errorObj.message?.includes('500') ||
        errorObj.message?.includes('Server returned 500')
      ) {
        userMessage = 'Server error. Please try again later.'
      } else if (errorObj.message?.includes('invalid response')) {
        userMessage = 'Server returned an invalid response. The feature may not be available yet.'
      }

      return {
        success: false,
        data: null as unknown as T,
        message: userMessage,
      }
    }
  }

  // ==================== Public Browse Endpoints ====================

  /**
   * Browse marketplace listings (public endpoint - token sent if available)
   */
  async browseListings(
    params?: BrowseListingsParams
  ): Promise<ApiResponse<PaginatedListingsResponse>> {
    const queryString = this.buildQueryString(params as Record<string, unknown>)
    return this.request<PaginatedListingsResponse>(`/listings${queryString}`, {}, 'browseListings')
  }

  /**
   * Get listing detail (public endpoint - token sent if available)
   */
  async getListingDetail(listingId: number): Promise<ApiResponse<ProductListingBrowse>> {
    return this.request<ProductListingBrowse>(
      `/listings/${listingId}`,
      {},
      `listingDetail_${listingId}`
    )
  }

  /**
   * Get provinces with active listings (public endpoint - token sent if available)
   */
  async getProvinces(): Promise<ApiResponse<string[]>> {
    return this.request<string[]>('/provinces', {}, 'provinces')
  }

  /**
   * Get all category values (public endpoint - token sent if available)
   */
  async getCategories(): Promise<ApiResponse<string[]>> {
    return this.request<string[]>('/categories', {}, 'categories')
  }

  // ==================== Farmer Listing Management ====================

  /**
   * Get farmer's own listings (auth required)
   */
  async getMyListings(status?: ListingStatusEnum): Promise<ApiResponse<ProductListingFull[]>> {
    const queryString = status ? this.buildQueryString({ status }) : ''
    return this.request<ProductListingFull[]>(`/my-listings${queryString}`, {}, 'myListings')
  }

  /**
   * Create a new listing (auth required)
   */
  async createListing(data: CreateListingRequest): Promise<ApiResponse<ProductListingFull>> {
    return this.request<ProductListingFull>(
      '/my-listings',
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
      'createListing'
    )
  }

  /**
   * Get a specific listing owned by farmer (auth required)
   */
  async getMyListing(listingId: number): Promise<ApiResponse<ProductListingFull>> {
    return this.request<ProductListingFull>(`/my-listings/${listingId}`)
  }

  /**
   * Update a listing (auth required)
   */
  async updateListing(
    listingId: number,
    data: UpdateListingRequest
  ): Promise<ApiResponse<ProductListingFull>> {
    return this.request<ProductListingFull>(
      `/my-listings/${listingId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
      `updateListing_${listingId}`
    )
  }

  /**
   * Archive (soft delete) a listing (auth required)
   */
  async deleteListing(listingId: number): Promise<ApiResponse<void>> {
    return this.request<void>(
      `/my-listings/${listingId}`,
      {
        method: 'DELETE',
      },
      `deleteListing_${listingId}`
    )
  }

  /**
   * Publish a draft listing: DRAFT -> ACTIVE (auth required)
   */
  async publishListing(listingId: number): Promise<ApiResponse<ProductListingFull>> {
    return this.request<ProductListingFull>(
      `/my-listings/${listingId}/publish`,
      {
        method: 'POST',
      },
      `publishListing_${listingId}`
    )
  }

  /**
   * Pause an active listing: ACTIVE -> PAUSED (auth required)
   */
  async pauseListing(listingId: number): Promise<ApiResponse<ProductListingFull>> {
    return this.request<ProductListingFull>(
      `/my-listings/${listingId}/pause`,
      {
        method: 'POST',
      },
      `pauseListing_${listingId}`
    )
  }

  /**
   * Resume a paused listing: PAUSED -> ACTIVE (auth required)
   */
  async resumeListing(listingId: number): Promise<ApiResponse<ProductListingFull>> {
    return this.request<ProductListingFull>(
      `/my-listings/${listingId}/resume`,
      {
        method: 'POST',
      },
      `resumeListing_${listingId}`
    )
  }
}

export const marketplaceApi = new MarketplaceApiClient()
export default marketplaceApi
