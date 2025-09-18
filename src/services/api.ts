import { API_FULL_URL } from '../utils/constants'
import { BackendAuthService } from './auth'
import { Farm, ApiResponse, BackendApiResponse } from '../types'

class ApiClient {
  private baseURL: string

  constructor() {
    this.baseURL = API_FULL_URL
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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers = await this.getHeaders()
      const url = `${this.baseURL}${endpoint}`

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
      })

      const data: BackendApiResponse<T> = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'API request failed')
      }

      return {
        success: true,
        data: data.data || data as any,
        message: data.message,
      }
    } catch (error: any) {
      console.error('API request error:', error)
      return {
        success: false,
        data: null as any,
        message: error.message || 'Network error',
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

  async createFarm(farm: Omit<Farm, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Promise<ApiResponse<Farm>> {
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
    return this.request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(updates),
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
      return {
        success: false,
        data: null,
        message: error.message || 'Photo upload failed',
      }
    }
  }
}

export const apiClient = new ApiClient()