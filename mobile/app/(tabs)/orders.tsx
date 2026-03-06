import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useOrderStore } from '../../src/store/order-store'
import { OrderStatusEnum, OrderResponse } from '../../src/types/order'
import { getOrderStatusLabel, getOrderStatusColor, formatOrderDate, formatCurrency } from '../../src/utils/order-helpers'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'
import { GlassCard } from '../../src/components/ui/GlassCard'

const STATUS_FILTERS: (OrderStatusEnum | null)[] = [
  null,
  OrderStatusEnum.PENDING,
  OrderStatusEnum.CONFIRMED,
  OrderStatusEnum.COMPLETED,
  OrderStatusEnum.CANCELLED,
]

export default function OrdersTab() {
  const {
    myOrders,
    myOrdersLoading,
    myOrdersError,
    myOrdersPagination,
    fetchMyOrders,
    fetchMyStats,
    myStats,
  } = useOrderStore()

  const [activeFilter, setActiveFilter] = useState<OrderStatusEnum | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await Promise.all([
      fetchMyOrders({ status: activeFilter || undefined }),
      fetchMyStats(),
    ])
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }, [activeFilter])

  const onFilterChange = (filter: OrderStatusEnum | null) => {
    setActiveFilter(filter)
    fetchMyOrders({ status: filter || undefined })
  }

  const renderOrderCard = ({ item }: { item: OrderResponse }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(orders)/order-detail?orderId=${item.id}&role=buyer`)}
      activeOpacity={0.7}
    >
      <GlassCard style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderTitle} numberOfLines={1}>{item.listing_title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getOrderStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getOrderStatusColor(item.status) }]}>
              {getOrderStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        <View style={styles.orderDetails}>
          <Text style={styles.orderDetail}>
            {item.quantity} {item.unit} @ {formatCurrency(item.price_per_unit)}
          </Text>
          <Text style={styles.orderTotal}>{formatCurrency(item.total_price)}</Text>
        </View>
        <View style={styles.orderFooter}>
          <Text style={styles.orderSeller}>
            {item.seller_farm_name || item.seller_name || 'Unknown Seller'}
          </Text>
          <Text style={styles.orderDate}>{formatOrderDate(item.created_at)}</Text>
        </View>
      </GlassCard>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Stats Summary */}
      {myStats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{myStats.total_orders}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{myStats.pending_orders}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#3B82F6' }]}>{myStats.confirmed_orders}</Text>
            <Text style={styles.statLabel}>Confirmed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{myStats.completed_orders}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      )}

      {/* Status Filter Chips */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter || 'all'}
            style={[
              styles.filterChip,
              activeFilter === filter && styles.filterChipActive,
            ]}
            onPress={() => onFilterChange(filter)}
          >
            <Text
              style={[
                styles.filterChipText,
                activeFilter === filter && styles.filterChipTextActive,
              ]}
            >
              {filter ? getOrderStatusLabel(filter) : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Order List */}
      {myOrdersLoading && myOrders.length === 0 ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
        </View>
      ) : myOrdersError ? (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={APP_COLORS.textSecondary} />
          <Text style={styles.emptyText}>{myOrdersError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : myOrders.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="receipt-outline" size={48} color={APP_COLORS.textSecondary} />
          <Text style={styles.emptyText}>No orders yet</Text>
          <Text style={styles.emptySubtext}>
            Browse the marketplace to place your first order
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/(tabs)/marketplace')}
          >
            <Text style={styles.browseButtonText}>Browse Marketplace</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={myOrders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={APP_COLORS.primary}
            />
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: APP_COLORS.glassBackground,
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.glassBorder,
  },
  statValue: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: APP_COLORS.text,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: APP_COLORS.glassBackground,
    borderWidth: 1,
    borderColor: APP_COLORS.glassBorder,
  },
  filterChipActive: {
    backgroundColor: APP_COLORS.primary + '20',
    borderColor: APP_COLORS.primary,
  },
  filterChipText: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: APP_COLORS.textSecondary,
  },
  filterChipTextActive: {
    color: APP_COLORS.primary,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  orderCard: {
    marginBottom: 12,
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: APP_COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
  },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderDetail: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  orderTotal: {
    fontFamily: FONTS.bold,
    fontSize: 16,
    color: APP_COLORS.primary,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderSeller: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: APP_COLORS.textTertiary,
  },
  orderDate: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: APP_COLORS.textTertiary,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: APP_COLORS.textSecondary,
    marginTop: 12,
  },
  emptySubtext: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: APP_COLORS.textTertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  browseButton: {
    marginTop: 16,
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.primary,
  },
  retryText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: APP_COLORS.primary,
  },
})
