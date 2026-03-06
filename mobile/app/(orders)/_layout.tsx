import { Stack } from 'expo-router'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'

export default function OrdersLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: APP_COLORS.background },
        headerStyle: { backgroundColor: APP_COLORS.background },
        headerTintColor: APP_COLORS.text,
        headerTitleStyle: { fontFamily: FONTS.semiBold, color: APP_COLORS.text },
      }}
    />
  )
}
