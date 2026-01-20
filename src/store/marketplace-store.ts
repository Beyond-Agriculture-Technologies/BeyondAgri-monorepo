import { create } from 'zustand'
import {
  ProductListingBrowse,
  ProductListingFull,
  PaginatedListingsResponse,
  CreateListingRequest,
  UpdateListingRequest,
  BrowseListingsParams,
  ListingStatusEnum,
  MarketplacePagination,
} from '../types/marketplace'
import { marketplaceApi } from '../services/marketplaceApi'
import { getErrorMessage } from '../utils/error-handler'

interface MarketplaceState {
  // Browse state (public)
  browseListings: ProductListingBrowse[]
  browsePagination: MarketplacePagination
  browseLoading: boolean
  browseError: string | null
  browseFilters: BrowseListingsParams

  // Current listing detail
  // Can be either type depending on source (public endpoint vs my-listings)
  currentListing: (ProductListingBrowse | ProductListingFull) | null
  detailLoading: boolean
  detailError: string | null

  // My listings state (farmer)
  myListings: ProductListingFull[]
  myListingsLoading: boolean
  myListingsError: string | null
  myListingsStatusFilter: ListingStatusEnum | null

  // Reference data
  provinces: string[]
  provincesLoading: boolean
  provincesError: string | null
  categories: string[]
  categoriesLoading: boolean
  categoriesError: string | null

  // Actions - Browse
  fetchBrowseListings: (params?: BrowseListingsParams) => Promise<void>
  fetchNextPage: () => Promise<void>
  setFilter: <K extends keyof BrowseListingsParams>(key: K, value: BrowseListingsParams[K]) => void
  clearFilters: () => void
  refreshBrowse: () => Promise<void>

  // Actions - Detail
  fetchListingDetail: (listingId: number) => Promise<void>
  clearCurrentListing: () => void

  // Actions - My Listings
  fetchMyListings: (status?: ListingStatusEnum) => Promise<void>
  createListing: (data: CreateListingRequest) => Promise<ProductListingFull | null>
  updateListing: (
    listingId: number,
    data: UpdateListingRequest
  ) => Promise<ProductListingFull | null>
  archiveListing: (listingId: number) => Promise<boolean>
  publishListing: (listingId: number) => Promise<boolean>
  pauseListing: (listingId: number) => Promise<boolean>
  resumeListing: (listingId: number) => Promise<boolean>

  // Actions - Reference data
  fetchProvinces: () => Promise<void>
  fetchCategories: () => Promise<void>

  // Reset
  reset: () => void
}

const defaultPagination: MarketplacePagination = {
  total: 0,
  page: 1,
  page_size: 20,
  total_pages: 0,
}

const initialState = {
  // Browse
  browseListings: [],
  browsePagination: { ...defaultPagination },
  browseLoading: false,
  browseError: null,
  browseFilters: {},

  // Detail
  currentListing: null,
  detailLoading: false,
  detailError: null,

  // My listings
  myListings: [],
  myListingsLoading: false,
  myListingsError: null,
  myListingsStatusFilter: null,

  // Reference data
  provinces: [],
  provincesLoading: false,
  provincesError: null,
  categories: [],
  categoriesLoading: false,
  categoriesError: null,
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  ...initialState,

  // ==================== Browse ====================

  fetchBrowseListings: async (params?: BrowseListingsParams) => {
    const filters = params || get().browseFilters
    set({ browseLoading: true, browseError: null, browseFilters: filters })
    try {
      const result = await marketplaceApi.browseListings({
        ...filters,
        page: filters.page || 1,
        page_size: filters.page_size || 20,
      })
      if (!result.success || !result.data) {
        set({
          browseListings: [],
          browseError: result.message || 'Failed to fetch listings',
          browseLoading: false,
        })
        return
      }
      const data = result.data as PaginatedListingsResponse
      set({
        browseListings: data?.data || [],
        browsePagination: {
          total: data?.total || 0,
          page: data?.page || 1,
          page_size: data?.page_size || 20,
          total_pages: data?.total_pages || 0,
        },
        browseLoading: false,
        browseError: null,
      })
    } catch (error: unknown) {
      set({ browseError: getErrorMessage(error), browseLoading: false })
    }
  },

  fetchNextPage: async () => {
    const { browsePagination, browseFilters, browseListings } = get()
    if (browsePagination.page >= browsePagination.total_pages) return

    const nextPage = browsePagination.page + 1
    set({ browseLoading: true, browseError: null })

    try {
      const result = await marketplaceApi.browseListings({
        ...browseFilters,
        page: nextPage,
        page_size: browsePagination.page_size,
      })
      if (!result.success || !result.data) {
        set({ browseError: result.message || 'Failed to load more listings', browseLoading: false })
        return
      }
      const data = result.data as PaginatedListingsResponse
      const newListings = data?.data || []
      // Deduplicate listings by ID to prevent duplicates on refresh/page reload
      const existingIds = new Set(browseListings.map(l => l.id))
      const uniqueNewListings = newListings.filter(l => !existingIds.has(l.id))
      set({
        browseListings: [...browseListings, ...uniqueNewListings],
        browsePagination: {
          total: data?.total || 0,
          page: data?.page || nextPage,
          page_size: data?.page_size || browsePagination.page_size,
          total_pages: data?.total_pages || 0,
        },
        browseLoading: false,
        browseError: null,
      })
    } catch (error: unknown) {
      set({ browseError: getErrorMessage(error), browseLoading: false })
    }
  },

  setFilter: (key, value) => {
    const currentFilters = get().browseFilters
    const newFilters = { ...currentFilters, [key]: value, page: 1 } // Reset to page 1 on filter change
    get().fetchBrowseListings(newFilters)
  },

  clearFilters: () => {
    set({ browseFilters: {} })
    get().fetchBrowseListings({})
  },

  refreshBrowse: async () => {
    const filters = get().browseFilters
    await get().fetchBrowseListings({ ...filters, page: 1 })
  },

  // ==================== Detail ====================

  fetchListingDetail: async (listingId: number) => {
    set({ detailLoading: true, detailError: null })
    try {
      const result = await marketplaceApi.getListingDetail(listingId)
      if (result.success && result.data) {
        // Public endpoint returns ProductListingBrowse (status/dates may be missing)
        // Type is properly declared as union in state
        set({ currentListing: result.data, detailLoading: false })
      } else {
        set({ detailError: result.message || 'Failed to fetch listing', detailLoading: false })
      }
    } catch (error: unknown) {
      set({ detailError: getErrorMessage(error), detailLoading: false })
    }
  },

  clearCurrentListing: () => {
    set({ currentListing: null, detailError: null })
  },

  // ==================== My Listings ====================

  fetchMyListings: async (status?: ListingStatusEnum) => {
    set({ myListingsLoading: true, myListingsError: null, myListingsStatusFilter: status || null })
    try {
      const result = await marketplaceApi.getMyListings(status)
      if (result.success) {
        set({ myListings: result.data, myListingsLoading: false })
      } else {
        set({
          myListingsError: result.message || 'Failed to fetch your listings',
          myListingsLoading: false,
        })
      }
    } catch (error: unknown) {
      set({ myListingsError: getErrorMessage(error), myListingsLoading: false })
    }
  },

  createListing: async (data: CreateListingRequest) => {
    set({ myListingsLoading: true, myListingsError: null })
    try {
      const result = await marketplaceApi.createListing(data)
      if (result.success) {
        set(state => ({
          myListings: [result.data, ...state.myListings],
          myListingsLoading: false,
        }))
        return result.data
      } else {
        set({
          myListingsError: result.message || 'Failed to create listing',
          myListingsLoading: false,
        })
        return null
      }
    } catch (error: unknown) {
      set({ myListingsError: getErrorMessage(error), myListingsLoading: false })
      return null
    }
  },

  updateListing: async (listingId: number, data: UpdateListingRequest) => {
    set({ myListingsLoading: true, myListingsError: null })
    try {
      const result = await marketplaceApi.updateListing(listingId, data)
      if (result.success) {
        set(state => ({
          myListings: state.myListings.map(listing =>
            listing.id === listingId ? result.data : listing
          ),
          currentListing:
            state.currentListing?.id === listingId ? result.data : state.currentListing,
          myListingsLoading: false,
        }))
        return result.data
      } else {
        set({
          myListingsError: result.message || 'Failed to update listing',
          myListingsLoading: false,
        })
        return null
      }
    } catch (error: unknown) {
      set({ myListingsError: getErrorMessage(error), myListingsLoading: false })
      return null
    }
  },

  archiveListing: async (listingId: number) => {
    set({ myListingsLoading: true, myListingsError: null })
    try {
      const result = await marketplaceApi.deleteListing(listingId)
      if (result.success) {
        set(state => ({
          myListings: state.myListings.filter(listing => listing.id !== listingId),
          currentListing: state.currentListing?.id === listingId ? null : state.currentListing,
          myListingsLoading: false,
        }))
        return true
      } else {
        set({
          myListingsError: result.message || 'Failed to archive listing',
          myListingsLoading: false,
        })
        return false
      }
    } catch (error: unknown) {
      set({ myListingsError: getErrorMessage(error), myListingsLoading: false })
      return false
    }
  },

  publishListing: async (listingId: number) => {
    set({ myListingsLoading: true, myListingsError: null })
    try {
      const result = await marketplaceApi.publishListing(listingId)
      if (result.success) {
        set(state => ({
          myListings: state.myListings.map(listing =>
            listing.id === listingId ? result.data : listing
          ),
          currentListing:
            state.currentListing?.id === listingId ? result.data : state.currentListing,
          myListingsLoading: false,
        }))
        return true
      } else {
        set({
          myListingsError: result.message || 'Failed to publish listing',
          myListingsLoading: false,
        })
        return false
      }
    } catch (error: unknown) {
      set({ myListingsError: getErrorMessage(error), myListingsLoading: false })
      return false
    }
  },

  pauseListing: async (listingId: number) => {
    set({ myListingsLoading: true, myListingsError: null })
    try {
      const result = await marketplaceApi.pauseListing(listingId)
      if (result.success) {
        set(state => ({
          myListings: state.myListings.map(listing =>
            listing.id === listingId ? result.data : listing
          ),
          currentListing:
            state.currentListing?.id === listingId ? result.data : state.currentListing,
          myListingsLoading: false,
        }))
        return true
      } else {
        set({
          myListingsError: result.message || 'Failed to pause listing',
          myListingsLoading: false,
        })
        return false
      }
    } catch (error: unknown) {
      set({ myListingsError: getErrorMessage(error), myListingsLoading: false })
      return false
    }
  },

  resumeListing: async (listingId: number) => {
    set({ myListingsLoading: true, myListingsError: null })
    try {
      const result = await marketplaceApi.resumeListing(listingId)
      if (result.success) {
        set(state => ({
          myListings: state.myListings.map(listing =>
            listing.id === listingId ? result.data : listing
          ),
          currentListing:
            state.currentListing?.id === listingId ? result.data : state.currentListing,
          myListingsLoading: false,
        }))
        return true
      } else {
        set({
          myListingsError: result.message || 'Failed to resume listing',
          myListingsLoading: false,
        })
        return false
      }
    } catch (error: unknown) {
      set({ myListingsError: getErrorMessage(error), myListingsLoading: false })
      return false
    }
  },

  // ==================== Reference Data ====================

  fetchProvinces: async () => {
    set({ provincesLoading: true, provincesError: null })
    try {
      const result = await marketplaceApi.getProvinces()
      if (result.success) {
        set({ provinces: result.data, provincesLoading: false, provincesError: null })
      } else {
        set({
          provincesLoading: false,
          provincesError: result.message || 'Failed to load provinces',
        })
      }
    } catch (error: unknown) {
      set({ provincesLoading: false, provincesError: getErrorMessage(error) })
    }
  },

  fetchCategories: async () => {
    set({ categoriesLoading: true, categoriesError: null })
    try {
      const result = await marketplaceApi.getCategories()
      if (result.success) {
        set({ categories: result.data, categoriesLoading: false, categoriesError: null })
      } else {
        set({
          categoriesLoading: false,
          categoriesError: result.message || 'Failed to load categories',
        })
      }
    } catch (error: unknown) {
      set({ categoriesLoading: false, categoriesError: getErrorMessage(error) })
    }
  },

  // ==================== Reset ====================

  reset: () => {
    set(initialState)
  },
}))
