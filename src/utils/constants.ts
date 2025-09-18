// API Configuration
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.beyondagri.com'
export const API_VERSION = process.env.EXPO_PUBLIC_API_VERSION || 'v1'
export const API_FULL_URL = `${API_BASE_URL}/api/${API_VERSION}`

// Development Features
export const ENABLE_HIDDEN_FEATURES = process.env.EXPO_PUBLIC_ENABLE_HIDDEN_FEATURES === 'true'

// App Constants
export const APP_COLORS = {
  primary: '#22c55e',
  secondary: '#3b82f6',
  background: '#f8fafc',
  surface: '#ffffff',
  error: '#ef4444',
  warning: '#f59e0b',
  success: '#10b981',
  text: '#1f2937',
  textSecondary: '#6b7280',
}

export const SCREEN_NAMES = {
  AUTH: 'Auth',
  DASHBOARD: 'Dashboard',
  FARMS: 'Farms',
  FARM_DETAIL: 'FarmDetail',
  ADD_FARM: 'AddFarm',
  PHOTOS: 'Photos',
  PROFILE: 'Profile',
} as const

export const USER_ROLES = {
  FARMER: 'farmer',
  WHOLESALER: 'wholesaler',
  ADMIN: 'admin',
} as const