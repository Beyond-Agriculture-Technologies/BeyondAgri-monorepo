import React, { useState, useEffect } from 'react'
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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, Stack } from 'expo-router'
import { useInventoryStore } from '../../src/store/inventory-store'
import { useAppStore } from '../../src/store/app-store'
import { useInventoryPermissions } from '../../src/hooks/useInventoryPermissions'
import { APP_COLORS } from '../../src/utils/constants'
import { InventoryItemResponse, InventoryStatusEnum } from '../../src/types/inventory'

export default function InventoryListScreen() {
  const { isOnline } = useAppStore()
  const { permissions } = useInventoryPermissions()
  const { items, itemsLoading, fetchItems } = useInventoryStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (isOnline) {
      loadItems()
    }
  }, [isOnline])

  const loadItems = async () => {
    const filters: any = {}
    if (selectedCategory !== 'all') {
      filters.category = selectedCategory
    }
    if (selectedStatus !== 'all') {
      filters.status = selectedStatus
    }
    await fetchItems(filters)
  }

  const onRefresh = async () => {
    if (!isOnline) return
    setRefreshing(true)
    await loadItems()
    setRefreshing(false)
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.item_name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const renderItem = ({ item }: { item: InventoryItemResponse }) => {
    const statusColor = getStatusColor(item.status)

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => router.push(`/inventory/item-details?id=${item.id}`)}
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
            <Text style={styles.detailText}>
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
          <Ionicons name="add" size={20} color="white" />
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
          placeholderTextColor={APP_COLORS.textSecondary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={APP_COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {/* Category Filter */}
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory !== 'all' && styles.filterChipActive]}
            onPress={() => {
              // Cycle through categories
              const categories = ['all', 'harvest', 'meat', 'poultry', 'dairy', 'other']
              const currentIndex = categories.indexOf(selectedCategory)
              const nextIndex = (currentIndex + 1) % categories.length
              setSelectedCategory(categories[nextIndex])
            }}
          >
            <Ionicons
              name="filter"
              size={16}
              color={selectedCategory !== 'all' ? 'white' : APP_COLORS.textSecondary}
            />
            <Text
              style={[
                styles.filterChipText,
                selectedCategory !== 'all' && styles.filterChipTextActive,
              ]}
            >
              {selectedCategory === 'all' ? 'All Categories' : selectedCategory}
            </Text>
          </TouchableOpacity>

          {/* Status Filter */}
          <TouchableOpacity
            style={[styles.filterChip, selectedStatus !== 'all' && styles.filterChipActive]}
            onPress={() => {
              // Cycle through statuses
              const statuses = ['all', 'available', 'reserved', 'sold', 'expired']
              const currentIndex = statuses.indexOf(selectedStatus)
              const nextIndex = (currentIndex + 1) % statuses.length
              setSelectedStatus(statuses[nextIndex])
            }}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedStatus !== 'all' && styles.filterChipTextActive,
              ]}
            >
              {selectedStatus === 'all' ? 'All Status' : selectedStatus}
            </Text>
          </TouchableOpacity>

          {/* Clear Filters */}
          {(selectedCategory !== 'all' || selectedStatus !== 'all') && (
            <TouchableOpacity
              style={styles.clearFilterChip}
              onPress={() => {
                setSelectedCategory('all')
                setSelectedStatus('all')
              }}
            >
              <Text style={styles.clearFilterText}>Clear</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* Offline Indicator */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color="white" />
          <Text style={styles.offlineText}>Viewing cached data</Text>
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

// Helper functions
function getStatusColor(status: string): string {
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
    color: APP_COLORS.textSecondary,
  },
  headerButton: {
    marginRight: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: APP_COLORS.text,
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: APP_COLORS.textSecondary,
  },
  filterChipActive: {
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.primary,
  },
  filterChipText: {
    marginLeft: 6,
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  filterChipTextActive: {
    color: 'white',
  },
  clearFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: APP_COLORS.error,
  },
  clearFilterText: {
    fontSize: 14,
    color: 'white',
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
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80,
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    fontWeight: '600',
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
    fontWeight: '600',
    color: 'white',
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
    color: APP_COLORS.textSecondary,
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
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: APP_COLORS.error,
    fontWeight: '500',
  },
  expiryText: {
    fontSize: 12,
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
    fontWeight: '600',
    color: APP_COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
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
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.background,
  },
  resultsText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
})
