import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { DARK_COLORS } from '../../theme'
import { FONTS } from '../../theme/typography'

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface StatusBadgeProps {
  label: string
  variant?: BadgeVariant
  size?: 'small' | 'medium'
}

const VARIANT_COLORS: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: DARK_COLORS.successDim, text: DARK_COLORS.success },
  warning: { bg: DARK_COLORS.warningDim, text: DARK_COLORS.warning },
  error: { bg: DARK_COLORS.errorDim, text: DARK_COLORS.error },
  info: { bg: DARK_COLORS.infoDim, text: DARK_COLORS.info },
  neutral: { bg: DARK_COLORS.glass, text: DARK_COLORS.textSecondary },
}

export function StatusBadge({ label, variant = 'neutral', size = 'small' }: StatusBadgeProps) {
  const colors = VARIANT_COLORS[variant]
  const isSmall = size === 'small'

  return (
    <View
      style={[styles.badge, { backgroundColor: colors.bg }, isSmall ? styles.small : styles.medium]}
    >
      <Text
        style={[
          styles.text,
          { color: colors.text },
          isSmall ? styles.smallText : styles.mediumText,
        ]}
      >
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  medium: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  text: {
    fontFamily: FONTS.medium,
  },
  smallText: {
    fontSize: 11,
  },
  mediumText: {
    fontSize: 13,
  },
})
