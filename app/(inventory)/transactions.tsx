import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useInventoryStore } from '../../src/store/inventory-store'
import { useAppStore } from '../../src/store/app-store'
import { APP_COLORS } from '../../src/utils/constants'
import { InventoryTransactionResponse, TransactionTypeEnum } from '../../src/types/inventory'

export default function TransactionsScreen() {
  const { isOnline } = useAppStore()
  const { transactions, transactionsLoading, transactionsError, fetchTransactions } =
    useInventoryStore()
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<TransactionTypeEnum | 'all'>('all')

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    await fetchTransactions()
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadTransactions()
    setRefreshing(false)
  }

  const filteredTransactions = transactions.filter(
    t => filter === 'all' || t.transaction_type === filter
  )

  const getTransactionIcon = (type: TransactionTypeEnum) => {
    switch (type) {
      case TransactionTypeEnum.ADD:
        return 'add-circle'
      case TransactionTypeEnum.REMOVE:
        return 'remove-circle'
      case TransactionTypeEnum.TRANSFER:
        return 'swap-horizontal'
      case TransactionTypeEnum.ADJUSTMENT:
        return 'create'
      case TransactionTypeEnum.SALE:
        return 'cash'
      case TransactionTypeEnum.SPOILAGE:
        return 'warning'
      case TransactionTypeEnum.RETURN:
        return 'return-up-back'
      default:
        return 'document'
    }
  }

  const getTransactionColor = (type: TransactionTypeEnum) => {
    switch (type) {
      case TransactionTypeEnum.ADD:
        return APP_COLORS.success
      case TransactionTypeEnum.REMOVE:
      case TransactionTypeEnum.SPOILAGE:
        return APP_COLORS.error
      case TransactionTypeEnum.TRANSFER:
        return APP_COLORS.info
      case TransactionTypeEnum.SALE:
        return APP_COLORS.primary
      case TransactionTypeEnum.ADJUSTMENT:
        return APP_COLORS.warning
      case TransactionTypeEnum.RETURN:
        return APP_COLORS.secondary
      default:
        return APP_COLORS.textSecondary
    }
  }

  const formatTransactionType = (type: TransactionTypeEnum) => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const renderTransaction = ({ item }: { item: InventoryTransactionResponse }) => {
    const color = getTransactionColor(item.transaction_type)
    const icon = getTransactionIcon(item.transaction_type)

    const handlePress = () => {
      if (item.inventory_item_id) {
        router.push(`/(inventory)/item-details?id=${item.inventory_item_id}`)
      }
    }

    return (
      <TouchableOpacity
        style={styles.transactionCard}
        onPress={handlePress}
        disabled={!item.inventory_item_id}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>

        <View style={styles.transactionContent}>
          <View style={styles.transactionHeader}>
            <Text style={styles.transactionType}>
              {formatTransactionType(item.transaction_type)}
            </Text>
            <Text style={[styles.quantityChange, { color }]}>
              {item.quantity_change > 0 ? '+' : ''}
              {item.quantity_change}
              {item.item_unit ? ` ${item.item_unit}` : ''}
            </Text>
          </View>

          {/* Item Information - Only shown in global transactions */}
          {item.item_name && (
            <View style={styles.itemInfoContainer}>
              <Ionicons name="cube-outline" size={14} color={APP_COLORS.primary} />
              <Text style={styles.itemName}>{item.item_name}</Text>
              {item.item_sku && <Text style={styles.itemSku}>({item.item_sku})</Text>}
            </View>
          )}

          {item.inventory_type_name && (
            <Text style={styles.inventoryType}>Type: {item.inventory_type_name}</Text>
          )}

          {item.warehouse_name && (
            <View style={styles.warehouseContainer}>
              <Ionicons name="business-outline" size={14} color={APP_COLORS.textSecondary} />
              <Text style={styles.warehouseText}>{item.warehouse_name}</Text>
            </View>
          )}

          <Text style={styles.transactionDate}>
            {new Date(item.transaction_date).toLocaleString()}
          </Text>

          {item.notes && <Text style={styles.transactionNotes}>{item.notes}</Text>}

          {(item.quantity_before !== undefined || item.quantity_after !== undefined) && (
            <View style={styles.quantityRow}>
              <Text style={styles.quantityLabel}>
                {item.quantity_before ?? '-'} → {item.quantity_after ?? '-'}
              </Text>
            </View>
          )}

          {item.total_cost && (
            <Text style={styles.costText}>Cost: ZAR {Number(item.total_cost).toFixed(2)}</Text>
          )}
        </View>

        {item.inventory_item_id && (
          <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textSecondary} />
        )}
      </TouchableOpacity>
    )
  }

  const FilterButton = ({ type, label }: { type: TransactionTypeEnum | 'all'; label: string }) => (
    <TouchableOpacity
      style={[styles.filterButton, filter === type && styles.filterButtonActive]}
      onPress={() => setFilter(type)}
    >
      <Text style={[styles.filterButtonText, filter === type && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  )

  if (transactionsLoading && transactions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Transaction History',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading transactions...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Transaction History',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <FilterButton type="all" label="All" />
        <FilterButton type={TransactionTypeEnum.ADD} label="Add" />
        <FilterButton type={TransactionTypeEnum.REMOVE} label="Remove" />
        <FilterButton type={TransactionTypeEnum.TRANSFER} label="Transfer" />
        <FilterButton type={TransactionTypeEnum.SALE} label="Sale" />
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color="white" />
          <Text style={styles.offlineText}>Viewing cached data</Text>
        </View>
      )}

      {transactionsError && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color="white" />
          <Text style={styles.errorBannerText} numberOfLines={2}>
            {transactionsError}
          </Text>
          <TouchableOpacity onPress={loadTransactions} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredTransactions}
        renderItem={renderTransaction}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={64} color={APP_COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No transactions found</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'all'
                ? 'Transaction history will appear here'
                : `No ${filter} transactions found`}
            </Text>
          </View>
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexWrap: 'wrap',
    backgroundColor: APP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: APP_COLORS.background,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.primary,
  },
  filterButtonText: {
    fontSize: 14,
    color: APP_COLORS.text,
    fontWeight: '500',
  },
  filterButtonTextActive: {
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.error,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 10,
  },
  errorBannerText: {
    flex: 1,
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  list: {
    padding: 16,
  },
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionContent: {
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  quantityChange: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  itemInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 4,
    gap: 6,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: APP_COLORS.primary,
  },
  itemSku: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    fontStyle: 'italic',
  },
  inventoryType: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginBottom: 4,
  },
  warehouseContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  warehouseText: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  transactionDate: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginBottom: 8,
  },
  transactionNotes: {
    fontSize: 14,
    color: APP_COLORS.text,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  quantityRow: {
    marginBottom: 4,
  },
  quantityLabel: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
  },
  costText: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
})
