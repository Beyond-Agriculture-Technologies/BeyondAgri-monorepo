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
import { SupplierSummary } from '../../src/types/order'
import { formatCurrency, formatOrderDate } from '../../src/utils/order-helpers'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'
import { GlassCard } from '../../src/components/ui/GlassCard'

export default function SuppliersTab() {
  const {
    suppliers,
    suppliersLoading,
    suppliersError,
    fetchSuppliers,
  } = useOrderStore()

  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchSuppliers()
    setRefreshing(false)
  }, [])

  const renderSupplierCard = ({ item }: { item: SupplierSummary }) => (
    <TouchableOpacity
      onPress={() => router.push(`/(orders)/supplier-detail?accountId=${item.account_id}`)}
      activeOpacity={0.7}
    >
      <GlassCard style={styles.supplierCard}>
        <View style={styles.supplierHeader}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={24} color={APP_COLORS.primary} />
          </View>
          <View style={styles.supplierInfo}>
            <Text style={styles.supplierName}>
              {item.farm_name || item.name || 'Unknown Farmer'}
            </Text>
            {item.farm_name && item.name && (
              <Text style={styles.supplierSubName}>{item.name}</Text>
            )}
          </View>
          <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textTertiary} />
        </View>

        <View style={styles.supplierStats}>
          <View style={styles.supplierStat}>
            <Text style={styles.supplierStatValue}>{item.total_orders}</Text>
            <Text style={styles.supplierStatLabel}>Orders</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.supplierStat}>
            <Text style={styles.supplierStatValue}>{formatCurrency(item.total_spent)}</Text>
            <Text style={styles.supplierStatLabel}>Total Spent</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.supplierStat}>
            <Text style={styles.supplierStatValue}>{formatOrderDate(item.last_order_date)}</Text>
            <Text style={styles.supplierStatLabel}>Last Order</Text>
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {suppliersLoading && suppliers.length === 0 ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
        </View>
      ) : suppliersError ? (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle-outline" size={48} color={APP_COLORS.textSecondary} />
          <Text style={styles.emptyText}>{suppliersError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchSuppliers}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : suppliers.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="people-outline" size={48} color={APP_COLORS.textSecondary} />
          <Text style={styles.emptyText}>No suppliers yet</Text>
          <Text style={styles.emptySubtext}>
            Place orders from the marketplace to build your supplier network
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
          data={suppliers}
          renderItem={renderSupplierCard}
          keyExtractor={(item) => item.account_id.toString()}
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
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  supplierCard: {
    marginBottom: 12,
    padding: 16,
  },
  supplierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 16,
    color: APP_COLORS.text,
  },
  supplierSubName: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  supplierStats: {
    flexDirection: 'row',
    backgroundColor: APP_COLORS.glassBackground,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.glassBorder,
  },
  supplierStat: {
    flex: 1,
    alignItems: 'center',
  },
  supplierStatValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: APP_COLORS.text,
  },
  supplierStatLabel: {
    fontFamily: FONTS.regular,
    fontSize: 11,
    color: APP_COLORS.textTertiary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    backgroundColor: APP_COLORS.glassBorder,
    marginHorizontal: 8,
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
