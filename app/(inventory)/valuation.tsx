import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useInventoryStore } from '../../src/store/inventory-store'
import { APP_COLORS } from '../../src/utils/constants'

const SCREEN_WIDTH = Dimensions.get('window').width

type FilterType = 'all' | 'category' | 'warehouse' | 'status'

export default function ValuationScreen() {
  const { valuation, valuationLoading, fetchValuation } = useInventoryStore()
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')

  useEffect(() => {
    loadValuation()
  }, [])

  const loadValuation = async () => {
    await fetchValuation()
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadValuation()
    setRefreshing(false)
  }

  const getCategoryData = () => {
    if (!valuation?.by_category) return []
    return Object.entries(valuation.by_category).map(([category, value]) => ({
      label: category,
      value: Number(value || 0),
      color: getCategoryColor(category),
    }))
  }

  const getWarehouseData = () => {
    if (!valuation?.by_warehouse) return []
    return Object.entries(valuation.by_warehouse).map(([warehouse, value]) => ({
      label: warehouse,
      value: Number(value || 0),
      color: getWarehouseColor(warehouse),
    }))
  }

  const getStatusData = () => {
    if (!valuation?.by_status) return []
    return Object.entries(valuation.by_status).map(([status, value]) => ({
      label: status,
      value: Number(value || 0),
      color: getStatusColor(status),
    }))
  }

  const getCategoryColor = (category: string) => {
    const colors = [
      APP_COLORS.primary,
      APP_COLORS.secondary,
      APP_COLORS.success,
      APP_COLORS.warning,
      APP_COLORS.info,
      APP_COLORS.error,
      '#8b5cf6',
      '#ec4899',
      '#f59e0b',
      '#10b981',
    ]
    const index = category.charCodeAt(0) % colors.length
    return colors[index]
  }

  const getWarehouseColor = (warehouse: string) => {
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4']
    const index = warehouse.charCodeAt(0) % colors.length
    return colors[index]
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return APP_COLORS.success
      case 'reserved':
        return APP_COLORS.warning
      case 'sold':
        return APP_COLORS.info
      case 'expired':
        return APP_COLORS.error
      default:
        return APP_COLORS.textSecondary
    }
  }

  const getCurrentData = () => {
    switch (filter) {
      case 'category':
        return getCategoryData()
      case 'warehouse':
        return getWarehouseData()
      case 'status':
        return getStatusData()
      default:
        return getCategoryData()
    }
  }

  const getFilterTitle = () => {
    switch (filter) {
      case 'category':
        return 'By Category'
      case 'warehouse':
        return 'By Warehouse'
      case 'status':
        return 'By Status'
      default:
        return 'Overview'
    }
  }

  const renderBarChart = (data: Array<{ label: string; value: number; color: string }>) => {
    const maxValue = Math.max(...data.map(d => d.value), 1)

    return (
      <View style={styles.barChart}>
        {data.map((item, index) => {
          const barWidth = (item.value / maxValue) * 100
          return (
            <View key={index} style={styles.barRow}>
              <Text style={styles.barLabel} numberOfLines={1}>
                {item.label}
              </Text>
              <View style={styles.barContainer}>
                <View
                  style={[styles.bar, { width: `${barWidth}%`, backgroundColor: item.color }]}
                />
                <Text style={styles.barValue}>
                  {valuation?.currency} {item.value.toFixed(0)}
                </Text>
              </View>
            </View>
          )
        })}
      </View>
    )
  }

  const renderPieChart = (data: Array<{ label: string; value: number; color: string }>) => {
    const total = data.reduce((sum, item) => sum + item.value, 0)
    if (total === 0) return null

    return (
      <View style={styles.pieChartContainer}>
        <View style={styles.pieChart}>
          {data.map((item, index) => {
            // Simple representation - for a real pie chart, you'd use SVG or Canvas
            return (
              <View
                key={index}
                style={[
                  styles.pieSlice,
                  {
                    backgroundColor: item.color,
                    width: 20,
                    height: 20,
                    opacity: 0.8,
                  },
                ]}
              />
            )
          })}
        </View>
        <View style={styles.pieLegend}>
          {data.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1)
            return (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                <View style={styles.legendText}>
                  <Text style={styles.legendLabel}>{item.label}</Text>
                  <Text style={styles.legendValue}>
                    {percentage}% • {valuation?.currency} {item.value.toFixed(0)}
                  </Text>
                </View>
              </View>
            )
          })}
        </View>
      </View>
    )
  }

  if (valuationLoading && !valuation) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Valuation Reports',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading valuation data...</Text>
        </View>
      </SafeAreaView>
    )
  }

  const currentData = getCurrentData()

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Valuation Reports',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Total Valuation Card */}
        {valuation && (
          <View style={styles.totalCard}>
            <View style={styles.totalIconContainer}>
              <Ionicons name="cash" size={32} color={APP_COLORS.primary} />
            </View>
            <View style={styles.totalInfo}>
              <Text style={styles.totalLabel}>Total Inventory Value</Text>
              <Text style={styles.totalValue}>
                {valuation.currency} {Number(valuation.total_value || 0).toFixed(2)}
              </Text>
              <Text style={styles.totalMeta}>
                {valuation.item_count || 0} items • Updated{' '}
                {valuation.last_updated
                  ? new Date(valuation.last_updated).toLocaleDateString()
                  : 'N/A'}
              </Text>
            </View>
          </View>
        )}

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'category' && styles.filterTabActive]}
            onPress={() => setFilter('category')}
          >
            <Text
              style={[styles.filterTabText, filter === 'category' && styles.filterTabTextActive]}
            >
              Category
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'warehouse' && styles.filterTabActive]}
            onPress={() => setFilter('warehouse')}
          >
            <Text
              style={[styles.filterTabText, filter === 'warehouse' && styles.filterTabTextActive]}
            >
              Warehouse
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'status' && styles.filterTabActive]}
            onPress={() => setFilter('status')}
          >
            <Text style={[styles.filterTabText, filter === 'status' && styles.filterTabTextActive]}>
              Status
            </Text>
          </TouchableOpacity>
        </View>

        {/* Charts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{getFilterTitle()}</Text>

          {currentData.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="bar-chart-outline" size={64} color={APP_COLORS.textSecondary} />
              <Text style={styles.emptyText}>No data available</Text>
            </View>
          ) : (
            <>
              {/* Bar Chart */}
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Ionicons name="bar-chart" size={20} color={APP_COLORS.primary} />
                  <Text style={styles.chartTitle}>Value Distribution</Text>
                </View>
                {renderBarChart(currentData)}
              </View>

              {/* Pie Chart Legend */}
              <View style={styles.chartCard}>
                <View style={styles.chartHeader}>
                  <Ionicons name="pie-chart" size={20} color={APP_COLORS.primary} />
                  <Text style={styles.chartTitle}>Percentage Breakdown</Text>
                </View>
                {renderPieChart(currentData)}
              </View>
            </>
          )}
        </View>

        {/* Summary Stats */}
        {valuation && filter === 'all' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary Statistics</Text>
            <View style={styles.statsGrid}>
              {valuation.by_category && Object.keys(valuation.by_category).length > 0 && (
                <View style={styles.statCard}>
                  <Ionicons name="albums" size={24} color={APP_COLORS.primary} />
                  <Text style={styles.statValue}>{Object.keys(valuation.by_category).length}</Text>
                  <Text style={styles.statLabel}>Categories</Text>
                </View>
              )}
              {valuation.by_warehouse && Object.keys(valuation.by_warehouse).length > 0 && (
                <View style={styles.statCard}>
                  <Ionicons name="business" size={24} color={APP_COLORS.secondary} />
                  <Text style={styles.statValue}>{Object.keys(valuation.by_warehouse).length}</Text>
                  <Text style={styles.statLabel}>Warehouses</Text>
                </View>
              )}
              {valuation.by_status && Object.keys(valuation.by_status).length > 0 && (
                <View style={styles.statCard}>
                  <Ionicons name="checkmark-circle" size={24} color={APP_COLORS.success} />
                  <Text style={styles.statValue}>{Object.keys(valuation.by_status).length}</Text>
                  <Text style={styles.statLabel}>Statuses</Text>
                </View>
              )}
              {valuation.item_count && (
                <View style={styles.statCard}>
                  <Ionicons name="cube" size={24} color={APP_COLORS.info} />
                  <Text style={styles.statValue}>{valuation.item_count}</Text>
                  <Text style={styles.statLabel}>Total Items</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
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
  content: {
    flex: 1,
  },
  totalCard: {
    flexDirection: 'row',
    backgroundColor: APP_COLORS.surface,
    margin: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  totalIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${APP_COLORS.primary}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  totalInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  totalLabel: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  totalMeta: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: APP_COLORS.surface,
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: APP_COLORS.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: APP_COLORS.text,
  },
  filterTabTextActive: {
    color: 'white',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 16,
  },
  chartCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  barChart: {
    gap: 12,
  },
  barRow: {
    gap: 8,
  },
  barLabel: {
    fontSize: 13,
    color: APP_COLORS.text,
    fontWeight: '500',
    marginBottom: 4,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bar: {
    height: 32,
    borderRadius: 6,
    minWidth: 40,
  },
  barValue: {
    fontSize: 13,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  pieChartContainer: {
    gap: 16,
  },
  pieChart: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
  },
  pieSlice: {
    borderRadius: 4,
  },
  pieLegend: {
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: APP_COLORS.text,
    marginBottom: 2,
  },
  legendValue: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 56) / 2,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: APP_COLORS.text,
  },
  statLabel: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: APP_COLORS.textSecondary,
    marginTop: 16,
  },
})
