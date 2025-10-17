import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useInventoryStore } from '../../src/store/inventory-store'
import { APP_COLORS } from '../../src/utils/constants'
import { InventoryItemResponse } from '../../src/types/inventory'

interface BatchGroup {
  batchNumber: string
  items: InventoryItemResponse[]
  totalQuantity: number
  oldestDate: string
  newestDate: string
  status: 'active' | 'expired' | 'expiring_soon'
}

export default function BatchesScreen() {
  const { batches, batchesLoading, fetchBatches } = useInventoryStore()
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null)

  useEffect(() => {
    loadBatches()
  }, [])

  const loadBatches = async () => {
    await fetchBatches()
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadBatches()
    setRefreshing(false)
  }

  const getBatchGroups = (): BatchGroup[] => {
    const groups: BatchGroup[] = []

    batches.forEach((items, batchNumber) => {
      if (searchQuery && !batchNumber.toLowerCase().includes(searchQuery.toLowerCase())) {
        return
      }

      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
      const dates = items
        .map(item => item.harvest_date || item.created_at)
        .filter(Boolean)
        .sort()

      // Determine batch status based on expiry dates
      let status: 'active' | 'expired' | 'expiring_soon' = 'active'
      const now = new Date()
      const expiringItems = items.filter(item => {
        if (!item.expiry_date) return false
        const expiryDate = new Date(item.expiry_date)
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        return daysUntilExpiry <= 7 && daysUntilExpiry >= 0
      })
      const expiredItems = items.filter(item => {
        if (!item.expiry_date) return false
        return new Date(item.expiry_date) < now
      })

      if (expiredItems.length > 0) {
        status = 'expired'
      } else if (expiringItems.length > 0) {
        status = 'expiring_soon'
      }

      groups.push({
        batchNumber,
        items,
        totalQuantity,
        oldestDate: dates[0] || '',
        newestDate: dates[dates.length - 1] || '',
        status,
      })
    })

    return groups.sort((a, b) => b.newestDate.localeCompare(a.newestDate))
  }

  const getStatusColor = (status: 'active' | 'expired' | 'expiring_soon') => {
    switch (status) {
      case 'expired':
        return APP_COLORS.error
      case 'expiring_soon':
        return APP_COLORS.warning
      default:
        return APP_COLORS.success
    }
  }

  const getStatusIcon = (status: 'active' | 'expired' | 'expiring_soon') => {
    switch (status) {
      case 'expired':
        return 'close-circle'
      case 'expiring_soon':
        return 'alert-circle'
      default:
        return 'checkmark-circle'
    }
  }

  const getStatusText = (status: 'active' | 'expired' | 'expiring_soon') => {
    switch (status) {
      case 'expired':
        return 'Expired'
      case 'expiring_soon':
        return 'Expiring Soon'
      default:
        return 'Active'
    }
  }

  const renderBatchCard = ({ item }: { item: BatchGroup }) => {
    const isExpanded = selectedBatch === item.batchNumber
    const statusColor = getStatusColor(item.status)
    const statusIcon = getStatusIcon(item.status)

    return (
      <View style={styles.batchCard}>
        <TouchableOpacity
          style={styles.batchHeader}
          onPress={() => setSelectedBatch(isExpanded ? null : item.batchNumber)}
          activeOpacity={0.7}
        >
          <View style={styles.batchHeaderLeft}>
            <View style={[styles.statusIndicator, { backgroundColor: `${statusColor}20` }]}>
              <Ionicons name={statusIcon} size={20} color={statusColor} />
            </View>
            <View style={styles.batchHeaderInfo}>
              <Text style={styles.batchNumber}>Batch {item.batchNumber}</Text>
              <Text style={styles.batchMeta}>
                {item.items.length} items • {item.totalQuantity} total units
              </Text>
            </View>
          </View>
          <View style={styles.batchHeaderRight}>
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusText(item.status)}
              </Text>
            </View>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={APP_COLORS.textSecondary}
              style={styles.expandIcon}
            />
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.batchDetails}>
            {/* Timeline Section */}
            <View style={styles.timelineSection}>
              <Text style={styles.sectionTitle}>Timeline</Text>
              <View style={styles.timelineRow}>
                <View style={styles.timelineItem}>
                  <Text style={styles.timelineLabel}>Oldest Date</Text>
                  <Text style={styles.timelineValue}>
                    {item.oldestDate ? new Date(item.oldestDate).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
                <View style={styles.timelineDivider} />
                <View style={styles.timelineItem}>
                  <Text style={styles.timelineLabel}>Newest Date</Text>
                  <Text style={styles.timelineValue}>
                    {item.newestDate ? new Date(item.newestDate).toLocaleDateString() : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Items List */}
            <View style={styles.itemsSection}>
              <Text style={styles.sectionTitle}>Items in Batch</Text>
              {item.items.map((inventoryItem, index) => (
                <TouchableOpacity
                  key={inventoryItem.id}
                  style={[styles.itemRow, index === item.items.length - 1 && styles.itemRowLast]}
                  onPress={() => router.push(`/(inventory)/item-details?id=${inventoryItem.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemRowLeft}>
                    <Text style={styles.itemName}>{inventoryItem.product_name}</Text>
                    <Text style={styles.itemMeta}>
                      Qty: {inventoryItem.quantity} {inventoryItem.unit}
                      {inventoryItem.warehouse_name && ` • ${inventoryItem.warehouse_name}`}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={APP_COLORS.textSecondary} />
                </TouchableOpacity>
              ))}
            </View>

            {/* Traceability Info */}
            {item.items.some(i => i.supplier_name || i.origin) && (
              <View style={styles.traceabilitySection}>
                <Text style={styles.sectionTitle}>Traceability</Text>
                {item.items[0].supplier_name && (
                  <View style={styles.traceabilityRow}>
                    <Ionicons name="business" size={16} color={APP_COLORS.textSecondary} />
                    <Text style={styles.traceabilityText}>
                      Supplier: {item.items[0].supplier_name}
                    </Text>
                  </View>
                )}
                {item.items[0].origin && (
                  <View style={styles.traceabilityRow}>
                    <Ionicons name="location" size={16} color={APP_COLORS.textSecondary} />
                    <Text style={styles.traceabilityText}>Origin: {item.items[0].origin}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>
    )
  }

  const batchGroups = getBatchGroups()

  if (batchesLoading && batches.size === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Batch Tracking',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading batches...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Batch Tracking',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={APP_COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by batch number..."
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

      <FlatList
        data={batchGroups}
        renderItem={renderBatchCard}
        keyExtractor={item => item.batchNumber}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={APP_COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No batches found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Try a different search term'
                : 'Batches will appear here when you add items with batch numbers'}
            </Text>
          </View>
        }
      />
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
    marginTop: 16,
    fontSize: 16,
    color: APP_COLORS.textSecondary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: APP_COLORS.text,
  },
  list: {
    padding: 16,
  },
  batchCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  batchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  batchHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  batchHeaderInfo: {
    flex: 1,
  },
  batchNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  batchMeta: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
  },
  batchHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  expandIcon: {
    marginLeft: 4,
  },
  batchDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: 16,
    paddingTop: 12,
  },
  timelineSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  timelineItem: {
    flex: 1,
  },
  timelineLabel: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginBottom: 4,
  },
  timelineValue: {
    fontSize: 14,
    fontWeight: '500',
    color: APP_COLORS.text,
  },
  timelineDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#e5e7eb',
  },
  itemsSection: {
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  itemRowLast: {
    borderBottomWidth: 0,
  },
  itemRowLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  traceabilitySection: {
    gap: 8,
  },
  traceabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  traceabilityText: {
    fontSize: 13,
    color: APP_COLORS.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
})
