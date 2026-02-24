/**
 * OTP (One-Time Password) Helper Utilities
 *
 * Provides functions for validating, formatting, and managing OTP codes
 * and countdown timers for verification flows.
 */

import { OTP_CONFIG } from './constants'

/**
 * Validates OTP code format (6 digits)
 */
export function isValidOTPCode(code: string): boolean {
  const pattern = new RegExp(`^\\d{${OTP_CONFIG.CODE_LENGTH}}$`)
  return pattern.test(code.trim())
}

/**
 * Formats OTP code with spacing for display
 * "123456" → "123 456"
 */
export function formatOTPCode(code: string): string {
  const cleaned = code.replace(/\D/g, '')
  if (cleaned.length <= 3) return cleaned
  return `${cleaned.slice(0, 3)} ${cleaned.slice(3, OTP_CONFIG.CODE_LENGTH)}`
}

/**
 * Calculates remaining seconds until expiration
 * Returns 0 if expired, invalid, or null, otherwise returns positive integer
 */
export function calculateTimeRemaining(expiresAt: Date | null | undefined): number {
  if (!expiresAt) return 0
  const now = new Date()
  const diff = expiresAt.getTime() - now.getTime()
  return Math.max(0, Math.floor(diff / 1000))
}

/**
 * Formats countdown timer
 * 125 → "2:05"
 * 45 → "0:45"
 * 5 → "0:05"
 */
export function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Checks if OTP can be resent based on rate limit
 * Returns false if canResendAt is null or undefined
 */
export function canResendOTP(canResendAt: Date | null | undefined): boolean {
  if (!canResendAt) return false
  return new Date() >= canResendAt
}
