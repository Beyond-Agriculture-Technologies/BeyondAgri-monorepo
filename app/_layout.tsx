import { useEffect, useState, useCallback } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import * as SplashScreen from 'expo-splash-screen'
import { useFonts } from 'expo-font'
import NetInfo from '@react-native-community/netinfo'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useAppStore } from '../src/store/app-store'
import { useAuthStore } from '../src/store/auth-store'
import { BackendAuthService } from '../src/services/auth'
import { dbService } from '../src/services/database'
import { API_FULL_URL, ENABLE_HIDDEN_FEATURES, APP_COLORS } from '../src/utils/constants'

SplashScreen.preventAutoHideAsync()

export default function RootLayout() {
  const setIsOnline = useAppStore(state => state.setIsOnline)
  const setAuthenticated = useAuthStore(state => state.setAuthenticated)
  const [isDbReady, setIsDbReady] = useState(false)

  /* eslint-disable @typescript-eslint/no-require-imports */
  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-Regular': require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Medium': require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
    'PlusJakartaSans-SemiBold': require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-Bold': require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
    'PlusJakartaSans-ExtraBold': require('../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
  })
  /* eslint-enable @typescript-eslint/no-require-imports */

  useEffect(() => {
    // Initialize app
    const initializeApp = async () => {
      try {
        // Log environment configuration in development
        if (ENABLE_HIDDEN_FEATURES) {
          console.log('🚀 BeyondAgri App Starting:', {
            apiUrl: API_FULL_URL,
            debugEnabled: ENABLE_HIDDEN_FEATURES,
            timestamp: new Date().toISOString(),
          })
        }

        // Initialize database - AWAIT to ensure it's ready
        console.log('[App] Initializing database...')
        await dbService.init()
        console.log('[App] Database initialized successfully')

        // Check for existing auth session
        const isAuthenticated = await BackendAuthService.restoreSession()
        setAuthenticated(isAuthenticated)

        if (ENABLE_HIDDEN_FEATURES) {
          console.log('🔐 Auth Session:', {
            restored: isAuthenticated,
            timestamp: new Date().toISOString(),
          })
        }

        // Mark database as ready
        setIsDbReady(true)
        console.log('[App] App initialization complete')
      } catch (error) {
        console.error('[App] Initialization error:', error)
        // Still mark as ready to show error state rather than infinite loading
        setIsDbReady(true)
      }
    }

    initializeApp()

    // Set up network listener
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false)

      if (ENABLE_HIDDEN_FEATURES) {
        console.log('📶 Network Status:', {
          isConnected: state.isConnected,
          type: state.type,
          timestamp: new Date().toISOString(),
        })
      }
    })

    return () => unsubscribe()
  }, [])

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && isDbReady) {
      await SplashScreen.hideAsync()
    }
  }, [fontsLoaded, isDbReady])

  if (!fontsLoaded || !isDbReady) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
        </View>
      </SafeAreaProvider>
    )
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </View>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: APP_COLORS.background,
  },
})
