import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useMarketplaceStore } from '../../src/store/marketplace-store'
import { useAppStore } from '../../src/store/app-store'
import { APP_COLORS } from '../../src/utils/constants'
import { ProductListingBrowse, ProductCategoryEnum } from '../../src/types/marketplace'
import {
  formatPricePerUnit,
  formatAvailability,
  getCategoryLabel,
  getCategoryIcon,
  getCategoryColor,
  truncateText,
} from '../../src/utils/marketplace-helpers'

export default function BrowseMarketplaceScreen() {
  const params = useLocalSearchParams<{ category?: string }>()
  const { isOnline } = useAppStore()
  const {
    browseListings,
    browsePagination,
    browseLoading,
    browseError,
    browseFilters,
    fetchBrowseListings,
    fetchNextPage,
    setFilter,
    clearFilters,
    fetchProvinces,
    fetchCategories,
    provinces,
    categories,
  } = useMarketplaceStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(params.category)
  const [selectedProvince, setSelectedProvince] = useState<string | undefined>()
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [priceRangeError, setPriceRangeError] = useState<string | null>(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (params.category && params.category !== selectedCategory) {
      setSelectedCategory(params.category)
      setFilter('category', params.category as ProductCategoryEnum)
    }
  }, [params.category])

  const loadInitialData = async () => {
    await Promise.all([
      fetchBrowseListings(
        params.category ? { category: params.category as ProductCategoryEnum } : {}
      ),
      fetchProvinces(),
      fetchCategories(),
    ])
  }

  const onRefresh = async () => {
    if (!isOnline) return
    setRefreshing(true)
    await fetchBrowseListings({ ...browseFilters, page: 1 })
    setRefreshing(false)
  }

  const handleSearch = useCallback(() => {
    setFilter('search', searchQuery || undefined)
  }, [searchQuery])

  const handleApplyFilters = () => {
    // Validate price range
    const minPriceNum = minPrice ? parseFloat(minPrice) : null
    const maxPriceNum = maxPrice ? parseFloat(maxPrice) : null

    if (minPriceNum !== null && maxPriceNum !== null && minPriceNum > maxPriceNum) {
      setPriceRangeError('Minimum price cannot be greater than maximum price')
      return
    }
    setPriceRangeError(null)

    const newFilters: Record<string, unknown> = {}

    if (selectedCategory) {
      newFilters.category = selectedCategory as ProductCategoryEnum
    }
    if (selectedProvince) {
      newFilters.province = selectedProvince
    }
    if (minPriceNum !== null) {
      newFilters.min_price = minPriceNum
    }
    if (maxPriceNum !== null) {
      newFilters.max_price = maxPriceNum
    }
    if (searchQuery) {
      newFilters.search = searchQuery
    }

    fetchBrowseListings(newFilters)
    setShowFilters(false)
  }

  const handleClearFilters = () => {
    setSelectedCategory(undefined)
    setSelectedProvince(undefined)
    setMinPrice('')
    setMaxPrice('')
    setSearchQuery('')
    setPriceRangeError(null)
    clearFilters()
    setShowFilters(false)
  }

  const handleLoadMore = () => {
    if (!browseLoading && browsePagination.page < browsePagination.total_pages) {
      fetchNextPage()
    }
  }

  const renderListingCard = useCallback(
    ({ item }: { item: ProductListingBrowse }) => (
      <TouchableOpacity
        style={styles.listingCard}
        onPress={() => router.push(`/(marketplace)/listing-details?id=${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.categoryBadge}>
            <Ionicons
              name={getCategoryIcon(item.category)}
              size={14}
              color={getCategoryColor(item.category)}
            />
            <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
              {getCategoryLabel(item.category)}
            </Text>
          </View>
          {item.is_featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color="#f59e0b" />
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {item.title}
        </Text>

        {item.description && (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {truncateText(item.description, 80)}
          </Text>
        )}

        <View style={styles.cardDetails}>
          <View style={styles.priceSection}>
            <Text style={styles.priceText}>
              {formatPricePerUnit(item.price_per_unit, item.currency, item.unit)}
            </Text>
            <Text style={styles.availabilityText}>
              {formatAvailability(item.available_quantity, item.unit)}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          {item.farm_name && (
            <View style={styles.farmerInfo}>
              <Ionicons name="leaf" size={14} color={APP_COLORS.primary} />
              <Text style={styles.farmerName} numberOfLines={1}>
                {item.farm_name}
              </Text>
            </View>
          )}
          {item.province && (
            <View style={styles.locationInfo}>
              <Ionicons name="location" size={14} color={APP_COLORS.textSecondary} />
              <Text style={styles.locationText}>{item.province}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    ),
    []
  )

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Back button and title */}
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={APP_COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Browse Marketplace</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={APP_COLORS.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search listings..."
            placeholderTextColor={APP_COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(true)}>
          <Ionicons name="options" size={24} color={APP_COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Active filters */}
      {(selectedCategory || selectedProvince || minPrice || maxPrice) && (
        <View style={styles.activeFilters}>
          {selectedCategory && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{getCategoryLabel(selectedCategory)}</Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedCategory(undefined)
                  setFilter('category', undefined)
                }}
              >
                <Ionicons name="close" size={16} color={APP_COLORS.text} />
              </TouchableOpacity>
            </View>
          )}
          {selectedProvince && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{selectedProvince}</Text>
              <TouchableOpacity
                onPress={() => {
                  setSelectedProvince(undefined)
                  setFilter('province', undefined)
                }}
              >
                <Ionicons name="close" size={16} color={APP_COLORS.text} />
              </TouchableOpacity>
            </View>
          )}
          {(minPrice || maxPrice) && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>
                Price: {minPrice || '0'} - {maxPrice || 'Any'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setMinPrice('')
                  setMaxPrice('')
                  setFilter('min_price', undefined)
                  setFilter('max_price', undefined)
                }}
              >
                <Ionicons name="close" size={16} color={APP_COLORS.text} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Results count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {browsePagination.total} {browsePagination.total === 1 ? 'listing' : 'listings'} found
        </Text>
      </View>
    </View>
  )

  const renderEmpty = () => {
    if (browseLoading) return null
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="storefront" size={64} color={APP_COLORS.textSecondary} />
        <Text style={styles.emptyTitle}>No Listings Found</Text>
        <Text style={styles.emptyText}>
          {browseError ? browseError : 'Try adjusting your filters or search query'}
        </Text>
        <TouchableOpacity style={styles.clearButton} onPress={handleClearFilters}>
          <Text style={styles.clearButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const renderFooter = () => {
    if (!browseLoading) return null
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={APP_COLORS.primary} />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={browseListings}
        renderItem={renderListingCard}
        keyExtractor={item => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={APP_COLORS.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
      />

      {/* Filters Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={28} color={APP_COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Filters</Text>
            <TouchableOpacity onPress={handleClearFilters}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {/* Category Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Category</Text>
              <View style={styles.filterOptions}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.optionChip, selectedCategory === cat && styles.optionChipActive]}
                    onPress={() => setSelectedCategory(selectedCategory === cat ? undefined : cat)}
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        selectedCategory === cat && styles.optionChipTextActive,
                      ]}
                    >
                      {getCategoryLabel(cat)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Province Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Province</Text>
              <View style={styles.filterOptions}>
                {provinces.map(prov => (
                  <TouchableOpacity
                    key={prov}
                    style={[
                      styles.optionChip,
                      selectedProvince === prov && styles.optionChipActive,
                    ]}
                    onPress={() =>
                      setSelectedProvince(selectedProvince === prov ? undefined : prov)
                    }
                  >
                    <Text
                      style={[
                        styles.optionChipText,
                        selectedProvince === prov && styles.optionChipTextActive,
                      ]}
                    >
                      {prov}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Range */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Price Range (ZAR)</Text>
              <View style={styles.priceInputs}>
                <TextInput
                  style={[styles.priceInput, priceRangeError && styles.priceInputError]}
                  placeholder="Min"
                  placeholderTextColor={APP_COLORS.textSecondary}
                  keyboardType="numeric"
                  value={minPrice}
                  onChangeText={text => {
                    setMinPrice(text)
                    setPriceRangeError(null)
                  }}
                />
                <Text style={styles.priceSeparator}>-</Text>
                <TextInput
                  style={[styles.priceInput, priceRangeError && styles.priceInputError]}
                  placeholder="Max"
                  placeholderTextColor={APP_COLORS.textSecondary}
                  keyboardType="numeric"
                  value={maxPrice}
                  onChangeText={text => {
                    setMaxPrice(text)
                    setPriceRangeError(null)
                  }}
                />
              </View>
              {priceRangeError && <Text style={styles.priceErrorText}>{priceRangeError}</Text>}
            </View>
          </View>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilters}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: APP_COLORS.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: APP_COLORS.text,
  },
  filterButton: {
    backgroundColor: APP_COLORS.surface,
    padding: 12,
    borderRadius: 12,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  filterChipText: {
    fontSize: 13,
    color: APP_COLORS.text,
  },
  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultsText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  listingCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  featuredText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#f59e0b',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginBottom: 12,
  },
  cardDetails: {
    marginBottom: 12,
  },
  priceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: APP_COLORS.primary,
  },
  availabilityText: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  farmerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  farmerName: {
    fontSize: 13,
    color: APP_COLORS.primary,
    fontWeight: '500',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  clearButton: {
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  clearText: {
    fontSize: 16,
    color: APP_COLORS.primary,
    fontWeight: '500',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  optionChipActive: {
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.primary,
  },
  optionChipText: {
    fontSize: 14,
    color: APP_COLORS.text,
  },
  optionChipTextActive: {
    color: '#fff',
  },
  priceInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  priceInput: {
    flex: 1,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: APP_COLORS.text,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  priceInputError: {
    borderColor: APP_COLORS.error,
  },
  priceErrorText: {
    color: APP_COLORS.error,
    fontSize: 12,
    marginTop: 8,
  },
  priceSeparator: {
    fontSize: 18,
    color: APP_COLORS.textSecondary,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  applyButton: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
