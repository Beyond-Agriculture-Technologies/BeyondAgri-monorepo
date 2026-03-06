// ==================== Enums ====================

export enum OrderStatusEnum {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  DECLINED = 'DECLINED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// ==================== Request Types ====================

export interface CreateOrderRequest {
  listing_id: number
  quantity: number
  buyer_notes?: string
}

export interface ConfirmOrderRequest {
  seller_notes?: string
}

export interface DeclineOrderRequest {
  decline_reason?: string
}

// ==================== Response Types ====================

export interface OrderResponse {
  id: number
  buyer_account_id: number
  seller_account_id: number
  listing_id: number | null
  listing_title: string
  quantity: string // Decimal from backend
  unit: string
  price_per_unit: string // Decimal from backend
  total_price: string // Decimal from backend
  currency: string
  status: OrderStatusEnum
  buyer_notes: string | null
  seller_notes: string | null
  decline_reason: string | null
  confirmed_at: string | null
  declined_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
  buyer_name: string | null
  seller_name: string | null
  seller_farm_name: string | null
}

export interface OrderListResponse {
  data: OrderResponse[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface OrderStatsResponse {
  total_orders: number
  pending_orders: number
  confirmed_orders: number
  completed_orders: number
  declined_orders: number
  cancelled_orders: number
  total_amount: string // Decimal from backend
  currency: string
}

export interface SupplierSummary {
  account_id: number
  name: string | null
  farm_name: string | null
  email: string | null
  phone_number: string | null
  total_orders: number
  total_spent: string // Decimal from backend
  last_order_date: string | null
}

export interface SupplierListResponse {
  data: SupplierSummary[]
  total: number
}

// ==================== Store Types ====================

export interface OrderPagination {
  total: number
  page: number
  page_size: number
  total_pages: number
}
