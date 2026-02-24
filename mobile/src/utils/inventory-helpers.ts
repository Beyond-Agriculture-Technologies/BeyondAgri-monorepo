import { Ionicons } from '@expo/vector-icons'
import { TransactionTypeEnum, InventoryStatusEnum } from '../types/inventory'
import { APP_COLORS } from './constants'

/**
 * Gets the appropriate icon name for a transaction type
 * @param type - The transaction type enum value
 * @returns Icon name compatible with Ionicons
 */
export function getTransactionIcon(type: TransactionTypeEnum): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case TransactionTypeEnum.ADD:
      return 'add-circle'
    case TransactionTypeEnum.REMOVE:
      return 'remove-circle'
    case TransactionTypeEnum.TRANSFER:
      return 'swap-horizontal'
    case TransactionTypeEnum.ADJUSTMENT:
      return 'create'
    case TransactionTypeEnum.SALE:
      return 'cash'
    case TransactionTypeEnum.SPOILAGE:
      return 'warning'
    case TransactionTypeEnum.RETURN:
      return 'return-up-back'
    default:
      return 'document'
  }
}

/**
 * Gets the appropriate color for a transaction type
 * @param type - The transaction type enum value
 * @returns Color string from APP_COLORS or hex code
 */
export function getTransactionColor(type: TransactionTypeEnum): string {
  switch (type) {
    case TransactionTypeEnum.ADD:
      return APP_COLORS.success
    case TransactionTypeEnum.REMOVE:
    case TransactionTypeEnum.SPOILAGE:
      return APP_COLORS.error
    case TransactionTypeEnum.TRANSFER:
      return APP_COLORS.info
    case TransactionTypeEnum.SALE:
      return APP_COLORS.primary
    case TransactionTypeEnum.ADJUSTMENT:
      return APP_COLORS.warning
    case TransactionTypeEnum.RETURN:
      return APP_COLORS.secondary
    default:
      return APP_COLORS.textSecondary
  }
}

/**
 * Formats a transaction type enum value into a human-readable string
 * @param type - The transaction type enum value
 * @returns Formatted string (e.g., "Add" or "Adjust Inventory")
 */
export function formatTransactionType(type: TransactionTypeEnum): string {
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Gets the appropriate color for an inventory status
 * @param status - The inventory status enum value or string
 * @returns Color string from APP_COLORS
 */
export function getInventoryStatusColor(status: InventoryStatusEnum | string): string {
  switch (status) {
    case InventoryStatusEnum.AVAILABLE:
      return APP_COLORS.success
    case InventoryStatusEnum.RESERVED:
      return APP_COLORS.warning
    case InventoryStatusEnum.SOLD:
      return APP_COLORS.info
    case InventoryStatusEnum.EXPIRED:
    case InventoryStatusEnum.DAMAGED:
      return APP_COLORS.error
    default:
      return APP_COLORS.textSecondary
  }
}
