import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useInventoryStore } from '../../src/store/inventory-store'
import { useAppStore } from '../../src/store/app-store'
import { useInventoryPermissions } from '../../src/hooks/useInventoryPermissions'
import { APP_COLORS } from '../../src/utils/constants'

export default function InventoryDashboard() {
  const { isOnline } = useAppStore()
  const { permissions, roleDisplayName, dashboardTitle, actionLabels } = useInventoryPermissions()
  const {
    valuation,
    valuationLoading,
    lowStockAlerts,
    expiringAlerts,
    fetchValuation,
    fetchLowStockAlerts,
    fetchExpiringAlerts,
  } = useInventoryStore()

  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (isOnline) {
      loadDashboard()
    }
  }, [isOnline])

  const loadDashboard = async () => {
    await Promise.all([fetchValuation(), fetchLowStockAlerts(), fetchExpiringAlerts(7)])
  }

  const onRefresh = async () => {
    if (!isOnline) return
    setRefreshing(true)
    await loadDashboard()
    setRefreshing(false)
  }

  const totalAlerts = lowStockAlerts.length + expiringAlerts.length

  if (valuationLoading && !valuation) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={APP_COLORS.primary}
          />
        }
      >
        {/* Role Badge */}
        <View style={styles.roleBadgeContainer}>
          <View style={styles.roleBadge}>
            <Ionicons
              name={
                permissions.canManageWarehouses
                  ? permissions.canManageUsers
                    ? 'shield-checkmark'
                    : 'business'
                  : 'leaf'
              }
              size={16}
              color={APP_COLORS.primary}
            />
            <Text style={styles.roleBadgeText}>{roleDisplayName} View</Text>
          </View>
          <Text style={styles.dashboardTitle}>{dashboardTitle}</Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="cube" size={24} color={APP_COLORS.primary} />
            </View>
            <Text style={styles.statValue}>{valuation?.total_items || 0}</Text>
            <Text style={styles.statLabel}>Total Items</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="cash" size={24} color={APP_COLORS.success} />
            </View>
            <Text style={styles.statValue}>
              {valuation?.currency || 'ZAR'} {Number(valuation?.total_value || 0).toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Total Value</Text>
          </View>
        </View>

        <View style={styles.statsSection}>
          <View style={[styles.statCard, totalAlerts > 0 && styles.alertCard]}>
            <View style={styles.statIcon}>
              <Ionicons
                name="warning"
                size={24}
                color={totalAlerts > 0 ? APP_COLORS.warning : APP_COLORS.textSecondary}
              />
            </View>
            <Text style={[styles.statValue, totalAlerts > 0 && styles.alertValue]}>
              {totalAlerts}
            </Text>
            <Text style={styles.statLabel}>Active Alerts</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="layers" size={24} color={APP_COLORS.info} />
            </View>
            <Text style={styles.statValue}>{Number(valuation?.total_quantity || 0)}</Text>
            <Text style={styles.statLabel}>Total Quantity</Text>
          </View>
        </View>

        {/* Alerts Section */}
        {totalAlerts > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Alerts</Text>
              <TouchableOpacity onPress={() => router.push('/(inventory)/alerts')}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {/* Low Stock Alerts */}
            {lowStockAlerts.length > 0 && (
              <View style={styles.alertSection}>
                <View style={styles.alertHeader}>
                  <Ionicons name="trending-down" size={20} color={APP_COLORS.warning} />
                  <Text style={styles.alertHeaderText}>Low Stock ({lowStockAlerts.length})</Text>
                </View>
                {lowStockAlerts.slice(0, 3).map(alert => (
                  <View key={alert.item_id} style={styles.alertItem}>
                    <View style={styles.alertLeft}>
                      <Text style={styles.alertItemName}>{alert.item_name}</Text>
                      <Text style={styles.alertItemDetail}>
                        {alert.warehouse_name || 'No warehouse'}
                      </Text>
                    </View>
                    <View style={styles.alertRight}>
                      <Text style={styles.alertQuantity}>
                        {alert.current_quantity}/{alert.minimum_quantity} {alert.unit}
                      </Text>
                    </View>
                  </View>
                ))}
                {lowStockAlerts.length > 3 && (
                  <TouchableOpacity style={styles.viewMoreButton}>
                    <Text style={styles.viewMoreText}>View {lowStockAlerts.length - 3} more</Text>
                    <Ionicons name="chevron-forward" size={16} color={APP_COLORS.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Expiring Items Alerts */}
            {expiringAlerts.length > 0 && (
              <View style={styles.alertSection}>
                <View style={styles.alertHeader}>
                  <Ionicons name="time" size={20} color={APP_COLORS.error} />
                  <Text style={styles.alertHeaderText}>
                    Expiring Soon ({expiringAlerts.length})
                  </Text>
                </View>
                {expiringAlerts.slice(0, 3).map(alert => (
                  <View key={alert.item_id} style={styles.alertItem}>
                    <View style={styles.alertLeft}>
                      <Text style={styles.alertItemName}>{alert.item_name}</Text>
                      <Text style={styles.alertItemDetail}>
                        {alert.warehouse_name || 'No warehouse'}
                      </Text>
                    </View>
                    <View style={styles.alertRight}>
                      <Text
                        style={[
                          styles.alertQuantity,
                          alert.days_until_expiry <= 3 && styles.urgentText,
                        ]}
                      >
                        {alert.days_until_expiry === 0
                          ? 'Expired'
                          : alert.days_until_expiry === 1
                            ? '1 day'
                            : `${alert.days_until_expiry} days`}
                      </Text>
                    </View>
                  </View>
                ))}
                {expiringAlerts.length > 3 && (
                  <TouchableOpacity style={styles.viewMoreButton}>
                    <Text style={styles.viewMoreText}>View {expiringAlerts.length - 3} more</Text>
                    <Ionicons name="chevron-forward" size={16} color={APP_COLORS.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}

        {/* Category Breakdown */}
        {valuation && valuation.by_category && Object.keys(valuation.by_category).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Value by Category</Text>
            <View style={styles.categoryCard}>
              {Object.entries(valuation.by_category).map(([category, value]) => (
                <View key={category} style={styles.categoryRow}>
                  <View style={styles.categoryLeft}>
                    <View
                      style={[styles.categoryDot, { backgroundColor: getCategoryColor(category) }]}
                    />
                    <Text style={styles.categoryName}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                  </View>
                  <Text style={styles.categoryValue}>
                    {valuation.currency} {value.toFixed(0)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          {permissions.canCreateInventory && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(inventory)/item-form')}
            >
              <View style={styles.actionLeft}>
                <Ionicons name="add-circle" size={24} color={APP_COLORS.primary} />
                <Text style={styles.actionText}>{actionLabels.addItem}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          {permissions.canViewOwnInventory && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(inventory)/items')}
            >
              <View style={styles.actionLeft}>
                <Ionicons name="list" size={24} color={APP_COLORS.primary} />
                <Text style={styles.actionText}>{actionLabels.viewItems}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          {permissions.canManageWarehouses && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(inventory)/warehouses')}
            >
              <View style={styles.actionLeft}>
                <Ionicons name="business" size={24} color={APP_COLORS.primary} />
                <Text style={styles.actionText}>Manage Warehouses</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          {permissions.canViewReports && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(inventory)/reports')}
            >
              <View style={styles.actionLeft}>
                <Ionicons name="bar-chart" size={24} color={APP_COLORS.primary} />
                <Text style={styles.actionText}>View Reports</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          {permissions.canViewBatches && (
            <TouchableOpacity style={styles.actionButton}>
              <View style={styles.actionLeft}>
                <Ionicons name="layers" size={24} color={APP_COLORS.primary} />
                <Text style={styles.actionText}>Track Batches</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          {permissions.canManageInventoryTypes && (
            <TouchableOpacity style={styles.actionButton}>
              <View style={styles.actionLeft}>
                <Ionicons name="pricetag" size={24} color={APP_COLORS.primary} />
                <Text style={styles.actionText}>Manage Inventory Types</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Offline Notice */}
        {!isOnline && (
          <View style={styles.offlineNotice}>
            <Ionicons name="cloud-offline" size={20} color={APP_COLORS.warning} />
            <Text style={styles.offlineText}>You are offline. Some features may be limited.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    harvest: '#10b981',
    meat: '#ef4444',
    poultry: '#f59e0b',
    packaging: '#3b82f6',
    supplies: '#8b5cf6',
  }
  return colors[category.toLowerCase()] || APP_COLORS.textSecondary
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roleBadgeContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: APP_COLORS.primary,
  },
  dashboardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: APP_COLORS.text,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: APP_COLORS.textSecondary,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  alertCard: {
    borderWidth: 2,
    borderColor: APP_COLORS.warning,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  alertValue: {
    color: APP_COLORS.warning,
  },
  statLabel: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  seeAllText: {
    fontSize: 14,
    color: APP_COLORS.primary,
    fontWeight: '500',
  },
  alertSection: {
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
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  alertHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  alertLeft: {
    flex: 1,
  },
  alertItemName: {
    fontSize: 14,
    fontWeight: '500',
    color: APP_COLORS.text,
    marginBottom: 2,
  },
  alertItemDetail: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  alertRight: {
    alignItems: 'flex-end',
  },
  alertQuantity: {
    fontSize: 14,
    fontWeight: '500',
    color: APP_COLORS.warning,
  },
  urgentText: {
    color: APP_COLORS.error,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    marginTop: 4,
    gap: 4,
  },
  viewMoreText: {
    fontSize: 14,
    color: APP_COLORS.primary,
    fontWeight: '500',
  },
  categoryCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    fontSize: 14,
    color: APP_COLORS.text,
    fontWeight: '500',
  },
  categoryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  actionButton: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    color: APP_COLORS.text,
    fontWeight: '500',
  },
  offlineNotice: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  offlineText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
  },
})
