import { Ionicons } from '@expo/vector-icons'
import { ListingStatusEnum, ProductCategoryEnum } from '../types/marketplace'
import { APP_COLORS } from './constants'

/**
 * Safely parses a string or number value to a number
 * @param value - Value that can be string or number (common from API responses)
 * @param fallback - Fallback value if parsing fails (default: 0)
 * @returns Parsed number or fallback
 */
function parseNumeric(value: string | number, fallback: number = 0): number {
  const numeric = typeof value === 'string' ? parseFloat(value) : value
  return isNaN(numeric) ? fallback : numeric
}

/**
 * Gets the appropriate color for a listing status
 * @param status - The listing status enum value
 * @returns Color string from APP_COLORS
 */
export function getListingStatusColor(status: ListingStatusEnum | string): string {
  switch (status) {
    case ListingStatusEnum.ACTIVE:
      return APP_COLORS.success
    case ListingStatusEnum.DRAFT:
      return APP_COLORS.textSecondary
    case ListingStatusEnum.PAUSED:
      return APP_COLORS.warning
    case ListingStatusEnum.SOLD_OUT:
      return APP_COLORS.info
    case ListingStatusEnum.EXPIRED:
    case ListingStatusEnum.ARCHIVED:
      return APP_COLORS.error
    default:
      return APP_COLORS.textSecondary
  }
}

/**
 * Gets the human-readable label for a listing status
 * @param status - The listing status enum value
 * @returns Formatted status label
 */
export function getListingStatusLabel(status: ListingStatusEnum | string): string {
  switch (status) {
    case ListingStatusEnum.ACTIVE:
      return 'Active'
    case ListingStatusEnum.DRAFT:
      return 'Draft'
    case ListingStatusEnum.PAUSED:
      return 'Paused'
    case ListingStatusEnum.SOLD_OUT:
      return 'Sold Out'
    case ListingStatusEnum.EXPIRED:
      return 'Expired'
    case ListingStatusEnum.ARCHIVED:
      return 'Archived'
    default:
      return status
  }
}

/**
 * Gets the human-readable label for a product category
 * @param category - The product category enum value
 * @returns Formatted category label
 */
export function getCategoryLabel(category: ProductCategoryEnum | string): string {
  switch (category) {
    case ProductCategoryEnum.HARVEST:
      return 'Harvest'
    case ProductCategoryEnum.MEAT:
      return 'Meat'
    case ProductCategoryEnum.POULTRY:
      return 'Poultry'
    case ProductCategoryEnum.DAIRY:
      return 'Dairy'
    case ProductCategoryEnum.GRAINS:
      return 'Grains'
    case ProductCategoryEnum.OTHER:
      return 'Other'
    default:
      return category
  }
}

/**
 * Gets the appropriate icon name for a product category
 * @param category - The product category enum value
 * @returns Icon name compatible with Ionicons
 */
export function getCategoryIcon(
  category: ProductCategoryEnum | string
): keyof typeof Ionicons.glyphMap {
  switch (category) {
    case ProductCategoryEnum.HARVEST:
      return 'leaf'
    case ProductCategoryEnum.MEAT:
      return 'restaurant'
    case ProductCategoryEnum.POULTRY:
      return 'egg'
    case ProductCategoryEnum.DAIRY:
      return 'water'
    case ProductCategoryEnum.GRAINS:
      return 'nutrition'
    case ProductCategoryEnum.OTHER:
      return 'cube'
    default:
      return 'pricetag'
  }
}

/**
 * Gets the color for a product category
 * @param category - The product category enum value
 * @returns Color string
 */
export function getCategoryColor(category: ProductCategoryEnum | string): string {
  switch (category) {
    case ProductCategoryEnum.HARVEST:
      return APP_COLORS.success
    case ProductCategoryEnum.MEAT:
      return '#dc2626' // Red
    case ProductCategoryEnum.POULTRY:
      return '#f59e0b' // Amber
    case ProductCategoryEnum.DAIRY:
      return '#3b82f6' // Blue
    case ProductCategoryEnum.GRAINS:
      return '#a855f7' // Purple
    case ProductCategoryEnum.OTHER:
      return APP_COLORS.textSecondary
    default:
      return APP_COLORS.textSecondary
  }
}

/**
 * Formats a price value with currency symbol
 * @param price - The price value (can be string or number from API)
 * @param currency - The currency code (defaults to ZAR)
 * @returns Formatted price string
 */
export function formatPrice(price: string | number, currency: string = 'ZAR'): string {
  return `${currency} ${parseNumeric(price).toFixed(2)}`
}

/**
 * Formats the available quantity with unit
 * @param quantity - The quantity value (can be string or number from API)
 * @param unit - The unit of measurement
 * @returns Formatted availability string
 */
export function formatAvailability(quantity: string | number, unit: string): string {
  return `${parseNumeric(quantity)} ${unit} available`
}

/**
 * Formats a price per unit display
 * @param price - The price value (can be string or number from API)
 * @param currency - The currency code
 * @param unit - The unit of measurement
 * @returns Formatted price per unit string
 */
export function formatPricePerUnit(price: string | number, currency: string, unit: string): string {
  return `${currency} ${parseNumeric(price).toFixed(2)} / ${unit}`
}

/**
 * Checks if a listing can be published based on its current status
 * @param status - The current listing status
 * @returns Whether the listing can be published
 */
export function canPublish(status: ListingStatusEnum | string): boolean {
  return status === ListingStatusEnum.DRAFT
}

/**
 * Checks if a listing can be paused based on its current status
 * @param status - The current listing status
 * @returns Whether the listing can be paused
 */
export function canPause(status: ListingStatusEnum | string): boolean {
  return status === ListingStatusEnum.ACTIVE
}

/**
 * Checks if a listing can be resumed based on its current status
 * @param status - The current listing status
 * @returns Whether the listing can be resumed
 */
export function canResume(status: ListingStatusEnum | string): boolean {
  return status === ListingStatusEnum.PAUSED
}

/**
 * Gets the available actions for a listing based on its status
 * @param status - The current listing status
 * @returns Object with boolean flags for each available action
 */
export function getListingActions(status: ListingStatusEnum | string): {
  canEdit: boolean
  canPublish: boolean
  canPause: boolean
  canResume: boolean
  canArchive: boolean
} {
  return {
    canEdit: status !== ListingStatusEnum.ARCHIVED,
    canPublish: status === ListingStatusEnum.DRAFT,
    canPause: status === ListingStatusEnum.ACTIVE,
    canResume: status === ListingStatusEnum.PAUSED,
    canArchive: status !== ListingStatusEnum.ARCHIVED,
  }
}

/**
 * Truncates text to a specified length with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncating
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string | null | undefined, maxLength: number = 100): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Formats a date string for display
 * @param dateString - ISO 8601 date string
 * @returns Formatted date string or empty if invalid
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    // Use undefined locale to use device's default locale
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return ''
  }
}

/**
 * Formats a date string to relative time (e.g., "2 days ago")
 * @param dateString - ISO 8601 date string
 * @returns Relative time string
 */
export function formatRelativeDate(dateString: string | null | undefined): string {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  } catch {
    return ''
  }
}
