import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import NetInfo from '@react-native-community/netinfo'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAppStore } from '../src/store/app-store'
import { useAuthStore } from '../src/store/auth-store'
import { BackendAuthService } from '../src/services/auth'
import { dbService } from '../src/services/database'

export default function RootLayout() {
  const setIsOnline = useAppStore((state) => state.setIsOnline)
  const setAuthenticated = useAuthStore((state) => state.setAuthenticated)

  useEffect(() => {
    // Initialize database
    dbService.init()

    // Set up network listener
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false)
    })

    // Check for existing auth session
    BackendAuthService.restoreSession().then(isAuthenticated => {
      setAuthenticated(isAuthenticated)
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