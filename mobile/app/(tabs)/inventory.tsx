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
import { FONTS } from '../../src/theme'
import { GlassCard } from '../../src/components/ui/GlassCard'
import { GradientCard } from '../../src/components/ui/GradientCard'
import { StatusBadge } from '../../src/components/ui/StatusBadge'

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
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading inventory...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={[]}>
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

        {/* Glowing Valuation Card */}
        <View style={styles.valuationSection}>
          <View style={styles.valuationGlow}>
            <GradientCard
              colors={['rgba(34, 197, 94, 0.15)', 'rgba(34, 197, 94, 0.03)']}
              style={styles.valuationGradient}
            >
              <View style={styles.valuationContent}>
                <View style={styles.valuationHeader}>
                  <View style={styles.valuationIconCircle}>
                    <Ionicons name="cash" size={24} color={APP_COLORS.primary} />
                  </View>
                  <Text style={styles.valuationLabel}>Total Valuation</Text>
                </View>
                <Text style={styles.valuationAmount}>
                  {valuation?.currency || 'ZAR'} {Number(valuation?.total_value || 0).toFixed(0)}
                </Text>
                <View style={styles.valuationMeta}>
                  <Text style={styles.valuationMetaText}>{valuation?.total_items || 0} items</Text>
                  <View style={styles.valuationDot} />
                  <Text style={styles.valuationMetaText}>
                    {Number(valuation?.total_quantity || 0)} units
                  </Text>
                </View>
              </View>
            </GradientCard>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <GlassCard style={styles.statCardOuter}>
            <View style={styles.statCardInner}>
              <View style={[styles.statIconBg, { backgroundColor: APP_COLORS.primaryDim }]}>
                <Ionicons name="cube" size={20} color={APP_COLORS.primary} />
              </View>
              <Text style={styles.statValue}>{valuation?.total_items || 0}</Text>
              <Text style={styles.statLabel}>Total Items</Text>
            </View>
          </GlassCard>

          <GlassCard style={[styles.statCardOuter, totalAlerts > 0 && styles.alertCardBorder]}>
            <View style={styles.statCardInner}>
              <View
                style={[
                  styles.statIconBg,
                  {
                    backgroundColor: totalAlerts > 0 ? APP_COLORS.warningDim : APP_COLORS.glass,
                  },
                ]}
              >
                <Ionicons
                  name="warning"
                  size={20}
                  color={totalAlerts > 0 ? APP_COLORS.warning : APP_COLORS.textSecondary}
                />
              </View>
              <Text style={[styles.statValue, totalAlerts > 0 && { color: APP_COLORS.warning }]}>
                {totalAlerts}
              </Text>
              <Text style={styles.statLabel}>Active Alerts</Text>
            </View>
          </GlassCard>
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
              <GlassCard style={styles.alertSectionOuter}>
                <View style={styles.alertSectionInner}>
                  <View style={styles.alertHeader}>
                    <Ionicons name="trending-down" size={20} color={APP_COLORS.warning} />
                    <Text style={styles.alertHeaderText}>Low Stock ({lowStockAlerts.length})</Text>
                    <StatusBadge label="Low Stock" variant="warning" />
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
                    <TouchableOpacity
                      style={styles.viewMoreButton}
                      onPress={() => router.push('/(inventory)/alerts?tab=low-stock')}
                    >
                      <Text style={styles.viewMoreText}>View {lowStockAlerts.length - 3} more</Text>
                      <Ionicons name="chevron-forward" size={16} color={APP_COLORS.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </GlassCard>
            )}

            {/* Expiring Items Alerts */}
            {expiringAlerts.length > 0 && (
              <GlassCard style={styles.alertSectionOuter}>
                <View style={styles.alertSectionInner}>
                  <View style={styles.alertHeader}>
                    <Ionicons name="time" size={20} color={APP_COLORS.error} />
                    <Text style={styles.alertHeaderText}>
                      Expiring Soon ({expiringAlerts.length})
                    </Text>
                    <StatusBadge label="Critical" variant="error" />
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
                    <TouchableOpacity
                      style={styles.viewMoreButton}
                      onPress={() => router.push('/(inventory)/alerts?tab=expiring')}
                    >
                      <Text style={styles.viewMoreText}>View {expiringAlerts.length - 3} more</Text>
                      <Ionicons name="chevron-forward" size={16} color={APP_COLORS.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </GlassCard>
            )}
          </View>
        )}

        {/* Category Breakdown */}
        {valuation && valuation.by_category && Object.keys(valuation.by_category).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Value by Category</Text>
            <GlassCard style={styles.categoryCardOuter}>
              <View style={styles.categoryCardInner}>
                {Object.entries(valuation.by_category).map(([category, value]) => (
                  <View key={category} style={styles.categoryRow}>
                    <View style={styles.categoryLeft}>
                      <View
                        style={[
                          styles.categoryDot,
                          { backgroundColor: getCategoryColor(category) },
                        ]}
                      />
                      <Text style={styles.categoryName}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Text>
                    </View>
                    <Text style={styles.categoryValue}>
                      {valuation.currency} {Number(value || 0).toFixed(0)}
                    </Text>
                  </View>
                ))}
              </View>
            </GlassCard>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          {permissions.canCreateInventory && (
            <TouchableOpacity onPress={() => router.push('/(inventory)/item-form')}>
              <GlassCard style={styles.actionOuter}>
                <View style={styles.actionRow}>
                  <View style={styles.actionLeft}>
                    <Ionicons name="add-circle" size={24} color={APP_COLORS.primary} />
                    <Text style={styles.actionText}>{actionLabels.addItem}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textTertiary} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          )}

          {permissions.canViewOwnInventory && (
            <TouchableOpacity onPress={() => router.push('/(inventory)/items')}>
              <GlassCard style={styles.actionOuter}>
                <View style={styles.actionRow}>
                  <View style={styles.actionLeft}>
                    <Ionicons name="list" size={24} color={APP_COLORS.primary} />
                    <Text style={styles.actionText}>{actionLabels.viewItems}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textTertiary} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          )}

          {permissions.canManageWarehouses && (
            <TouchableOpacity onPress={() => router.push('/(inventory)/warehouses')}>
              <GlassCard style={styles.actionOuter}>
                <View style={styles.actionRow}>
                  <View style={styles.actionLeft}>
                    <Ionicons name="business" size={24} color={APP_COLORS.primary} />
                    <Text style={styles.actionText}>Manage Warehouses</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textTertiary} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          )}

          {permissions.canViewReports && (
            <TouchableOpacity onPress={() => router.push('/(inventory)/reports')}>
              <GlassCard style={styles.actionOuter}>
                <View style={styles.actionRow}>
                  <View style={styles.actionLeft}>
                    <Ionicons name="bar-chart" size={24} color={APP_COLORS.primary} />
                    <Text style={styles.actionText}>View Reports</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textTertiary} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          )}

          {permissions.canViewReports && (
            <TouchableOpacity onPress={() => router.push('/(inventory)/valuation')}>
              <GlassCard style={styles.actionOuter}>
                <View style={styles.actionRow}>
                  <View style={styles.actionLeft}>
                    <Ionicons name="cash" size={24} color={APP_COLORS.primary} />
                    <Text style={styles.actionText}>Valuation Reports</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textTertiary} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={() => router.push('/(inventory)/transactions')}>
            <GlassCard style={styles.actionOuter}>
              <View style={styles.actionRow}>
                <View style={styles.actionLeft}>
                  <Ionicons name="swap-horizontal" size={24} color={APP_COLORS.primary} />
                  <Text style={styles.actionText}>Transaction History</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textTertiary} />
              </View>
            </GlassCard>
          </TouchableOpacity>

          {permissions.canViewBatches && (
            <TouchableOpacity onPress={() => router.push('/(inventory)/batches')}>
              <GlassCard style={styles.actionOuter}>
                <View style={styles.actionRow}>
                  <View style={styles.actionLeft}>
                    <Ionicons name="layers" size={24} color={APP_COLORS.primary} />
                    <Text style={styles.actionText}>Track Batches</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textTertiary} />
                </View>
              </GlassCard>
            </TouchableOpacity>
          )}

          {permissions.canManageInventoryTypes && (
            <TouchableOpacity onPress={() => router.push('/(inventory)/types')}>
              <GlassCard style={styles.actionOuter}>
                <View style={styles.actionRow}>
                  <View style={styles.actionLeft}>
                    <Ionicons name="pricetag" size={24} color={APP_COLORS.primary} />
                    <Text style={styles.actionText}>Manage Inventory Types</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textTertiary} />
                </View>
              </GlassCard>
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
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: APP_COLORS.textSecondary,
  },
  roleBadgeContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.primaryDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  roleBadgeText: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    color: APP_COLORS.primary,
  },
  dashboardTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: APP_COLORS.text,
    letterSpacing: -0.3,
  },
  valuationSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  valuationGlow: {
    shadowColor: APP_COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  valuationGradient: {
    borderWidth: 1,
    borderColor: APP_COLORS.primaryGlow,
  },
  valuationContent: {
    padding: 20,
  },
  valuationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  valuationIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: APP_COLORS.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valuationLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  valuationAmount: {
    fontFamily: FONTS.bold,
    fontSize: 32,
    color: APP_COLORS.primary,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  valuationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  valuationMetaText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: APP_COLORS.textSecondary,
  },
  valuationDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: APP_COLORS.textTertiary,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  statCardOuter: {
    flex: 1,
    padding: 0,
  },
  alertCardBorder: {
    borderWidth: 1,
    borderColor: APP_COLORS.warning,
  },
  statCardInner: {
    alignItems: 'center',
  },
  statIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontFamily: FONTS.bold,
    fontSize: 20,
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontFamily: FONTS.regular,
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
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: APP_COLORS.text,
  },
  seeAllText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: APP_COLORS.primary,
  },
  alertSectionOuter: {
    marginBottom: 12,
    padding: 0,
  },
  alertSectionInner: {},
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  alertHeaderText: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: APP_COLORS.text,
    flex: 1,
  },
  alertItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderLight,
  },
  alertLeft: {
    flex: 1,
  },
  alertItemName: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: APP_COLORS.text,
    marginBottom: 2,
  },
  alertItemDetail: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  alertRight: {
    alignItems: 'flex-end',
  },
  alertQuantity: {
    fontFamily: FONTS.medium,
    fontSize: 14,
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
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: APP_COLORS.primary,
  },
  categoryCardOuter: {
    padding: 0,
  },
  categoryCardInner: {},
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderLight,
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
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: APP_COLORS.text,
  },
  categoryValue: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: APP_COLORS.text,
  },
  actionOuter: {
    marginBottom: 8,
    padding: 0,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    fontFamily: FONTS.medium,
    fontSize: 16,
    color: APP_COLORS.text,
  },
  offlineNotice: {
    backgroundColor: APP_COLORS.warningDim,
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
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: APP_COLORS.warning,
  },
})
