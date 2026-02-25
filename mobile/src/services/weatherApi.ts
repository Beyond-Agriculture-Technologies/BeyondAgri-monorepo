import { API_FULL_URL } from '../utils/constants'
import { BackendAuthService } from './auth'
import { ApiResponse } from '../types'
import {
  CurrentConditionsResponse,
  ForecastResponse,
  WeatherSummaryResponse,
} from '../types/weather'

class WeatherApiClient {
  private baseURL: string

  constructor() {
    this.baseURL = `${API_FULL_URL}/weather`
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

      const text = await response.text()
      let data: Record<string, unknown>
      try {
        data = JSON.parse(text)
      } catch {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      if (!response.ok) {
        const errorMessage =
          data.detail ||
          data.error ||
          data.message ||
          `HTTP ${response.status}: ${response.statusText}`
        throw new Error(String(errorMessage))
      }

      return {
        success: true,
        data: (data.data ?? data) as T,
        message: data.message,
      }
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      console.error('Weather API error:', error.message)

      let userMessage = error.message || 'Network error'
      if (
        error.message?.includes('Network request failed') ||
        error.message?.includes('fetch')
      ) {
        userMessage = 'Unable to connect to server. Please check your internet connection.'
      }

      return {
        success: false,
        data: null as unknown as T,
        message: userMessage,
      }
    }
  }

  async getCurrentConditions(
    latitude: number,
    longitude: number
  ): Promise<ApiResponse<CurrentConditionsResponse>> {
    return this.request<CurrentConditionsResponse>('/current', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    })
  }

  async getForecast(
    latitude: number,
    longitude: number,
    days: number = 5
  ): Promise<ApiResponse<ForecastResponse>> {
    return this.request<ForecastResponse>('/forecast', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude, days }),
    })
  }

  async getWeatherSummary(
    latitude: number,
    longitude: number
  ): Promise<ApiResponse<WeatherSummaryResponse>> {
    return this.request<WeatherSummaryResponse>('/summary', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude }),
    })
  }
}

export const weatherApi = new WeatherApiClient()
