import { API_FULL_URL, ENABLE_HIDDEN_FEATURES } from '../utils/constants'
import { useAuthStore } from '../store/auth-store'
import * as SecureStore from 'expo-secure-store'
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  PasswordResetRequest,
  PasswordResetResponse,
  ConfirmPasswordResetRequest,
  ConfirmPasswordResetResponse,
  User,
  BackendApiResponse,
  RegistrationPendingResponse,
  ConfirmRegistrationRequest,
  ConfirmRegistrationResponse,
  ResendConfirmationRequest,
  createUserProfile,
} from '../types'
import { getErrorMessage } from '../utils/error-handler'

export class BackendAuthService {
  static async signIn(identifier: string, password: string) {
    try {
      const loginData: LoginRequest = {
        username: identifier, // Can be email or phone
        password,
      }

      const url = `${API_FULL_URL}/auth/login`

      if (ENABLE_HIDDEN_FEATURES) {
        console.log('🔐 Auth Login Request:', {
          url,
          identifier,
          timestamp: new Date().toISOString(),
        })
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      })

      if (ENABLE_HIDDEN_FEATURES) {
        console.log('📥 Auth Login Response:', {
          url,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          timestamp: new Date().toISOString(),
        })
      }

      const data: BackendApiResponse<LoginResponse> = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Login failed')
      }

      if (data.data) {
        const { access_token, user } = data.data

        // Store tokens securely
        await SecureStore.setItemAsync('authToken', access_token)
        if (data.data.refresh_token) {
          await SecureStore.setItemAsync('refreshToken', data.data.refresh_token)
        }
        if (data.data.id_token) {
          await SecureStore.setItemAsync('idToken', data.data.id_token)
        }

        // Create user profile with role compatibility
        const userProfile = createUserProfile(user)

        // Update auth store
        const authStore = useAuthStore.getState()
        authStore.setUser(userProfile)
        authStore.setToken(access_token)
        authStore.setAuthenticated(true)

        return { success: true, user: userProfile, data: data.data }
      }

      return { success: false, error: 'Invalid response format' }
    } catch (error: unknown) {
      console.error('Sign in error:', error)
      return { success: false, error: getErrorMessage(error) }
    }
  }

  static async register(userData: RegisterRequest) {
    try {
      const url = `${API_FULL_URL}/auth/register`

      if (ENABLE_HIDDEN_FEATURES) {
        console.log('📝 Auth Register Request:', {
          url,
          email: userData.email,
          phone: userData.phone_number?.replace(/\d(?=\d{4})/g, '*'),
          user_type: userData.user_type,
          timestamp: new Date().toISOString(),
        })
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      if (ENABLE_HIDDEN_FEATURES) {
        console.log('📥 Auth Register Response:', {
          url,
          status: response.status,
          statusText: response.statusText,
          timestamp: new Date().toISOString(),
        })
      }

      const data: BackendApiResponse<RegistrationPendingResponse> = await response.json()

      // Check for 202 ACCEPTED (pending confirmation)
      if (response.status === 202 && data.data) {
        return {
          success: true,
          status: 202,
          data: data.data,
          message: data.data.message,
        }
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Registration failed')
      }

      // Fallback for unexpected success responses
      return {
        success: true,
        status: response.status,
        data: data.data,
        message: data.message || 'Registration initiated',
      }
    } catch (error: unknown) {
      console.error('Registration error:', error)
      return { success: false, error: getErrorMessage(error) }
    }
  }

  static async confirmRegistration(email: string, confirmationCode: string) {
    try {
      const confirmData: ConfirmRegistrationRequest = {
        email,
        confirmation_code: confirmationCode,
      }

      const url = `${API_FULL_URL}/auth/confirm-registration`

      if (ENABLE_HIDDEN_FEATURES) {
        console.log('✅ Auth Confirm Registration Request:', {
          url,
          email,
          timestamp: new Date().toISOString(),
        })
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(confirmData),
      })

      const data: BackendApiResponse<ConfirmRegistrationResponse> = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 400) {
          const errorMessage = data.error || data.message || 'Invalid verification code'
          if (errorMessage.toLowerCase().includes('expired')) {
            return {
              success: false,
              error: 'Verification code expired. Please request a new one.',
              expired: true,
            }
          }
          if (errorMessage.toLowerCase().includes('invalid')) {
            return {
              success: false,
              error: 'Invalid verification code. Please try again.',
              invalid: true,
            }
          }
          if (errorMessage.toLowerCase().includes('already confirmed')) {
            return {
              success: false,
              error: 'Account already confirmed. Please login.',
              alreadyConfirmed: true,
            }
          }
        }

        // Handle rate limiting (429)
        if (response.status === 429) {
          return {
            success: false,
            error: 'Too many requests. Please wait before trying again.',
            rateLimited: true,
          }
        }

        // Handle server errors (500)
        if (response.status === 500) {
          return {
            success: false,
            error: 'Something went wrong on our end. Please try again later.',
            serverError: true,
          }
        }

        throw new Error(data.error || data.message || 'Confirmation failed')
      }

      return {
        success: true,
        message: data.data?.message || data.message || 'Registration completed successfully',
      }
    } catch (error: unknown) {
      console.error('Confirm registration error:', error)
      return { success: false, error: getErrorMessage(error) }
    }
  }

  static async resendConfirmation(email: string) {
    try {
      const resendData: ResendConfirmationRequest = { email }

      const url = `${API_FULL_URL}/auth/resend-confirmation`

      if (ENABLE_HIDDEN_FEATURES) {
        console.log('📤 Auth Resend Confirmation Request:', {
          url,
          email,
          timestamp: new Date().toISOString(),
        })
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resendData),
      })

      const data: BackendApiResponse<RegistrationPendingResponse> = await response.json()

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 404) {
          return {
            success: false,
            error: 'No registration found. Please register first.',
            notFound: true,
          }
        }
        if (response.status === 429) {
          return {
            success: false,
            error: 'Too many requests. Please wait before requesting another code.',
            rateLimited: true,
          }
        }
        if (response.status === 500) {
          return {
            success: false,
            error: 'Something went wrong on our end. Please try again later.',
            serverError: true,
          }
        }

        throw new Error(data.error || data.message || 'Failed to resend code')
      }

      return {
        success: true,
        data: data.data,
        message: data.data?.message || 'Verification code resent',
      }
    } catch (error: unknown) {
      console.error('Resend confirmation error:', error)
      return { success: false, error: getErrorMessage(error) }
    }
  }

  static async signOut() {
    try {
      const token = await SecureStore.getItemAsync('authToken')

      if (token) {
        // Call backend logout endpoint
        await fetch(`${API_FULL_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      }

      // Clear stored tokens
      await SecureStore.deleteItemAsync('authToken')
      await SecureStore.deleteItemAsync('refreshToken')
      await SecureStore.deleteItemAsync('idToken')

      // Update auth store
      const authStore = useAuthStore.getState()
      authStore.logout()

      return { success: true }
    } catch (error: unknown) {
      console.error('Sign out error:', error)
      // Even if backend call fails, clear local tokens
      await SecureStore.deleteItemAsync('authToken')
      await SecureStore.deleteItemAsync('refreshToken')
      await SecureStore.deleteItemAsync('idToken')

      const authStore = useAuthStore.getState()
      authStore.logout()

      return { success: false, error: getErrorMessage(error) }
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const token = await SecureStore.getItemAsync('authToken')
      if (!token) return null

      const response = await fetch(`${API_FULL_URL}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        // Token might be expired
        if (response.status === 401) {
          await this.signOut()
        }
        return null
      }

      const data: BackendApiResponse<User> = await response.json()

      if (data.data) {
        return createUserProfile(data.data)
      }

      return null
    } catch (error: unknown) {
      console.error('Get current user error:', error)
      return null
    }
  }

  static async restoreSession(): Promise<boolean> {
    try {
      const token = await SecureStore.getItemAsync('authToken')
      if (!token) return false

      const user = await this.getCurrentUser()
      if (user) {
        const authStore = useAuthStore.getState()
        authStore.setUser(user)
        authStore.setToken(token)
        authStore.setAuthenticated(true)
        return true
      }

      return false
    } catch (error: unknown) {
      console.error('Restore session error:', error)
      await this.signOut() // Clear invalid session
      return false
    }
  }

  static async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('authToken')
    } catch (error: unknown) {
      console.error('Get auth token error:', error)
      return null
    }
  }

  static async requestPasswordReset(identifier: string) {
    try {
      const resetData: PasswordResetRequest = { email: identifier } // Backend uses 'email' field for both email and phone

      const response = await fetch(`${API_FULL_URL}/auth/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(resetData),
      })

      const data: BackendApiResponse<PasswordResetResponse> = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Password reset request failed')
      }

      return {
        success: true,
        message: data.data?.message || 'Password reset code sent',
        deliveryMedium: data.data?.delivery_medium,
        destination: data.data?.destination,
      }
    } catch (error: unknown) {
      console.error('Password reset error:', error)
      return { success: false, error: getErrorMessage(error) }
    }
  }

  static async confirmPasswordReset(email: string, confirmationCode: string, newPassword: string) {
    try {
      const confirmData: ConfirmPasswordResetRequest = {
        email,
        confirmation_code: confirmationCode,
        new_password: newPassword,
      }

      const response = await fetch(`${API_FULL_URL}/auth/confirm-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(confirmData),
      })

      const data: BackendApiResponse<ConfirmPasswordResetResponse> = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Password reset confirmation failed')
      }

      return {
        success: true,
        message: data.data?.message || 'Password reset successful',
      }
    } catch (error: unknown) {
      console.error('Password reset confirmation error:', error)
      return { success: false, error: getErrorMessage(error) }
    }
  }

  // Token refresh functionality (if your backend supports it)
  static async refreshAuthToken(): Promise<boolean> {
    try {
      const refreshToken = await SecureStore.getItemAsync('refreshToken')
      if (!refreshToken) return false

      // Note: You'll need to implement a refresh endpoint in your backend
      // For now, we'll just return false to indicate refresh failed
      console.log('Token refresh not implemented in backend yet')
      return false
    } catch (error: unknown) {
      console.error('Token refresh error:', error)
      return false
    }
  }
}
