import React, { useState, useEffect, useMemo } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, Stack } from 'expo-router'
import { useInventoryStore } from '../../src/store/inventory-store'
import { useAppStore } from '../../src/store/app-store'
import { useInventoryPermissions } from '../../src/hooks/useInventoryPermissions'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'
import { InventoryItemResponse } from '../../src/types/inventory'
import { getInventoryStatusColor } from '../../src/utils/inventory-helpers'

type SortOption = 'name' | 'quantity' | 'date' | 'expiry' | 'value'
type SortDirection = 'asc' | 'desc'

export default function InventoryListScreen() {
  const { isOnline } = useAppStore()
  const { permissions } = useInventoryPermissions()
  const { items, itemsLoading, itemsError, fetchItems, warehouses, fetchWarehouses } =
    useInventoryStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all')
  const [batchNumber, setBatchNumber] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (isOnline) {
      loadItems()
      fetchWarehouses()
    }
  }, [isOnline])

  const loadItems = async () => {
    const filters: Record<string, string | number> = {}
    if (selectedCategory !== 'all') {
      filters.category = selectedCategory
    }
    if (selectedStatus !== 'all') {
      filters.status = selectedStatus
    }
    if (selectedWarehouse !== 'all') {
      filters.warehouse_id = parseInt(selectedWarehouse)
    }
    if (batchNumber.trim()) {
      filters.batch_number = batchNumber.trim()
    }
    await fetchItems(filters)
  }

  const onRefresh = async () => {
    if (!isOnline) return
    setRefreshing(true)
    await loadItems()
    setRefreshing(false)
  }

  const handleApplyFilters = () => {
    loadItems()
    setShowAdvancedFilters(false)
  }

  const handleClearAllFilters = () => {
    setSearchQuery('')
    setSelectedCategory('all')
    setSelectedStatus('all')
    setSelectedWarehouse('all')
    setBatchNumber('')
    setSortBy('name')
    setSortDirection('asc')
    loadItems()
  }

  // Memoized filtering and sorting for better performance
  const filteredItems = useMemo(() => {
    // Filter by search query
    let filtered = items.filter(item => {
      const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
      return matchesSearch
    })

    // Sort items (only if there are items to sort)
    if (filtered.length > 0) {
      filtered = [...filtered].sort((a, b) => {
        let comparison = 0

        switch (sortBy) {
          case 'name': {
            comparison = a.item_name.localeCompare(b.item_name)
            break
          }
          case 'quantity': {
            comparison = a.current_quantity - b.current_quantity
            break
          }
          case 'date': {
            const dateA = new Date(a.created_at || 0).getTime()
            const dateB = new Date(b.created_at || 0).getTime()
            comparison = dateA - dateB
            break
          }
          case 'expiry': {
            const expiryA = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity
            const expiryB = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity
            comparison = expiryA - expiryB
            break
          }
          case 'value': {
            const valueA = a.current_quantity * (Number(a.cost_per_unit) || 0)
            const valueB = b.current_quantity * (Number(b.cost_per_unit) || 0)
            comparison = valueA - valueB
            break
          }
        }

        return sortDirection === 'asc' ? comparison : -comparison
      })
    }

    return filtered
  }, [items, searchQuery, sortBy, sortDirection])

  const renderItem = ({ item }: { item: InventoryItemResponse }) => {
    const statusColor = getInventoryStatusColor(item.status)

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => router.push(`/(inventory)/item-details?id=${item.id}`)}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleRow}>
            <Ionicons name="cube" size={20} color={APP_COLORS.primary} />
            <Text style={styles.itemName} numberOfLines={1}>
              {item.item_name}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        <View style={styles.itemDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="cube-outline" size={16} color={APP_COLORS.textSecondary} />
            <Text style={styles.detailText}>
              {item.current_quantity} {item.unit}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color={APP_COLORS.textSecondary} />
            <Text style={styles.priceDetailText}>
              {item.currency} {item.cost_per_unit ? Number(item.cost_per_unit).toFixed(2) : '0.00'}
            </Text>
          </View>

          {item.batch_number && (
            <View style={styles.detailRow}>
              <Ionicons name="barcode-outline" size={16} color={APP_COLORS.textSecondary} />
              <Text style={styles.detailText}>{item.batch_number}</Text>
            </View>
          )}
        </View>

        {item.is_low_stock && (
          <View style={styles.warningRow}>
            <Ionicons name="warning" size={16} color={APP_COLORS.warning} />
            <Text style={styles.warningText}>Low Stock</Text>
          </View>
        )}

        {item.is_expired && (
          <View style={styles.warningRow}>
            <Ionicons name="alert-circle" size={16} color={APP_COLORS.error} />
            <Text style={styles.errorText}>Expired</Text>
          </View>
        )}

        {item.expiry_date && !item.is_expired && (
          <Text style={styles.expiryText}>
            Expires: {new Date(item.expiry_date).toLocaleDateString()}
          </Text>
        )}
      </TouchableOpacity>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="cube-outline" size={64} color={APP_COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>No Inventory Items</Text>
      <Text style={styles.emptyText}>
        {searchQuery
          ? 'No items match your search'
          : 'Add your first inventory item to get started'}
      </Text>
      {permissions.canCreateInventory && !searchQuery && (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/(inventory)/item-form')}
        >
          <Ionicons name="add" size={20} color={APP_COLORS.textOnPrimary} />
          <Text style={styles.addButtonText}>Add Item</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  if (itemsLoading && items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Inventory Items',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading items...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Inventory Items',
          headerShown: true,
          headerBackTitle: 'Back',
          headerRight: () =>
            permissions.canCreateInventory ? (
              <TouchableOpacity
                onPress={() => router.push('/(inventory)/item-form')}
                style={styles.headerButton}
              >
                <Ionicons name="add-circle" size={28} color={APP_COLORS.primary} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={APP_COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={APP_COLORS.placeholder}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={APP_COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Bar with Advanced Filters Button */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {/* Advanced Filters Button */}
          <TouchableOpacity
            style={[
              styles.filterChip,
              (selectedWarehouse !== 'all' || batchNumber !== '') && styles.filterChipActive,
            ]}
            onPress={() => setShowAdvancedFilters(true)}
          >
            <Ionicons
              name="options"
              size={16}
              color={
                selectedWarehouse !== 'all' || batchNumber !== ''
                  ? APP_COLORS.textOnPrimary
                  : APP_COLORS.textSecondary
              }
            />
            <Text
              style={[
                styles.filterChipText,
                (selectedWarehouse !== 'all' || batchNumber !== '') && styles.filterChipTextActive,
              ]}
            >
              Advanced
            </Text>
          </TouchableOpacity>

          {/* Sort Button */}
          <TouchableOpacity
            style={styles.filterChip}
            onPress={() => {
              if (sortDirection === 'asc') {
                setSortDirection('desc')
              } else {
                setSortDirection('asc')
              }
            }}
          >
            <Ionicons
              name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'}
              size={16}
              color={APP_COLORS.textSecondary}
            />
            <Text style={styles.filterChipText}>
              {sortBy === 'name' && 'Name'}
              {sortBy === 'quantity' && 'Quantity'}
              {sortBy === 'date' && 'Date'}
              {sortBy === 'expiry' && 'Expiry'}
              {sortBy === 'value' && 'Value'}
            </Text>
          </TouchableOpacity>

          {/* Category Filter */}
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory !== 'all' && styles.filterChipActive]}
            onPress={() => {
              const categories = ['all', 'harvest', 'meat', 'poultry', 'dairy', 'other']
              const currentIndex = categories.indexOf(selectedCategory)
              const nextIndex = (currentIndex + 1) % categories.length
              setSelectedCategory(categories[nextIndex])
              loadItems()
            }}
          >
            <Ionicons
              name="grid"
              size={16}
              color={
                selectedCategory !== 'all' ? APP_COLORS.textOnPrimary : APP_COLORS.textSecondary
              }
            />
            <Text
              style={[
                styles.filterChipText,
                selectedCategory !== 'all' && styles.filterChipTextActive,
              ]}
            >
              {selectedCategory === 'all' ? 'Category' : selectedCategory}
            </Text>
          </TouchableOpacity>

          {/* Status Filter */}
          <TouchableOpacity
            style={[styles.filterChip, selectedStatus !== 'all' && styles.filterChipActive]}
            onPress={() => {
              const statuses = ['all', 'available', 'reserved', 'sold', 'expired']
              const currentIndex = statuses.indexOf(selectedStatus)
              const nextIndex = (currentIndex + 1) % statuses.length
              setSelectedStatus(statuses[nextIndex])
              loadItems()
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedStatus !== 'all' && styles.filterChipTextActive,
              ]}
            >
              {selectedStatus === 'all' ? 'Status' : selectedStatus}
            </Text>
          </TouchableOpacity>

          {/* Clear All Filters */}
          {(selectedCategory !== 'all' ||
            selectedStatus !== 'all' ||
            selectedWarehouse !== 'all' ||
            batchNumber !== '' ||
            sortBy !== 'name') && (
            <TouchableOpacity style={styles.clearFilterChip} onPress={handleClearAllFilters}>
              <Ionicons name="close" size={16} color={APP_COLORS.textOnPrimary} />
              <Text style={styles.clearFilterText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Advanced Filters Modal */}
      <Modal
        visible={showAdvancedFilters}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAdvancedFilters(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Advanced Filters</Text>
              <TouchableOpacity onPress={() => setShowAdvancedFilters(false)}>
                <Ionicons name="close" size={24} color={APP_COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Sort Section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Sort By</Text>
                <View style={styles.sortOptions}>
                  {[
                    { value: 'name', label: 'Name', icon: 'text' },
                    { value: 'quantity', label: 'Quantity', icon: 'cube' },
                    { value: 'date', label: 'Date Added', icon: 'calendar' },
                    { value: 'expiry', label: 'Expiry Date', icon: 'time' },
                    { value: 'value', label: 'Total Value', icon: 'cash' },
                  ].map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.sortOption,
                        sortBy === option.value && styles.sortOptionActive,
                      ]}
                      onPress={() => setSortBy(option.value as SortOption)}
                    >
                      <Ionicons
                        name={option.icon as keyof typeof Ionicons.glyphMap}
                        size={20}
                        color={
                          sortBy === option.value ? APP_COLORS.primary : APP_COLORS.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.sortOptionText,
                          sortBy === option.value && styles.sortOptionTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Warehouse Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Warehouse</Text>
                <View style={styles.warehouseOptions}>
                  <TouchableOpacity
                    style={[
                      styles.warehouseOption,
                      selectedWarehouse === 'all' && styles.warehouseOptionActive,
                    ]}
                    onPress={() => setSelectedWarehouse('all')}
                  >
                    <Text
                      style={[
                        styles.warehouseOptionText,
                        selectedWarehouse === 'all' && styles.warehouseOptionTextActive,
                      ]}
                    >
                      All Warehouses
                    </Text>
                  </TouchableOpacity>
                  {warehouses.map(warehouse => (
                    <TouchableOpacity
                      key={warehouse.id}
                      style={[
                        styles.warehouseOption,
                        selectedWarehouse === warehouse.id.toString() &&
                          styles.warehouseOptionActive,
                      ]}
                      onPress={() => setSelectedWarehouse(warehouse.id.toString())}
                    >
                      <Text
                        style={[
                          styles.warehouseOptionText,
                          selectedWarehouse === warehouse.id.toString() &&
                            styles.warehouseOptionTextActive,
                        ]}
                      >
                        {warehouse.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Batch Number Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Batch Number</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="Enter batch number..."
                  value={batchNumber}
                  onChangeText={setBatchNumber}
                  placeholderTextColor={APP_COLORS.placeholder}
                />
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => {
                  setSelectedWarehouse('all')
                  setBatchNumber('')
                  setSortBy('name')
                  setSortDirection('asc')
                }}
              >
                <Text style={styles.modalButtonSecondaryText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleApplyFilters}>
                <Text style={styles.modalButtonPrimaryText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Offline Indicator */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color={APP_COLORS.textOnPrimary} />
          <Text style={styles.offlineText}>Viewing cached data</Text>
        </View>
      )}

      {/* Error Banner */}
      {itemsError && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color={APP_COLORS.text} />
          <Text style={styles.errorBannerText} numberOfLines={2}>
            {itemsError}
          </Text>
          <TouchableOpacity onPress={loadItems} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Items List */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={APP_COLORS.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
      />

      {/* Results Count */}
      {filteredItems.length > 0 && (
        <View style={styles.resultsFooter}>
          <Text style={styles.resultsText}>
            Showing {filteredItems.length} of {items.length} items
          </Text>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
  },
  headerButton: {
    marginRight: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.inputBackground,
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.inputBorder,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: APP_COLORS.text,
  },
  filterBar: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: APP_COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  filterChipActive: {
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.primary,
  },
  filterChipText: {
    marginLeft: 6,
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: APP_COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: APP_COLORS.textOnPrimary,
  },
  clearFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: APP_COLORS.error,
  },
  clearFilterText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: APP_COLORS.text,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.warning,
    paddingVertical: 8,
    gap: 8,
  },
  offlineText: {
    color: APP_COLORS.textOnPrimary,
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.errorDim,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  errorBannerText: {
    flex: 1,
    color: APP_COLORS.error,
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  retryButton: {
    backgroundColor: APP_COLORS.glass,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: APP_COLORS.text,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  itemCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  itemName: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.textOnPrimary,
    textTransform: 'capitalize',
  },
  itemDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
  },
  priceDetailText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: APP_COLORS.primary,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  warningText: {
    fontSize: 14,
    color: APP_COLORS.warning,
    fontFamily: FONTS.medium,
  },
  errorText: {
    fontSize: 14,
    color: APP_COLORS.error,
    fontFamily: FONTS.medium,
  },
  expiryText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
    marginTop: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 32,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  addButtonText: {
    color: APP_COLORS.textOnPrimary,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
  resultsFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: APP_COLORS.surfaceElevated,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  resultsText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: APP_COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: APP_COLORS.surfaceElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginBottom: 12,
  },
  sortOptions: {
    gap: 8,
  },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 12,
  },
  sortOptionActive: {
    borderColor: APP_COLORS.primary,
    backgroundColor: APP_COLORS.primaryDim,
  },
  sortOptionText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: APP_COLORS.text,
  },
  sortOptionTextActive: {
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.primary,
  },
  warehouseOptions: {
    gap: 8,
  },
  warehouseOption: {
    padding: 12,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  warehouseOptionActive: {
    borderColor: APP_COLORS.primary,
    backgroundColor: APP_COLORS.primaryDim,
  },
  warehouseOptionText: {
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: APP_COLORS.text,
  },
  warehouseOptionTextActive: {
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.primary,
  },
  filterInput: {
    backgroundColor: APP_COLORS.inputBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    fontFamily: FONTS.regular,
    color: APP_COLORS.text,
    borderWidth: 1,
    borderColor: APP_COLORS.inputBorder,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  modalButtonSecondary: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: APP_COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
  },
  modalButtonPrimary: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: APP_COLORS.primary,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.textOnPrimary,
  },
})
