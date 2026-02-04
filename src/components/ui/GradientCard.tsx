import React from 'react'
import { ColorValue, StyleProp, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { DARK_COLORS } from '../../theme/colors'

interface GradientCardProps {
  children: React.ReactNode
  colors?: [ColorValue, ColorValue, ...ColorValue[]]
  style?: StyleProp<ViewStyle>
  start?: { x: number; y: number }
  end?: { x: number; y: number }
}

export function GradientCard({
  children,
  colors = [DARK_COLORS.primaryDim, 'rgba(34, 197, 94, 0.02)'],
  style,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
}: GradientCardProps) {
  return (
    <LinearGradient
      colors={colors}
      start={start}
      end={end}
      style={[{ borderRadius: 16, overflow: 'hidden' as const }, style]}
    >
      {children}
    </LinearGradient>
  )
}
