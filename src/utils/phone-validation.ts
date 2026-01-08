/**
 * Phone Validation Utilities for South African Phone Numbers
 *
 * Supports two formats:
 * - E.164 International: +27821234567
 * - South African Local: 0821234567
 */

/**
 * Detects if input string is a phone number
 * Supports: E.164 format (+27...) and SA format (0...)
 */
export function isPhoneNumber(input: string): boolean {
  const trimmed = input.trim()

  // E.164 format: starts with +, followed by 10-15 digits
  const e164Regex = /^\+\d{10,15}$/

  // South African format: starts with 0, followed by 9 digits
  const saRegex = /^0\d{9}$/

  return e164Regex.test(trimmed) || saRegex.test(trimmed)
}

/**
 * Validates phone number format
 * Returns true if the phone number is valid for South Africa
 */
export function isValidPhoneNumber(phone: string): boolean {
  const trimmed = phone.trim()

  // Must be E.164 or SA format
  if (!isPhoneNumber(trimmed)) return false

  // Additional validation: SA numbers must have valid prefixes
  if (trimmed.startsWith('0')) {
    // Valid SA mobile prefixes: 06x, 07x, 08x
    const prefix = trimmed.substring(0, 3)
    return /^0[678]\d/.test(prefix)
  }

  // E.164: check it starts with +27 and has correct length (12 chars total)
  if (trimmed.startsWith('+27')) {
    return trimmed.length === 12
  }

  // Other international numbers - basic validation
  return trimmed.startsWith('+') && trimmed.length >= 11 && trimmed.length <= 16
}

/**
 * Formats phone number for display
 * Examples:
 *   "+27821234567" → "+27 82 123 4567"
 *   "0821234567" → "082 123 4567"
 */
export function formatPhoneNumber(phone: string): string {
  const trimmed = phone.trim()

  if (trimmed.startsWith('+27')) {
    // +27 82 123 4567
    return trimmed.replace(/(\+27)(\d{2})(\d{3})(\d{4})/, '$1 $2 $3 $4')
  }

  if (trimmed.startsWith('0')) {
    // 082 123 4567
    return trimmed.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3')
  }

  // Return as-is if format not recognized
  return phone
}

/**
 * Masks phone number for security/privacy
 * Example: "+27821234567" → "+27 82 *** 4567"
 */
export function maskPhoneNumber(phone: string): string {
  const trimmed = phone.trim()

  if (trimmed.startsWith('+27')) {
    // +27 82 *** 4567
    return trimmed.replace(/(\+27)(\d{2})\d{3}(\d{4})/, '$1 $2 *** $3')
  }

  if (trimmed.startsWith('0')) {
    // 082 *** 4567
    return trimmed.replace(/(\d{3})\d{3}(\d{4})/, '$1 *** $2')
  }

  // Return partially masked for unknown formats
  const len = phone.length
  if (len > 4) {
    return phone.substring(0, 3) + '***' + phone.substring(len - 4)
  }

  return phone
}

/**
 * Normalizes phone to E.164 format for API calls
 * "0821234567" → "+27821234567"
 */
export function normalizePhoneNumber(phone: string): string {
  const trimmed = phone.trim()

  // Already E.164 format
  if (trimmed.startsWith('+')) return trimmed

  // Convert SA format to E.164
  if (trimmed.startsWith('0')) {
    return '+27' + trimmed.substring(1)
  }

  // Return as-is if format not recognized
  return phone
}
