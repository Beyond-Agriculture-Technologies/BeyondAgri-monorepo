// BeyondAGRI Typography System - Plus Jakarta Sans

import { TextStyle } from 'react-native'

export const FONTS = {
  regular: 'PlusJakartaSans-Regular',
  medium: 'PlusJakartaSans-Medium',
  semiBold: 'PlusJakartaSans-SemiBold',
  bold: 'PlusJakartaSans-Bold',
  extraBold: 'PlusJakartaSans-ExtraBold',
} as const

export const TEXT_STYLES: Record<string, TextStyle> = {
  heroTitle: {
    fontFamily: FONTS.extraBold,
    fontSize: 32,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  h1: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  h2: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  h3: {
    fontFamily: FONTS.semiBold,
    fontSize: 20,
    letterSpacing: -0.2,
    lineHeight: 26,
  },
  h4: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    lineHeight: 24,
  },
  bodyLarge: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    lineHeight: 24,
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  label: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    lineHeight: 20,
  },
  labelSmall: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  button: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    lineHeight: 22,
  },
  buttonSmall: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    lineHeight: 20,
  },
  stat: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    letterSpacing: -0.3,
  },
  price: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    letterSpacing: -0.2,
  },
} as const
