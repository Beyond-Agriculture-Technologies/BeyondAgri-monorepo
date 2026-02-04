import React from 'react'
import { View, StyleSheet, StyleProp, ViewStyle, Platform } from 'react-native'
import { BlurView } from 'expo-blur'
import { DARK_COLORS } from '../../theme'

interface GlassCardProps {
  children: React.ReactNode
  style?: StyleProp<ViewStyle>
  intensity?: number
  noBorder?: boolean
}

export function GlassCard({ children, style, intensity = 20, noBorder }: GlassCardProps) {
  return (
    <View style={[styles.container, !noBorder && styles.border, style]}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={intensity} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.androidFallback]} />
      )}
      <View style={styles.content}>{children}</View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  border: {
    borderWidth: 1,
    borderColor: DARK_COLORS.glassBorder,
  },
  androidFallback: {
    backgroundColor: DARK_COLORS.glass,
  },
  content: {
    padding: 16,
  },
})
