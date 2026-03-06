import { OrderStatusEnum } from '../types/order'

export function getOrderStatusLabel(status: OrderStatusEnum): string {
  switch (status) {
    case OrderStatusEnum.PENDING:
      return 'Pending'
    case OrderStatusEnum.CONFIRMED:
      return 'Confirmed'
    case OrderStatusEnum.DECLINED:
      return 'Declined'
    case OrderStatusEnum.COMPLETED:
      return 'Completed'
    case OrderStatusEnum.CANCELLED:
      return 'Cancelled'
    default:
      return status
  }
}

export function getOrderStatusColor(status: OrderStatusEnum): string {
  switch (status) {
    case OrderStatusEnum.PENDING:
      return '#F59E0B' // Amber
    case OrderStatusEnum.CONFIRMED:
      return '#3B82F6' // Blue
    case OrderStatusEnum.DECLINED:
      return '#EF4444' // Red
    case OrderStatusEnum.COMPLETED:
      return '#10B981' // Green
    case OrderStatusEnum.CANCELLED:
      return '#6B7280' // Gray
    default:
      return '#6B7280'
  }
}

export function formatOrderDate(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function formatOrderDateTime(dateString: string | null): string {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatCurrency(amount: string | number, currency: string = 'ZAR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return `${currency} 0.00`
  return `${currency} ${num.toFixed(2)}`
}
