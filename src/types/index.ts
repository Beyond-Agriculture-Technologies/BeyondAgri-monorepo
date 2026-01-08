// User types
export interface User {
  id: string
  email: string
  name?: string
  phone_number?: string
  phone_verified?: boolean
  phone_verified_at?: string
  address?: string
  user_type: 'farmer' | 'wholesaler' | 'admin'
  verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected'
  is_active?: boolean
  createdAt: string
  updatedAt: string
}

// Legacy alias for compatibility
export interface UserProfile extends User {
  role: User['user_type']
}

/**
 * Helper function to create a UserProfile from a User object
 * This ensures proper typing when adding the 'role' field for backwards compatibility
 * @param userData - User object without the role field
 * @returns UserProfile with the role field set to user_type
 */
export function createUserProfile(userData: User): UserProfile {
  return {
    ...userData,
    role: userData.user_type,
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
  user: User
}

export interface RegisterRequest {
  email: string
  password: string
  phone_number?: string
  user_type: 'farmer' | 'wholesaler' | 'admin'
  name?: string
  address?: string
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
  document_type: 'id_card' | 'passport' | 'driver_license' | 'business_license'
  document_number: string
  document_image_url?: string
  additional_info?: string
}

export interface VerificationStatus {
  status: 'unverified' | 'pending' | 'verified' | 'rejected'
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
