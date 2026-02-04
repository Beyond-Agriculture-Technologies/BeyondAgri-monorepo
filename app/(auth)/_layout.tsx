import { Stack } from 'expo-router'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: APP_COLORS.background },
        headerStyle: { backgroundColor: APP_COLORS.background },
        headerTintColor: APP_COLORS.text,
        headerTitleStyle: { fontFamily: FONTS.semiBold, color: APP_COLORS.text },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="index" />
      <Stack.Screen name="register" />
      <Stack.Screen name="password-reset" />
      <Stack.Screen name="confirm-password-reset" />
    </Stack>
  )
}
