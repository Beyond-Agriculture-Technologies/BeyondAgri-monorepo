// BeyondAGRI "Dark Future" Color System

export const DARK_COLORS = {
  // Core backgrounds
  background: '#050505',
  surface: '#0A0A0A',
  surfaceElevated: '#111111',
  surfaceHover: '#1A1A1A',

  // Glassmorphism
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.10)',
  glassElevated: 'rgba(255, 255, 255, 0.08)',

  // Primary - "High-Growth Green"
  primary: '#22c55e',
  primaryDim: 'rgba(34, 197, 94, 0.15)',
  primaryGlow: 'rgba(34, 197, 94, 0.30)',

  // Secondary - "Harvest Orange"
  secondary: '#f97316',
  secondaryDim: 'rgba(249, 115, 22, 0.15)',

  // Semantic
  error: '#ef4444',
  errorDim: 'rgba(239, 68, 68, 0.15)',
  warning: '#f59e0b',
  warningDim: 'rgba(245, 158, 11, 0.15)',
  success: '#10b981',
  successDim: 'rgba(16, 185, 129, 0.15)',
  info: '#3b82f6',
  infoDim: 'rgba(59, 130, 246, 0.15)',
  purple: '#a855f7',
  purpleDim: 'rgba(168, 85, 247, 0.15)',

  // Text
  text: '#F5F5F5',
  textSecondary: '#A1A1AA',
  textTertiary: '#71717A',
  textOnPrimary: '#000000',

  // Borders
  border: 'rgba(255, 255, 255, 0.10)',
  borderLight: 'rgba(255, 255, 255, 0.05)',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.60)',

  // Input specific
  inputBackground: '#0F0F0F',
  inputBorder: 'rgba(255, 255, 255, 0.12)',
  inputBorderFocus: '#22c55e',
  placeholder: '#71717A',
} as const
