import { DARK_COLORS } from '../theme/colors'

// API Configuration
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://api.beyondagri.com'
export const API_VERSION = process.env.EXPO_PUBLIC_API_VERSION || 'v1'
export const API_FULL_URL = `${API_BASE_URL}/api/${API_VERSION}`

// Development Features
export const ENABLE_HIDDEN_FEATURES = process.env.EXPO_PUBLIC_ENABLE_HIDDEN_FEATURES === 'true'

// RBAC Configuration
export const DISABLE_RBAC = process.env.EXPO_PUBLIC_DISABLE_RBAC === 'true'

// App Constants - Dark Future Theme
export const APP_COLORS = {
  ...DARK_COLORS,
} as const

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
  FARMER: 'FARMER',
  WHOLESALER: 'WHOLESALER',
  ADMIN: 'ADMIN',
} as const

// OTP Configuration
export const OTP_CONFIG = {
  EXPIRY_MS: 3 * 60 * 1000, // 3 minutes
  RESEND_DELAY_MS: 30 * 1000, // 30 seconds
  CODE_LENGTH: 6, // 6-digit OTP code
} as const

// Inventory Configuration
export const INVENTORY_DEFAULTS = {
  CURRENCY: 'ZAR',
  DEFAULT_COUNTRY: 'ZA',
} as const
