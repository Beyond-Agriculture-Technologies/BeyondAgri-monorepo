import React, { useEffect, useState, useCallback } from 'react'
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
import { router, useLocalSearchParams } from 'expo-router'
import { useOrderStore } from '../../src/store/order-store'
import { OrderResponse, SupplierSummary } from '../../src/types/order'
import {
  getOrderStatusLabel,
  getOrderStatusColor,
  formatOrderDate,
  formatCurrency,
} from '../../src/utils/order-helpers'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'
import { GlassCard } from '../../src/components/ui/GlassCard'

export default function SupplierDetailScreen() {
  const params = useLocalSearchParams<{ accountId: string }>()
  const accountId = parseInt(params.accountId || '0', 10)

  const { suppliers, myOrders, fetchMyOrders, fetchSuppliers, myOrdersLoading } = useOrderStore()
  const [refreshing, setRefreshing] = useState(false)

  const supplier = suppliers.find(s => s.account_id === accountId)

  useEffect(() => {
    if (suppliers.length === 0) {
      fetchSuppliers()
    }
    // Fetch all orders (we'll filter client-side for this supplier)
    fetchMyOrders({ page_size: 100 })
  }, [accountId])

  const supplierOrders = myOrders.filter(o => o.seller_account_id === accountId)

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([fetchSuppliers(), fetchMyOrders({ page_size: 100 })])
    setRefreshing(false)
  }, [])

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
        <View style={styles.orderRow}>
          <Text style={styles.orderDetail}>{item.quantity} {item.unit}</Text>
          <Text style={styles.orderPrice}>{formatCurrency(item.total_price)}</Text>
        </View>
        <Text style={styles.orderDate}>{formatOrderDate(item.created_at)}</Text>
      </GlassCard>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={APP_COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Supplier Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={supplierOrders}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={APP_COLORS.primary} />
        }
        ListHeaderComponent={
          supplier ? (
            <View style={styles.supplierSection}>
              {/* Supplier Info */}
              <View style={styles.supplierCard}>
                <View style={styles.avatarCircle}>
                  <Ionicons name="person" size={32} color={APP_COLORS.primary} />
                </View>
                <Text style={styles.supplierName}>
                  {supplier.farm_name || supplier.name || 'Unknown'}
                </Text>
                {supplier.farm_name && supplier.name && (
                  <Text style={styles.supplierSubName}>{supplier.name}</Text>
                )}
                {supplier.email && (
                  <View style={styles.contactRow}>
                    <Ionicons name="mail-outline" size={14} color={APP_COLORS.textTertiary} />
                    <Text style={styles.contactText}>{supplier.email}</Text>
                  </View>
                )}
                {supplier.phone_number && (
                  <View style={styles.contactRow}>
                    <Ionicons name="call-outline" size={14} color={APP_COLORS.textTertiary} />
                    <Text style={styles.contactText}>{supplier.phone_number}</Text>
                  </View>
                )}
              </View>

              {/* Stats */}
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{supplier.total_orders}</Text>
                  <Text style={styles.statLabel}>Total Orders</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatCurrency(supplier.total_spent)}</Text>
                  <Text style={styles.statLabel}>Total Spent</Text>
                </View>
              </View>

              <Text style={styles.sectionTitle}>Order History</Text>
            </View>
          ) : myOrdersLoading ? (
            <View style={styles.loadingSection}>
              <ActivityIndicator size="small" color={APP_COLORS.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !myOrdersLoading ? (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>No orders with this supplier</Text>
            </View>
          ) : null
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  supplierSection: {
    marginBottom: 8,
  },
  supplierCard: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: APP_COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  supplierName: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  supplierSubName: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  contactText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: APP_COLORS.textTertiary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: APP_COLORS.glassBackground,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: APP_COLORS.glassBorder,
  },
  statValue: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: APP_COLORS.text,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: APP_COLORS.text,
    marginBottom: 12,
  },
  orderCard: {
    marginBottom: 10,
    padding: 14,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: APP_COLORS.text,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  orderDetail: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  orderPrice: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: APP_COLORS.primary,
  },
  orderDate: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: APP_COLORS.textTertiary,
  },
  loadingSection: {
    padding: 20,
    alignItems: 'center',
  },
  emptySection: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
})
