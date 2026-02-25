import { create } from 'zustand'
import { WeatherSummaryResponse } from '../types/weather'
import { weatherApi } from '../services/weatherApi'

interface WeatherState {
  // Data
  weather: WeatherSummaryResponse | null
  lastFetchedAt: number | null
  lastLatitude: number | null
  lastLongitude: number | null

  // Loading / Error
  isLoading: boolean
  error: string | null

  // Actions
  fetchWeather: (latitude: number, longitude: number, force?: boolean) => Promise<void>
  clearWeather: () => void
}

// Cache weather for 30 minutes
const CACHE_DURATION_MS = 30 * 60 * 1000

export const useWeatherStore = create<WeatherState>((set, get) => ({
  weather: null,
  lastFetchedAt: null,
  lastLatitude: null,
  lastLongitude: null,
  isLoading: false,
  error: null,

  fetchWeather: async (latitude: number, longitude: number, force: boolean = false) => {
    const state = get()

    // Skip if cached data is fresh and for the same location
    if (
      !force &&
      state.weather &&
      state.lastFetchedAt &&
      state.lastLatitude === latitude &&
      state.lastLongitude === longitude &&
      Date.now() - state.lastFetchedAt < CACHE_DURATION_MS
    ) {
      return
    }

    set({ isLoading: true, error: null })
    try {
      const result = await weatherApi.getWeatherSummary(latitude, longitude)
      if (result.success) {
        set({
          weather: result.data,
          lastFetchedAt: Date.now(),
          lastLatitude: latitude,
          lastLongitude: longitude,
          isLoading: false,
        })
      } else {
        set({ error: result.message || 'Failed to fetch weather', isLoading: false })
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch weather'
      set({ error: message, isLoading: false })
    }
  },

  clearWeather: () => {
    set({
      weather: null,
      lastFetchedAt: null,
      lastLatitude: null,
      lastLongitude: null,
      error: null,
    })
  },
}))
