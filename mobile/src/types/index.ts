// Backend nested profile objects from GET /auth/me
export interface BackendBasicProfile {
  name?: string
  phone_number?: string
  address?: string
}

export interface BackendFarmerProfile {
  farm_name?: string
  farm_location?: string
  farm_size?: number
  farm_address?: string
  farm_street?: string
  farm_city?: string
  farm_province?: string
  farm_postal_code?: string
  farm_country?: string
  farm_latitude?: number
  farm_longitude?: number
  farm_place_id?: string
  farm_elevation?: number
}

// Raw backend response shape from GET /auth/me
export interface BackendUserResponse {
  id: number | string
  email: string
  account_type?: string
  user_type?: string
  status?: string
  is_verified?: boolean
  is_active?: boolean
  created_at?: string
  updated_at?: string
  // Nested profiles from /auth/me
  profile?: BackendBasicProfile
  farmer_profile?: BackendFarmerProfile
  business_profile?: unknown
  // Flat fields (from login response)
  name?: string
  phone_number?: string
  address?: string
  farm_address?: string
  farm_latitude?: number
  farm_longitude?: number
  farm_place_id?: string
  verification_status?: string
}

// User types (frontend-normalized shape)
export interface User {
  id: string
  email: string
  name?: string
  phone_number?: string
  phone_verified?: boolean
  phone_verified_at?: string
  address?: string
  farm_address?: string
  farm_latitude?: number
  farm_longitude?: number
  farm_place_id?: string
  user_type: 'FARMER' | 'WHOLESALER' | 'ADMIN'
  verification_status?: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
  is_active?: boolean
  createdAt: string
  updatedAt: string
}

// Legacy alias for compatibility
export interface UserProfile extends User {
  role: User['user_type']
}

/**
 * Normalizes the backend user response into the frontend User shape.
 * Handles both the login response (flat fields) and /auth/me response (nested profile/farmer_profile).
 */
export function createUserProfile(raw: BackendUserResponse): UserProfile {
  const profile = raw.profile
  const farmerProfile = raw.farmer_profile
  const userType = (raw.account_type || raw.user_type || 'FARMER') as User['user_type']

  return {
    id: String(raw.id),
    email: raw.email,
    name: raw.name || profile?.name,
    phone_number: raw.phone_number || profile?.phone_number,
    address: raw.address || profile?.address,
    farm_address: raw.farm_address || farmerProfile?.farm_address,
    farm_latitude: raw.farm_latitude ?? farmerProfile?.farm_latitude,
    farm_longitude: raw.farm_longitude ?? farmerProfile?.farm_longitude,
    farm_place_id: raw.farm_place_id || farmerProfile?.farm_place_id,
    user_type: userType,
    role: userType,
    verification_status: raw.verification_status as User['verification_status'],
    is_active: raw.is_active,
    createdAt: raw.created_at || '',
    updatedAt: raw.updated_at || '',
  }
}

// Farm types
export interface Farm {
  id: string
  name: string
  location: string
  coordinates: {
    latitude: number
    longitude: number
  }
  area: number
  ownerId: string
  createdAt: string
  updatedAt: string
  syncStatus: 'synced' | 'pending' | 'failed'
}

// Photo types
export interface Photo {
  id: string
  farmId: string
  uri: string
  description?: string
  timestamp: string
  syncStatus: 'synced' | 'pending' | 'failed'
}

// Auth types
export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
}

// Backend Auth Request/Response Types
export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  access_token: string
  id_token: string
  refresh_token: string
  user: BackendUserResponse
}

export interface RegisterRequest {
  email: string
  password: string
  phone_number?: string
  user_type: 'FARMER' | 'WHOLESALER' | 'ADMIN'
  name?: string
  address?: string
  farm_address?: string
  farm_latitude?: number
  farm_longitude?: number
  farm_place_id?: string
}

export interface RegisterResponse {
  user: User
  message: string
}

export interface PasswordResetRequest {
  email: string
}

export interface PasswordResetResponse {
  message: string
  delivery_medium?: string
  destination?: string
}

export interface ConfirmPasswordResetRequest {
  email: string
  confirmation_code: string
  new_password: string
}

export interface ConfirmPasswordResetResponse {
  message: string
}

// API types
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

// Backend API Response (different format)
export interface BackendApiResponse<T> {
  data?: T
  message?: string
  error?: string
}

// Offline action types
export interface OfflineAction {
  id: string
  type: 'CREATE_FARM' | 'UPDATE_FARM' | 'UPLOAD_PHOTO' | 'DELETE_FARM'
  payload: unknown
  timestamp: string
  retryCount: number
}

// Account Management Types
export interface VerificationData {
  document_type: 'ID_CARD' | 'PASSPORT' | 'DRIVER_LICENSE' | 'BUSINESS_LICENSE'
  document_number: string
  document_image_url?: string
  additional_info?: string
}

export interface VerificationStatus {
  status: 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED'
  submitted_at?: string
  reviewed_at?: string
  reviewer_notes?: string
  document_type?: string
}

export interface UserRole {
  role_name: string
  granted_at: string
  granted_by?: string
}

export interface Permission {
  name: string
  description?: string
  resource?: string
  action?: string
}

// Registration Confirmation Types
export interface RegistrationPendingResponse {
  user_sub: string
  code_delivery_medium: string
  code_delivery_destination: string // Masked phone: "+27***4567"
  message: string
}

export interface ConfirmRegistrationRequest {
  email: string
  confirmation_code: string
}

export interface ConfirmRegistrationResponse {
  message: string
  data: null
}

export interface ResendConfirmationRequest {
  email: string
}

// Registration Session State
export interface RegistrationSession {
  email: string
  phoneDestination: string // Masked phone from API
  expiresAt: Date
  canResendAt: Date
}
