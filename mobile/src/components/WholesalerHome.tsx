import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../store/auth-store'
import { useAppStore } from '../store/app-store'
import { useOrderStore } from '../store/order-store'
import { OrderResponse } from '../types/order'
import {
  getOrderStatusLabel,
  getOrderStatusColor,
  formatOrderDate,
  formatCurrency,
} from '../utils/order-helpers'
import { APP_COLORS } from '../utils/constants'
import { FONTS } from '../theme'
import { GlassCard } from './ui/GlassCard'
import { GradientCard } from './ui/GradientCard'

export default function WholesalerHome() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const user = useAuthStore(state => state.user)
  const { isOnline } = useAppStore()
  const {
    myOrders,
    myStats,
    suppliers,
    myOrdersLoading,
    fetchMyOrders,
    fetchMyStats,
    fetchSuppliers,
  } = useOrderStore()

  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (isOnline) {
      loadData()
    }
  }, [isOnline])

  const loadData = async () => {
    await Promise.all([
      fetchMyOrders({ page_size: 5 }),
      fetchMyStats(),
      fetchSuppliers(),
    ])
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }, [])

  const recentOrders = myOrders.slice(0, 5)
  const topSuppliers = suppliers.slice(0, 3)

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={APP_COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Good day,</Text>
            <Text style={styles.userName}>{user?.name || 'Welcome'}</Text>
            <View style={styles.roleBadge}>
              <Ionicons name="storefront" size={14} color={APP_COLORS.primary} />
              <Text style={styles.roleBadgeText}>Wholesaler</Text>
            </View>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, isOnline ? styles.online : styles.offline]}>
              <Ionicons
                name={isOnline ? 'wifi' : 'cloud-offline'}
                size={14}
                color={isOnline ? APP_COLORS.success : APP_COLORS.warning}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isOnline ? APP_COLORS.success : APP_COLORS.warning },
                ]}
              >
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        {myStats && (
          <View style={styles.statsSection}>
            <GlassCard style={styles.statCardOuter}>
              <View style={styles.statCardInner}>
                <View style={[styles.statIconCircle, { backgroundColor: APP_COLORS.primaryDim }]}>
                  <Ionicons name="receipt" size={20} color={APP_COLORS.primary} />
                </View>
                <Text style={styles.statNumber}>{myStats.total_orders}</Text>
                <Text style={styles.statLabel}>Total Orders</Text>
              </View>
            </GlassCard>

            <GlassCard style={styles.statCardOuter}>
              <View style={styles.statCardInner}>
                <View style={[styles.statIconCircle, { backgroundColor: APP_COLORS.warningDim }]}>
                  <Ionicons name="time" size={20} color={APP_COLORS.warning} />
                </View>
                <Text style={styles.statNumber}>{myStats.pending_orders}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
            </GlassCard>

            <GlassCard style={styles.statCardOuter}>
              <View style={styles.statCardInner}>
                <View style={[styles.statIconCircle, { backgroundColor: APP_COLORS.successDim }]}>
                  <Ionicons name="cash" size={20} color={APP_COLORS.success} />
                </View>
                <Text style={[styles.statNumber, { fontSize: 18 }]}>
                  {formatCurrency(myStats.total_amount)}
                </Text>
                <Text style={styles.statLabel}>Total Spent</Text>
              </View>
            </GlassCard>
          </View>
        )}

        {/* Recent Orders */}
        {recentOrders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Orders</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {recentOrders.map((order: OrderResponse) => (
              <TouchableOpacity
                key={order.id}
                onPress={() => router.push(`/(orders)/order-detail?orderId=${order.id}&role=buyer`)}
              >
                <GlassCard style={styles.orderCardOuter}>
                  <View style={styles.orderRow}>
                    <View style={styles.orderLeft}>
                      <Text style={styles.orderTitle} numberOfLines={1}>
                        {order.listing_title}
                      </Text>
                      <Text style={styles.orderMeta}>
                        {order.quantity} {order.unit} - {formatOrderDate(order.created_at)}
                      </Text>
                    </View>
                    <View style={styles.orderRight}>
                      <Text style={styles.orderPrice}>{formatCurrency(order.total_price)}</Text>
                      <View
                        style={[
                          styles.miniStatusBadge,
                          { backgroundColor: getOrderStatusColor(order.status) + '20' },
                        ]}
                      >
                        <Text
                          style={[styles.miniStatusText, { color: getOrderStatusColor(order.status) }]}
                        >
                          {getOrderStatusLabel(order.status)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Top Suppliers */}
        {topSuppliers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Suppliers</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/suppliers')}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {topSuppliers.map(supplier => (
              <TouchableOpacity
                key={supplier.account_id}
                onPress={() => router.push(`/(orders)/supplier-detail?accountId=${supplier.account_id}`)}
              >
                <GlassCard style={styles.supplierCardOuter}>
                  <View style={styles.supplierRow}>
                    <View style={styles.supplierAvatar}>
                      <Ionicons name="person" size={20} color={APP_COLORS.primary} />
                    </View>
                    <View style={styles.supplierInfo}>
                      <Text style={styles.supplierName} numberOfLines={1}>
                        {supplier.farm_name || supplier.name || 'Unknown'}
                      </Text>
                      <Text style={styles.supplierMeta}>
                        {supplier.total_orders} orders
                      </Text>
                    </View>
                    <Text style={styles.supplierSpent}>
                      {formatCurrency(supplier.total_spent)}
                    </Text>
                  </View>
                </GlassCard>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCardWrapper}
              onPress={() => router.push('/(tabs)/marketplace')}
            >
              <GlassCard style={styles.actionCardOuter}>
                <View style={styles.actionCardInner}>
                  <View style={[styles.actionIconCircle, { backgroundColor: APP_COLORS.primaryDim }]}>
                    <Ionicons name="search" size={24} color={APP_COLORS.primary} />
                  </View>
                  <Text style={styles.actionLabel}>Browse Market</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCardWrapper}
              onPress={() => router.push('/(tabs)/orders')}
            >
              <GlassCard style={styles.actionCardOuter}>
                <View style={styles.actionCardInner}>
                  <View style={[styles.actionIconCircle, { backgroundColor: APP_COLORS.infoDim }]}>
                    <Ionicons name="receipt" size={24} color={APP_COLORS.info} />
                  </View>
                  <Text style={styles.actionLabel}>My Orders</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCardWrapper}
              onPress={() => router.push('/(tabs)/suppliers')}
            >
              <GlassCard style={styles.actionCardOuter}>
                <View style={styles.actionCardInner}>
                  <View style={[styles.actionIconCircle, { backgroundColor: APP_COLORS.successDim }]}>
                    <Ionicons name="people" size={24} color={APP_COLORS.success} />
                  </View>
                  <Text style={styles.actionLabel}>Suppliers</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCardWrapper}
              onPress={() => router.push('/(tabs)/inventory')}
            >
              <GlassCard style={styles.actionCardOuter}>
                <View style={styles.actionCardInner}>
                  <View style={[styles.actionIconCircle, { backgroundColor: APP_COLORS.warningDim }]}>
                    <Ionicons name="cube" size={24} color={APP_COLORS.warning} />
                  </View>
                  <Text style={styles.actionLabel}>Inventory</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          </View>
        </View>

        {/* Empty State */}
        {!myOrdersLoading && myOrders.length === 0 && (
          <View style={styles.emptySection}>
            <GradientCard
              colors={['rgba(34, 197, 94, 0.12)', 'rgba(34, 197, 94, 0.02)']}
              style={styles.heroCard}
            >
              <View style={styles.heroContent}>
                <View style={styles.heroIconCircle}>
                  <Ionicons name="storefront" size={28} color={APP_COLORS.primary} />
                </View>
                <Text style={styles.heroTitle}>Start Sourcing</Text>
                <Text style={styles.heroSubtitle}>
                  Browse the marketplace to find fresh produce from local farmers and place your first order.
                </Text>
                <TouchableOpacity
                  style={styles.heroCta}
                  onPress={() => router.push('/(marketplace)/browse')}
                >
                  <Text style={styles.heroCtaText}>Browse Marketplace</Text>
                  <Ionicons name="arrow-forward" size={16} color={APP_COLORS.textOnPrimary} />
                </TouchableOpacity>
              </View>
            </GradientCard>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: APP_COLORS.textSecondary,
  },
  userName: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: APP_COLORS.text,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.primaryDim,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
    marginTop: 6,
  },
  roleBadgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: APP_COLORS.primary,
  },
  statusContainer: {
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  online: {
    backgroundColor: APP_COLORS.successDim,
  },
  offline: {
    backgroundColor: APP_COLORS.warningDim,
  },
  statusText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    marginLeft: 4,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 4,
  },
  statCardOuter: {
    flex: 1,
    padding: 0,
  },
  statCardInner: {
    alignItems: 'center',
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontFamily: FONTS.bold,
    fontSize: 24,
    color: APP_COLORS.text,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    padding: 20,
    paddingBottom: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: APP_COLORS.text,
  },
  seeAllText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: APP_COLORS.primary,
  },
  orderCardOuter: {
    marginBottom: 8,
    padding: 0,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderLeft: {
    flex: 1,
    marginRight: 12,
  },
  orderTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: APP_COLORS.text,
    marginBottom: 2,
  },
  orderMeta: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  orderPrice: {
    fontFamily: FONTS.bold,
    fontSize: 15,
    color: APP_COLORS.primary,
    marginBottom: 4,
  },
  miniStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  miniStatusText: {
    fontFamily: FONTS.medium,
    fontSize: 11,
  },
  supplierCardOuter: {
    marginBottom: 8,
    padding: 0,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supplierAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: APP_COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontFamily: FONTS.semiBold,
    fontSize: 15,
    color: APP_COLORS.text,
  },
  supplierMeta: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  supplierSpent: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: APP_COLORS.primary,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCardWrapper: {
    width: '47%',
  },
  actionCardOuter: {
    padding: 0,
  },
  actionCardInner: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: APP_COLORS.text,
    textAlign: 'center',
  },
  emptySection: {
    paddingHorizontal: 20,
    marginTop: 8,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.glassBorder,
  },
  heroContent: {
    padding: 20,
    alignItems: 'flex-start',
  },
  heroIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: APP_COLORS.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: APP_COLORS.text,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  heroCtaText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: APP_COLORS.textOnPrimary,
  },
})
