import { API_FULL_URL } from '../utils/constants'
import { useAuthStore } from '../store/authStore'
import * as SecureStore from 'expo-secure-store'
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  PasswordResetRequest,
  PasswordResetResponse,
  ConfirmPasswordResetRequest,
  ConfirmPasswordResetResponse,
  User,
  BackendApiResponse
} from '../types'

export class BackendAuthService {

  static async signIn(email: string, password: string) {
    try {
      const loginData: LoginRequest = {
        username: email,
        password,
      }

      const response = await fetch(`${API_FULL_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData),
      })

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
        const userProfile = {
          ...user,
          role: user.user_type, // For backwards compatibility
        }

        // Update auth store
        const authStore = useAuthStore.getState()
        authStore.setUser(userProfile as any)
        authStore.setToken(access_token)
        authStore.setAuthenticated(true)

        return { success: true, user: userProfile, data: data.data }
      }

      return { success: false, error: 'Invalid response format' }
    } catch (error: any) {
      console.error('Sign in error:', error)
      return { success: false, error: error.message || 'Sign in failed' }
    }
  }

  static async register(userData: RegisterRequest) {
    try {
      const response = await fetch(`${API_FULL_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      })

      const data: BackendApiResponse<RegisterResponse> = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Registration failed')
      }

      return {
        success: true,
        user: data.data?.user,
        message: data.data?.message || 'Registration successful'
      }
    } catch (error: any) {
      console.error('Registration error:', error)
      return { success: false, error: error.message || 'Registration failed' }
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
            'Authorization': `Bearer ${token}`,
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
    } catch (error: any) {
      console.error('Sign out error:', error)
      // Even if backend call fails, clear local tokens
      await SecureStore.deleteItemAsync('authToken')
      await SecureStore.deleteItemAsync('refreshToken')
      await SecureStore.deleteItemAsync('idToken')

      const authStore = useAuthStore.getState()
      authStore.logout()

      return { success: false, error: error.message || 'Sign out failed' }
    }
  }

  static async getCurrentUser(): Promise<User | null> {
    try {
      const token = await SecureStore.getItemAsync('authToken')
      if (!token) return null

      const response = await fetch(`${API_FULL_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
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
        return {
          ...data.data,
          role: data.data.user_type, // Add role for compatibility
        } as any
      }

      return null
    } catch (error) {
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
        authStore.setUser(user as any)
        authStore.setToken(token)
        authStore.setAuthenticated(true)
        return true
      }

      return false
    } catch (error) {
      console.error('Restore session error:', error)
      await this.signOut() // Clear invalid session
      return false
    }
  }

  static async getAuthToken(): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync('authToken')
    } catch (error) {
      console.error('Get auth token error:', error)
      return null
    }
  }

  static async requestPasswordReset(email: string) {
    try {
      const resetData: PasswordResetRequest = { email }

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
        destination: data.data?.destination
      }
    } catch (error: any) {
      console.error('Password reset error:', error)
      return { success: false, error: error.message || 'Password reset request failed' }
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
        message: data.data?.message || 'Password reset successful'
      }
    } catch (error: any) {
      console.error('Password reset confirmation error:', error)
      return { success: false, error: error.message || 'Password reset confirmation failed' }
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
    } catch (error) {
      console.error('Token refresh error:', error)
      return false
    }
  }
}