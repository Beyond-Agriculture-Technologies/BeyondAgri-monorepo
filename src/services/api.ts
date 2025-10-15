import { API_FULL_URL, ENABLE_HIDDEN_FEATURES } from '../utils/constants'
import { BackendAuthService } from './auth'
import { Farm, ApiResponse, BackendApiResponse } from '../types'

class ApiClient {
  private baseURL: string

  constructor() {
    this.baseURL = API_FULL_URL

    // Log API configuration in development
    if (ENABLE_HIDDEN_FEATURES) {
      console.log('🔗 API Client initialized:', {
        baseURL: this.baseURL,
        timestamp: new Date().toISOString(),
      })
    }
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const token = await BackendAuthService.getAuthToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    return headers
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`

    try {
      const headers = await this.getHeaders()

      // Log request details in development
      if (ENABLE_HIDDEN_FEATURES) {
        console.log('🚀 API Request:', {
          method: options.method || 'GET',
          url,
          endpoint,
          hasAuth: !!headers.Authorization,
          timestamp: new Date().toISOString(),
        })
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      })

      // Log response details in development
      if (ENABLE_HIDDEN_FEATURES) {
        console.log('📥 API Response:', {
          url,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          timestamp: new Date().toISOString(),
        })
      }

      const data: BackendApiResponse<T> = await response.json()

      if (!response.ok) {
        const errorMessage =
          data.error || data.message || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      return {
        success: true,
        data: data.data || (data as any),
        message: data.message,
      }
    } catch (error: any) {
      // Enhanced error logging
      const errorInfo = {
        url,
        endpoint,
        error: error.message,
        type: error.name,
        timestamp: new Date().toISOString(),
      }

      if (ENABLE_HIDDEN_FEATURES) {
        console.error('❌ API Request Failed:', errorInfo)
      } else {
        console.error('API request error:', error.message)
      }

      // Provide more specific error messages
      let userMessage = error.message || 'Network error'
      if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
        userMessage =
          'Unable to connect to server. Please check your internet connection and try again.'
      } else if (error.message?.includes('timeout')) {
        userMessage = 'Request timed out. Please try again.'
      }

      return {
        success: false,
        data: null as any,
        message: userMessage,
      }
    }
  }

  // Farm endpoints
  async getFarms(): Promise<ApiResponse<Farm[]>> {
    return this.request<Farm[]>('/farms')
  }

  async getFarm(id: string): Promise<ApiResponse<Farm>> {
    return this.request<Farm>(`/farms/${id}`)
  }

  async createFarm(
    farm: Omit<Farm, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>
  ): Promise<ApiResponse<Farm>> {
    return this.request<Farm>('/farms', {
      method: 'POST',
      body: JSON.stringify(farm),
    })
  }

  async updateFarm(id: string, farm: Partial<Farm>): Promise<ApiResponse<Farm>> {
    return this.request<Farm>(`/farms/${id}`, {
      method: 'PUT',
      body: JSON.stringify(farm),
    })
  }

  async deleteFarm(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/farms/${id}`, {
      method: 'DELETE',
    })
  }

  // User endpoints (now handled by BackendAuthService)
  async getCurrentUser() {
    return BackendAuthService.getCurrentUser()
  }

  async updateUserProfile(updates: any) {
    return this.request('/accounts/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  // Account management endpoints
  async getAccountProfile() {
    return this.request('/accounts/profile', {
      method: 'GET',
    })
  }

  async submitVerification(verificationData: any) {
    return this.request('/accounts/verification/submit', {
      method: 'POST',
      body: JSON.stringify(verificationData),
    })
  }

  async getVerificationStatus() {
    return this.request('/accounts/verification/status', {
      method: 'GET',
    })
  }

  async getUserRoles() {
    return this.request('/accounts/roles', {
      method: 'GET',
    })
  }

  async getUserPermissions() {
    return this.request('/accounts/permissions', {
      method: 'GET',
    })
  }

  async deactivateAccount() {
    return this.request('/accounts/deactivate', {
      method: 'DELETE',
    })
  }

  // Photo upload endpoint
  async uploadPhoto(farmId: string, photoUri: string, description?: string) {
    try {
      const formData = new FormData()
      formData.append('photo', {
        uri: photoUri,
        type: 'image/jpeg',
        name: 'farm-photo.jpg',
      } as any)

      if (description) {
        formData.append('description', description)
      }

      const headers = await this.getHeaders()
      delete (headers as any)['Content-Type'] // Let the browser set the content type for FormData

      const response = await fetch(`${this.baseURL}/farms/${farmId}/photos`, {
        method: 'POST',
        headers,
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Photo upload failed')
      }

      return {
        success: true,
        data,
        message: data.message,
      }
    } catch (error) {
      console.error('Photo upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Photo upload failed'
      return {
        success: false,
        data: null,
        message: errorMessage,
      }
    }
  }
}

export const apiClient = new ApiClient()
