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
  OrderStatusEnum.DECLINED,
]

export default function IncomingOrdersScreen() {
  const {
    incomingOrders,
    incomingLoading,
    incomingError,
    fetchIncomingOrders,
    fetchSellerStats,
    sellerStats,
  } = useOrderStore()

  const [activeFilter, setActiveFilter] = useState<OrderStatusEnum | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    await Promise.all([
      fetchIncomingOrders({ status: activeFilter || undefined }),
      fetchSellerStats(),
    ])
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }, [activeFilter])

  const onFilterChange = (filter: OrderStatusEnum | null) => {
    setActiveFilter(filter)
    fetchIncomingOrders({ status: filter || undefined })
  }

  const renderOrderCard = ({ item }: { item: OrderResponse }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(orders)/order-detail?orderId=${item.id}&role=seller`)}
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
          <Text style={styles.orderBuyer}>{item.buyer_name || 'Unknown Buyer'}</Text>
          <Text style={styles.orderDate}>{formatOrderDate(item.created_at)}</Text>
        </View>
        {item.status === OrderStatusEnum.PENDING && (
          <View style={styles.pendingActions}>
            <Text style={styles.pendingHint}>Tap to confirm or decline</Text>
            <Ionicons name="chevron-forward" size={16} color={APP_COLORS.primary} />
          </View>
        )}
      </GlassCard>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={APP_COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incoming Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Stats */}
      {sellerStats && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{sellerStats.total_orders}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{sellerStats.pending_orders}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{sellerStats.completed_orders}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: APP_COLORS.primary }]}>
              {formatCurrency(sellerStats.total_amount, 'R')}
            </Text>
            <Text style={styles.statLabel}>Earned</Text>
          </View>
        </View>
      )}

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((filter) => (
          <TouchableOpacity
            key={filter || 'all'}
            style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
            onPress={() => onFilterChange(filter)}
          >
            <Text style={[styles.filterChipText, activeFilter === filter && styles.filterChipTextActive]}>
              {filter ? getOrderStatusLabel(filter) : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Order List */}
      {incomingLoading && incomingOrders.length === 0 ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
        </View>
      ) : incomingError ? (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={APP_COLORS.textSecondary} />
          <Text style={styles.emptyText}>{incomingError}</Text>
        </View>
      ) : incomingOrders.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="receipt-outline" size={48} color={APP_COLORS.textSecondary} />
          <Text style={styles.emptyText}>No incoming orders</Text>
          <Text style={styles.emptySubtext}>
            Orders from wholesalers will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={incomingOrders}
          renderItem={renderOrderCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={APP_COLORS.primary} />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
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
    fontSize: 16,
    color: APP_COLORS.text,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 10,
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
    paddingHorizontal: 12,
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
    fontSize: 12,
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
  orderBuyer: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: APP_COLORS.textTertiary,
  },
  orderDate: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: APP_COLORS.textTertiary,
  },
  pendingActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.glassBorder,
    gap: 4,
  },
  pendingHint: {
    fontFamily: FONTS.medium,
    fontSize: 13,
    color: APP_COLORS.primary,
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
})
