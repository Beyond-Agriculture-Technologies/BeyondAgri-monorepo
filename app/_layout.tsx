import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import NetInfo from '@react-native-community/netinfo'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAppStore } from '../src/store/app-store'
import { useAuthStore } from '../src/store/auth-store'
import { BackendAuthService } from '../src/services/auth'
import { dbService } from '../src/services/database'
import { API_FULL_URL, ENABLE_HIDDEN_FEATURES } from '../src/utils/constants'

export default function RootLayout() {
  const setIsOnline = useAppStore((state) => state.setIsOnline)
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated)

  useEffect(() => {
    // Log environment configuration in development
    if (ENABLE_HIDDEN_FEATURES) {
      console.log('🚀 BeyondAgri App Starting:', {
        apiUrl: API_FULL_URL,
        debugEnabled: ENABLE_HIDDEN_FEATURES,
        timestamp: new Date().toISOString()
      })
    }

    // Initialize database
    dbService.init()

    // Set up network listener
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false)

      if (ENABLE_HIDDEN_FEATURES) {
        console.log('📶 Network Status:', {
          isConnected: state.isConnected,
          type: state.type,
          timestamp: new Date().toISOString()
        })
      }
    })

    // Check for existing auth session
    BackendAuthService.restoreSession().then(isAuthenticated => {
      setAuthenticated(isAuthenticated)

      if (ENABLE_HIDDEN_FEATURES) {
        console.log('🔐 Auth Session:', {
          restored: isAuthenticated,
          timestamp: new Date().toISOString()
        })
      }
    })

    return () => unsubscribe()
  }, [])

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SafeAreaProvider>
  )
}