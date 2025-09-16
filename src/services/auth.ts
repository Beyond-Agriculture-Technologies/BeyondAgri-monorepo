import { Amplify } from 'aws-amplify'
import { signIn, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth'
import { AWS_CONFIG } from '../utils/constants'
import { useAuthStore } from '../store/authStore'
import * as SecureStore from 'expo-secure-store'

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: AWS_CONFIG.userPoolId,
      userPoolClientId: AWS_CONFIG.userPoolWebClientId,
      region: AWS_CONFIG.region,
    }
  }
})

export class AuthService {

  static async signIn(email: string, password: string) {
    try {
      const { isSignedIn, nextStep } = await signIn({
        username: email,
        password,
      })

      if (isSignedIn) {
        const user = await this.getCurrentUser()
        const session = await fetchAuthSession()
        const token = session.tokens?.accessToken?.toString()

        if (user && token) {
          // Store token securely
          await SecureStore.setItemAsync('authToken', token)

          // Update auth store
          const authStore = useAuthStore.getState()
          authStore.setUser(user)
          authStore.setToken(token)
          authStore.setAuthenticated(true)
        }

        return { success: true, user }
      }

      return { success: false, error: 'Sign in failed', nextStep }
    } catch (error) {
      console.error('Sign in error:', error)
      return { success: false, error: error.message || 'Sign in failed' }
    }
  }

  static async signOut() {
    try {
      await signOut()
      await SecureStore.deleteItemAsync('authToken')

      const authStore = useAuthStore.getState()
      authStore.logout()

      return { success: true }
    } catch (error) {
      console.error('Sign out error:', error)
      return { success: false, error: error.message || 'Sign out failed' }
    }
  }

  static async getCurrentUser() {
    try {
      const { username, userId, signInDetails } = await getCurrentUser()

      // You might want to fetch additional user details from your backend here
      // For now, we'll create a basic user object
      return {
        id: userId,
        email: username,
        name: username, // You might want to fetch this from your backend
        role: 'farmer' as const, // You'll need to determine this from your backend
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  static async restoreSession() {
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
    } catch (error) {
      console.error('Restore session error:', error)
      await SecureStore.deleteItemAsync('authToken')
      return false
    }
  }

  static async getAuthToken() {
    try {
      const session = await fetchAuthSession()
      return session.tokens?.accessToken?.toString() || null
    } catch (error) {
      console.error('Get auth token error:', error)
      return null
    }
  }
}