import React, { useState, useEffect } from 'react'
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
import { router, Stack } from 'expo-router'
import { useInventoryStore } from '../../src/store/inventory-store'
import { useAppStore } from '../../src/store/app-store'
import { APP_COLORS } from '../../src/utils/constants'
import { LowStockAlert, ExpiringItemAlert } from '../../src/types/inventory'

type TabType = 'low-stock' | 'expiring' | 'expired'

export default function AlertsScreen() {
  const { isOnline } = useAppStore()
  const { lowStockAlerts, expiringAlerts, fetchLowStockAlerts, fetchExpiringAlerts } =
    useInventoryStore()

  const [activeTab, setActiveTab] = useState<TabType>('low-stock')
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAlerts()
  }, [])

  const loadAlerts = async () => {
    setLoading(true)
    await Promise.all([fetchLowStockAlerts(), fetchExpiringAlerts(30)])
    setLoading(false)
  }

  const onRefresh = async () => {
    if (!isOnline) return
    setRefreshing(true)
    await loadAlerts()
    setRefreshing(false)
  }

  const getFilteredExpiringAlerts = () => {
    if (activeTab === 'expiring') {
      return expiringAlerts.filter(alert => alert.days_until_expiry > 0)
    } else if (activeTab === 'expired') {
      return expiringAlerts.filter(alert => alert.days_until_expiry <= 0)
    }
    return []
  }

  const renderLowStockAlert = ({ item }: { item: LowStockAlert }) => (
    <TouchableOpacity
      style={styles.alertCard}
      onPress={() => router.push(`/inventory/item-details?id=${item.item_id}`)}
    >
      <View style={styles.alertHeader}>
        <View style={styles.alertIconContainer}>
          <Ionicons name="warning" size={24} color={APP_COLORS.warning} />
        </View>
        <View style={styles.alertContent}>
          <Text style={styles.alertTitle} numberOfLines={1}>
            {item.item_name}
          </Text>
          {item.warehouse_name && <Text style={styles.alertSubtitle}>{item.warehouse_name}</Text>}
        </View>
      </View>

      <View style={styles.alertDetails}>
        <View style={styles.alertDetailRow}>
          <Text style={styles.alertDetailLabel}>Current Stock:</Text>
          <Text style={[styles.alertDetailValue, styles.warningText]}>
            {item.current_quantity} {item.unit}
          </Text>
        </View>
        <View style={styles.alertDetailRow}>
          <Text style={styles.alertDetailLabel}>Min Level:</Text>
          <Text style={styles.alertDetailValue}>
            {item.minimum_quantity} {item.unit}
          </Text>
        </View>
        {item.bin_code && (
          <View style={styles.alertDetailRow}>
            <Text style={styles.alertDetailLabel}>Bin:</Text>
            <Text style={styles.alertDetailValue}>{item.bin_code}</Text>
          </View>
        )}
      </View>

      <View style={styles.alertFooter}>
        <View style={styles.urgencyBadge}>
          <Text style={styles.urgencyText}>Low Stock</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textSecondary} />
      </View>
    </TouchableOpacity>
  )

  const renderExpiringAlert = ({ item }: { item: ExpiringItemAlert }) => {
    const isExpired = item.days_until_expiry <= 0
    const isUrgent = item.days_until_expiry <= 3 && item.days_until_expiry > 0

    return (
      <TouchableOpacity
        style={styles.alertCard}
        onPress={() => router.push(`/inventory/item-details?id=${item.item_id}`)}
      >
        <View style={styles.alertHeader}>
          <View style={styles.alertIconContainer}>
            <Ionicons
              name={isExpired ? 'alert-circle' : 'time'}
              size={24}
              color={isExpired ? APP_COLORS.error : isUrgent ? APP_COLORS.warning : APP_COLORS.info}
            />
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle} numberOfLines={1}>
              {item.item_name}
            </Text>
            {item.warehouse_name && <Text style={styles.alertSubtitle}>{item.warehouse_name}</Text>}
          </View>
        </View>

        <View style={styles.alertDetails}>
          <View style={styles.alertDetailRow}>
            <Text style={styles.alertDetailLabel}>Expiry Date:</Text>
            <Text style={[styles.alertDetailValue, isExpired && styles.errorText]}>
              {new Date(item.expiry_date).toLocaleDateString()}
            </Text>
          </View>
          <View style={styles.alertDetailRow}>
            <Text style={styles.alertDetailLabel}>Quantity:</Text>
            <Text style={styles.alertDetailValue}>
              {item.current_quantity} {item.unit}
            </Text>
          </View>
          {item.batch_number && (
            <View style={styles.alertDetailRow}>
              <Text style={styles.alertDetailLabel}>Batch:</Text>
              <Text style={styles.alertDetailValue}>{item.batch_number}</Text>
            </View>
          )}
        </View>

        <View style={styles.alertFooter}>
          <View
            style={[
              styles.urgencyBadge,
              {
                backgroundColor: isExpired
                  ? APP_COLORS.error
                  : isUrgent
                    ? APP_COLORS.warning
                    : APP_COLORS.info,
              },
            ]}
          >
            <Text style={styles.urgencyText}>
              {isExpired
                ? 'Expired'
                : item.days_until_expiry === 1
                  ? '1 day left'
                  : `${item.days_until_expiry} days left`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textSecondary} />
        </View>
      </TouchableOpacity>
    )
  }

  const renderEmptyState = () => {
    const emptyMessages = {
      'low-stock': {
        icon: 'checkmark-circle',
        title: 'All Good!',
        message: 'No low stock alerts at the moment',
      },
      expiring: {
        icon: 'checkmark-circle',
        title: 'All Good!',
        message: 'No items expiring soon',
      },
      expired: {
        icon: 'checkmark-circle',
        title: 'All Good!',
        message: 'No expired items',
      },
    }

    const content = emptyMessages[activeTab]

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name={content.icon as any} size={64} color={APP_COLORS.success} />
        <Text style={styles.emptyTitle}>{content.title}</Text>
        <Text style={styles.emptyText}>{content.message}</Text>
      </View>
    )
  }

  const getCurrentData = () => {
    if (activeTab === 'low-stock') {
      return lowStockAlerts
    }
    return getFilteredExpiringAlerts()
  }

  const currentData = getCurrentData()
  const lowStockCount = lowStockAlerts.length
  const expiringCount = expiringAlerts.filter(a => a.days_until_expiry > 0).length
  const expiredCount = expiringAlerts.filter(a => a.days_until_expiry <= 0).length

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Alerts',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading alerts...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Alerts',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Ionicons name="warning" size={20} color={APP_COLORS.warning} />
          <Text style={styles.summaryCount}>{lowStockCount}</Text>
          <Text style={styles.summaryLabel}>Low Stock</Text>
        </View>

        <View style={styles.summaryCard}>
          <Ionicons name="time" size={20} color={APP_COLORS.info} />
          <Text style={styles.summaryCount}>{expiringCount}</Text>
          <Text style={styles.summaryLabel}>Expiring Soon</Text>
        </View>

        <View style={styles.summaryCard}>
          <Ionicons name="alert-circle" size={20} color={APP_COLORS.error} />
          <Text style={styles.summaryCount}>{expiredCount}</Text>
          <Text style={styles.summaryLabel}>Expired</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'low-stock' && styles.tabActive]}
          onPress={() => setActiveTab('low-stock')}
        >
          <Text style={[styles.tabText, activeTab === 'low-stock' && styles.tabTextActive]}>
            Low Stock ({lowStockCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'expiring' && styles.tabActive]}
          onPress={() => setActiveTab('expiring')}
        >
          <Text style={[styles.tabText, activeTab === 'expiring' && styles.tabTextActive]}>
            Expiring ({expiringCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'expired' && styles.tabActive]}
          onPress={() => setActiveTab('expired')}
        >
          <Text style={[styles.tabText, activeTab === 'expired' && styles.tabTextActive]}>
            Expired ({expiredCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Offline Indicator */}
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color="white" />
          <Text style={styles.offlineText}>Viewing cached data</Text>
        </View>
      )}

      {/* Alerts List */}
      <FlatList<LowStockAlert | ExpiringItemAlert>
        data={currentData}
        renderItem={({ item }) => {
          if (activeTab === 'low-stock') {
            return renderLowStockAlert({ item: item as LowStockAlert })
          } else {
            return renderExpiringAlert({ item: item as ExpiringItemAlert })
          }
        }}
        keyExtractor={(item, index) => `${activeTab}-${item.item_id}-${index}`}
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
    color: APP_COLORS.textSecondary,
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryCount: {
    fontSize: 24,
    fontWeight: '700',
    color: APP_COLORS.text,
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'white',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: APP_COLORS.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: APP_COLORS.textSecondary,
  },
  tabTextActive: {
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
    paddingBottom: 40,
  },
  alertCard: {
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
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: APP_COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 2,
  },
  alertSubtitle: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  alertDetails: {
    marginBottom: 12,
  },
  alertDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  alertDetailLabel: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  alertDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: APP_COLORS.text,
  },
  warningText: {
    color: APP_COLORS.warning,
  },
  errorText: {
    color: APP_COLORS.error,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.background,
  },
  urgencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: APP_COLORS.warning,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
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
    paddingHorizontal: 32,
  },
})
