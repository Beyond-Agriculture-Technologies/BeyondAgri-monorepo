// ==================== Enums ====================

export enum ProductCategoryEnum {
  HARVEST = 'HARVEST',
  MEAT = 'MEAT',
  POULTRY = 'POULTRY',
  DAIRY = 'DAIRY',
  GRAINS = 'GRAINS',
  OTHER = 'OTHER',
}

export enum ListingStatusEnum {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  SOLD_OUT = 'SOLD_OUT',
  EXPIRED = 'EXPIRED',
  ARCHIVED = 'ARCHIVED',
}

// ==================== Farmer Summary ====================

export interface FarmerSummary {
  id: number
  farm_name: string | null
  farm_location: string | null
  certifications: Record<string, unknown> | null
}

// ==================== Request Types ====================

export interface CreateListingRequest {
  title: string
  description?: string
  category: ProductCategoryEnum
  available_quantity: number
  unit: string
  price_per_unit: number
  currency?: string
  minimum_order_quantity?: number
  quality_grade?: string
  certifications?: string[]
  photos?: string[]
  expires_at?: string
  province?: string
  city?: string
  inventory_item_id?: number
  publish_immediately?: boolean
}

export interface UpdateListingRequest {
  title?: string
  description?: string
  category?: ProductCategoryEnum
  available_quantity?: number
  unit?: string
  price_per_unit?: number
  currency?: string
  minimum_order_quantity?: number
  quality_grade?: string
  certifications?: string[]
  photos?: string[]
  expires_at?: string
  province?: string
  city?: string
  status?: ListingStatusEnum
}

export interface BrowseListingsParams {
  category?: ProductCategoryEnum
  province?: string
  min_price?: number
  max_price?: number
  search?: string
  featured_only?: boolean
  page?: number
  page_size?: number
}

export interface MyListingsParams {
  status?: ListingStatusEnum
  page?: number
  page_size?: number
}

// ==================== Response Types ====================

export interface ProductListingBrowse {
  id: number
  title: string
  description: string | null
  category: ProductCategoryEnum
  available_quantity: string
  unit: string
  price_per_unit: string
  currency: string
  minimum_order_quantity: string | null
  quality_grade: string | null
  certifications: string[] | null
  photos: string[] | null
  province: string | null
  city: string | null
  farm_name: string | null
  is_featured: boolean
  published_at: string | null
  farmer: FarmerSummary | null
}

export interface ProductListingFull extends ProductListingBrowse {
  farmer_account_id: number
  inventory_item_id: number | null
  status: ListingStatusEnum
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface PaginatedListingsResponse {
  data: ProductListingBrowse[]
  total: number
  page: number
  page_size: number
  total_pages: number
  message: string
}

// ==================== Store Types ====================

export interface MarketplacePagination {
  total: number
  page: number
  page_size: number
  total_pages: number
}

export type MarketplaceFilters = BrowseListingsParams
