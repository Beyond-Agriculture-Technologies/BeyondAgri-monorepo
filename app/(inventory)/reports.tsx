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
import { Stack } from 'expo-router'
import { useInventoryStore } from '../../src/store/inventory-store'
import { useAppStore } from '../../src/store/app-store'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'

type ReportType = 'valuation' | 'batch' | 'movement'

export default function ReportsScreen() {
  const { isOnline } = useAppStore()
  const { valuation, valuationLoading, fetchValuation } = useInventoryStore()

  const [activeReport, setActiveReport] = useState<ReportType>('valuation')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (isOnline) {
      loadReports()
    }
  }, [isOnline, activeReport])

  const loadReports = async () => {
    if (activeReport === 'valuation') {
      await fetchValuation()
    }
    // Batch and movement reports not yet implemented
  }

  const onRefresh = async () => {
    if (!isOnline) return
    setRefreshing(true)
    await loadReports()
    setRefreshing(false)
  }

  const renderValuationReport = () => {
    if (!valuation) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="pie-chart-outline" size={64} color={APP_COLORS.textSecondary} />
          <Text style={styles.emptyText}>No valuation data available</Text>
        </View>
      )
    }

    return (
      <View style={styles.reportContent}>
        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons name="cube" size={24} color={APP_COLORS.primary} />
            </View>
            <Text style={styles.summaryValue}>{valuation.total_items}</Text>
            <Text style={styles.summaryLabel}>Total Items</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons name="cash" size={24} color={APP_COLORS.success} />
            </View>
            <Text style={styles.summaryValue}>
              {valuation.currency} {Number(valuation.total_value).toFixed(0)}
            </Text>
            <Text style={styles.summaryLabel}>Total Value</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons name="layers" size={24} color={APP_COLORS.info} />
            </View>
            <Text style={styles.summaryValue}>{Number(valuation.total_quantity).toFixed(0)}</Text>
            <Text style={styles.summaryLabel}>Total Quantity</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons name="calculator" size={24} color={APP_COLORS.warning} />
            </View>
            <Text style={styles.summaryValue}>
              {valuation.currency}{' '}
              {valuation.total_items > 0
                ? (Number(valuation.total_value) / valuation.total_items).toFixed(2)
                : '0.00'}
            </Text>
            <Text style={styles.summaryLabel}>Avg Value</Text>
          </View>
        </View>

        {/* Category Breakdown */}
        {valuation.by_category && Object.keys(valuation.by_category).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Value by Category</Text>
            <View style={styles.categoryBreakdown}>
              {Object.entries(valuation.by_category).map(([category, value]) => {
                const numValue = Number(value)
                const percentage = (numValue / Number(valuation.total_value)) * 100
                return (
                  <View key={category} style={styles.categoryRow}>
                    <View style={styles.categoryInfo}>
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
                    <View style={styles.categoryValues}>
                      <Text style={styles.categoryValue}>
                        {valuation.currency} {numValue.toFixed(0)}
                      </Text>
                      <Text style={styles.categoryPercentage}>{percentage.toFixed(1)}%</Text>
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Status Breakdown */}
        {valuation.by_status && Object.keys(valuation.by_status).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Value by Status</Text>
            <View style={styles.statusBreakdown}>
              {Object.entries(valuation.by_status).map(([status, value]) => {
                const numValue = Number(value)
                return (
                  <View key={status} style={styles.statusRow}>
                    <View style={styles.statusInfo}>
                      <View
                        style={[styles.statusDot, { backgroundColor: getStatusColor(status) }]}
                      />
                      <Text style={styles.statusName}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </View>
                    <Text style={styles.statusValue}>
                      {valuation.currency} {numValue.toFixed(0)}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {/* Warehouse Breakdown - Not available in current API */}
      </View>
    )
  }

  const renderBatchReport = () => (
    <View style={styles.reportContent}>
      <View style={styles.emptyContainer}>
        <Ionicons name="barcode-outline" size={64} color={APP_COLORS.textSecondary} />
        <Text style={styles.emptyTitle}>Batch Report</Text>
        <Text style={styles.emptyText}>Detailed batch tracking report will be available here</Text>
      </View>
    </View>
  )

  const renderMovementReport = () => (
    <View style={styles.reportContent}>
      <View style={styles.emptyContainer}>
        <Ionicons name="swap-horizontal-outline" size={64} color={APP_COLORS.textSecondary} />
        <Text style={styles.emptyTitle}>Movement Report</Text>
        <Text style={styles.emptyText}>Inventory movement tracking will be available here</Text>
      </View>
    </View>
  )

  const renderActiveReport = () => {
    switch (activeReport) {
      case 'valuation':
        return renderValuationReport()
      case 'batch':
        return renderBatchReport()
      case 'movement':
        return renderMovementReport()
      default:
        return null
    }
  }

  if (valuationLoading && !valuation) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Reports',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Reports',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />

      {/* Report Type Selector */}
      <View style={styles.reportSelector}>
        <TouchableOpacity
          style={[styles.reportTab, activeReport === 'valuation' && styles.reportTabActive]}
          onPress={() => setActiveReport('valuation')}
        >
          <Ionicons
            name="pie-chart"
            size={20}
            color={activeReport === 'valuation' ? 'white' : APP_COLORS.textSecondary}
          />
          <Text
            style={[
              styles.reportTabText,
              activeReport === 'valuation' && styles.reportTabTextActive,
            ]}
          >
            Valuation
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.reportTab, activeReport === 'batch' && styles.reportTabActive]}
          onPress={() => setActiveReport('batch')}
        >
          <Ionicons
            name="barcode"
            size={20}
            color={activeReport === 'batch' ? 'white' : APP_COLORS.textSecondary}
          />
          <Text
            style={[styles.reportTabText, activeReport === 'batch' && styles.reportTabTextActive]}
          >
            Batch
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.reportTab, activeReport === 'movement' && styles.reportTabActive]}
          onPress={() => setActiveReport('movement')}
        >
          <Ionicons
            name="swap-horizontal"
            size={20}
            color={activeReport === 'movement' ? 'white' : APP_COLORS.textSecondary}
          />
          <Text
            style={[
              styles.reportTabText,
              activeReport === 'movement' && styles.reportTabTextActive,
            ]}
          >
            Movement
          </Text>
        </TouchableOpacity>
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color="white" />
          <Text style={styles.offlineText}>Viewing cached data</Text>
        </View>
      )}

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
        {renderActiveReport()}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// Helper functions
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    harvest: '#22c55e',
    meat: '#ef4444',
    poultry: '#f59e0b',
    dairy: '#3b82f6',
    other: '#6b7280',
  }
  return colors[category.toLowerCase()] || APP_COLORS.primary
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    available: APP_COLORS.success,
    reserved: APP_COLORS.warning,
    sold: APP_COLORS.info,
    expired: APP_COLORS.error,
    damaged: APP_COLORS.error,
  }
  return colors[status.toLowerCase()] || APP_COLORS.textSecondary
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
  reportSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  reportTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: APP_COLORS.surfaceElevated,
    gap: 6,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  reportTabActive: {
    backgroundColor: APP_COLORS.primary,
  },
  reportTabText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    color: APP_COLORS.textSecondary,
  },
  reportTabTextActive: {
    color: APP_COLORS.textOnPrimary,
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
    color: APP_COLORS.textOnPrimary,
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  scrollView: {
    flex: 1,
  },
  reportContent: {
    padding: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  summaryIcon: {
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: APP_COLORS.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginBottom: 12,
  },
  categoryBreakdown: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  categoryName: {
    fontSize: 15,
    color: APP_COLORS.text,
  },
  categoryValues: {
    alignItems: 'flex-end',
  },
  categoryValue: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
  },
  categoryPercentage: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  statusBreakdown: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusName: {
    fontSize: 15,
    color: APP_COLORS.text,
  },
  statusValue: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
  },
  warehouseBreakdown: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  warehouseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  warehouseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  warehouseName: {
    fontSize: 15,
    color: APP_COLORS.text,
  },
  warehouseValue: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: FONTS.semiBold,
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
