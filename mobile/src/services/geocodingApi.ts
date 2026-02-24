import { API_FULL_URL } from '../utils/constants'
import { BackendAuthService } from './auth'
import { ApiResponse } from '../types'
import { AutocompleteResponse, GeocodeResponse } from '../types/geocoding'

class GeocodingApiClient {
  private baseURL: string

  constructor() {
    this.baseURL = `${API_FULL_URL}/geocoding`
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

      const response = await fetch(url, {
        ...options,
        headers: {
          ...headers,
          ...(options.headers as Record<string, string>),
        },
      })

      const data = await response.json()

      if (!response.ok) {
        const errorMessage =
          data.detail ||
          data.error ||
          data.message ||
          `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      return {
        success: true,
        data: (data.data ?? data) as T,
        message: data.message,
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.error('Geocoding API error:', error.message)

      let userMessage = error.message || 'Network error'
      if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
        userMessage = 'Unable to connect to server. Please check your internet connection.'
      }

      return {
        success: false,
        data: null as unknown as T,
        message: userMessage,
      }
    }
  }

  async autocomplete(
    inputText: string,
    sessionToken?: string
  ): Promise<ApiResponse<AutocompleteResponse>> {
    return this.request<AutocompleteResponse>('/autocomplete', {
      method: 'POST',
      body: JSON.stringify({ input_text: inputText, session_token: sessionToken }),
    })
  }

  async geocodeByPlaceId(
    placeId: string,
    sessionToken?: string
  ): Promise<ApiResponse<GeocodeResponse>> {
    return this.request<GeocodeResponse>('/geocode/place', {
      method: 'POST',
      body: JSON.stringify({ place_id: placeId, session_token: sessionToken }),
    })
  }

  async geocodeAddress(address: string): Promise<ApiResponse<GeocodeResponse>> {
    return this.request<GeocodeResponse>('/geocode', {
      method: 'POST',
      body: JSON.stringify({ address }),
    })
  }
}

export const geocodingApi = new GeocodingApiClient()
