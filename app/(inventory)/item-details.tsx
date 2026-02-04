import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useInventoryStore } from '../../src/store/inventory-store'
import { useInventoryPermissions } from '../../src/hooks/useInventoryPermissions'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'
import {
  getTransactionIcon,
  getTransactionColor,
  formatTransactionType,
} from '../../src/utils/inventory-helpers'

export default function ItemDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { permissions } = useInventoryPermissions()
  const {
    currentItem,
    itemsLoading,
    fetchItemById,
    deleteItem,
    transactions,
    transactionsLoading,
    fetchTransactions,
  } = useInventoryStore()

  const [deleting, setDeleting] = useState(false)
  const [showAllTransactions, setShowAllTransactions] = useState(false)

  useEffect(() => {
    if (id) {
      fetchItemById(Number(id))
      fetchTransactions(Number(id))
    }
  }, [id])

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true)
            const success = await deleteItem(Number(id))
            setDeleting(false)

            if (success) {
              router.back()
            } else {
              Alert.alert('Error', 'Failed to delete item. Please try again.')
            }
          },
        },
      ]
    )
  }

  const handleEdit = () => {
    router.push(`/inventory/item-form?id=${id}`)
  }

  if (itemsLoading || !currentItem) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Item Details',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading item...</Text>
        </View>
      </SafeAreaView>
    )
  }

  const item = currentItem
  const canEdit = permissions.canEditInventory
  const canDelete = permissions.canDeleteInventory

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Item Details',
          headerShown: true,
          headerBackTitle: 'Back',
          headerRight: () =>
            canEdit ? (
              <TouchableOpacity onPress={handleEdit} style={styles.headerButton}>
                <Ionicons name="create-outline" size={24} color={APP_COLORS.primary} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Item Header */}
        <View style={styles.header}>
          <Text style={styles.itemName}>{item.item_name}</Text>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.status}</Text>
          </View>
        </View>

        {/* Status & Alerts */}
        <View style={styles.statusSection}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>Status: {item.status}</Text>
          </View>

          {item.is_low_stock && (
            <View style={[styles.alertBadge, { backgroundColor: APP_COLORS.warning }]}>
              <Ionicons name="warning" size={16} color={APP_COLORS.textOnPrimary} />
              <Text style={styles.alertText}>Low Stock</Text>
            </View>
          )}

          {item.is_expired && (
            <View style={[styles.alertBadge, { backgroundColor: APP_COLORS.error }]}>
              <Ionicons name="alert-circle" size={16} color={APP_COLORS.textOnPrimary} />
              <Text style={styles.alertText}>Expired</Text>
            </View>
          )}
        </View>

        {/* Key Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Information</Text>

          <View style={styles.infoCard}>
            <InfoRow icon="cube" label="Quantity" value={`${item.current_quantity} ${item.unit}`} />
            <InfoRow
              icon="cash"
              label="Unit Price"
              value={`${item.currency} ${Number(item.cost_per_unit).toFixed(2)}`}
            />
            <InfoRow
              icon="calculator"
              label="Total Value"
              value={`${item.currency} ${item.total_value ? Number(item.total_value).toFixed(2) : '0.00'}`}
            />
            {item.minimum_quantity && (
              <InfoRow
                icon="stats-chart"
                label="Min Stock Level"
                value={`${item.minimum_quantity} ${item.unit}`}
              />
            )}
          </View>
        </View>

        {/* Batch Information */}
        {(item.batch_number || item.expiry_date || item.acquisition_date) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Batch Information</Text>

            <View style={styles.infoCard}>
              {item.batch_number && (
                <InfoRow icon="barcode" label="Batch Number" value={item.batch_number} />
              )}
              {item.acquisition_date && (
                <InfoRow
                  icon="calendar"
                  label="Acquisition Date"
                  value={new Date(item.acquisition_date).toLocaleDateString()}
                />
              )}
              {item.expiry_date && (
                <InfoRow
                  icon="time"
                  label="Expiry Date"
                  value={new Date(item.expiry_date).toLocaleDateString()}
                  valueColor={item.is_expired ? APP_COLORS.error : undefined}
                />
              )}
            </View>
          </View>
        )}

        {/* Location Information */}
        {permissions.canManageWarehouses && (item.warehouse_id || item.bin_id) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>

            <View style={styles.infoCard}>
              {item.warehouse_id && (
                <InfoRow
                  icon="business"
                  label="Warehouse"
                  value={`Warehouse #${item.warehouse_id}`}
                />
              )}
              {item.bin_id && (
                <InfoRow
                  icon="file-tray-stacked"
                  label="Storage Bin"
                  value={`Bin #${item.bin_id}`}
                />
              )}
            </View>
          </View>
        )}

        {/* Description */}
        {item.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={styles.descriptionCard}>
              <Text style={styles.descriptionText}>{item.description}</Text>
            </View>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Record Information</Text>

          <View style={styles.infoCard}>
            <InfoRow icon="person" label="Account ID" value={`#${item.account_id}`} />
            <InfoRow
              icon="calendar-outline"
              label="Created"
              value={new Date(item.created_at).toLocaleString()}
            />
            <InfoRow
              icon="refresh"
              label="Last Updated"
              value={new Date(item.updated_at).toLocaleString()}
            />
          </View>
        </View>

        {/* Transaction History */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transaction History</Text>
            {transactions.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{transactions.length}</Text>
              </View>
            )}
          </View>

          {transactionsLoading ? (
            <View style={styles.transactionsLoadingContainer}>
              <ActivityIndicator size="small" color={APP_COLORS.primary} />
              <Text style={styles.transactionsLoadingText}>Loading transactions...</Text>
            </View>
          ) : transactions.length === 0 ? (
            <View style={styles.emptyTransactions}>
              <Ionicons name="receipt-outline" size={48} color={APP_COLORS.textSecondary} />
              <Text style={styles.emptyTransactionsText}>No transaction history</Text>
            </View>
          ) : (
            <>
              {(showAllTransactions ? transactions : transactions.slice(0, 5)).map(transaction => {
                const color = getTransactionColor(transaction.transaction_type)
                const icon = getTransactionIcon(transaction.transaction_type)

                return (
                  <View key={transaction.id} style={styles.transactionCard}>
                    <View style={[styles.transactionIcon, { backgroundColor: `${color}20` }]}>
                      <Ionicons
                        name={icon as keyof typeof Ionicons.glyphMap}
                        size={20}
                        color={color}
                      />
                    </View>

                    <View style={styles.transactionContent}>
                      <View style={styles.transactionHeader}>
                        <Text style={styles.transactionType}>
                          {formatTransactionType(transaction.transaction_type)}
                        </Text>
                        <Text style={[styles.transactionQuantity, { color }]}>
                          {transaction.quantity_change > 0 ? '+' : ''}
                          {transaction.quantity_change}
                        </Text>
                      </View>

                      <Text style={styles.transactionDate}>
                        {new Date(transaction.transaction_date).toLocaleString()}
                      </Text>

                      {transaction.notes && (
                        <Text style={styles.transactionNotes} numberOfLines={2}>
                          {transaction.notes}
                        </Text>
                      )}

                      {(transaction.quantity_before !== undefined ||
                        transaction.quantity_after !== undefined) && (
                        <Text style={styles.transactionQuantityFlow}>
                          {transaction.quantity_before ?? '-'} → {transaction.quantity_after ?? '-'}
                        </Text>
                      )}
                    </View>
                  </View>
                )
              })}

              {transactions.length > 5 && !showAllTransactions && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => setShowAllTransactions(true)}
                >
                  <Text style={styles.showMoreText}>
                    Show {transactions.length - 5} more transactions
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={APP_COLORS.primary} />
                </TouchableOpacity>
              )}

              {showAllTransactions && transactions.length > 5 && (
                <TouchableOpacity
                  style={styles.showMoreButton}
                  onPress={() => setShowAllTransactions(false)}
                >
                  <Text style={styles.showMoreText}>Show less</Text>
                  <Ionicons name="chevron-up" size={16} color={APP_COLORS.primary} />
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Action Buttons */}
        {(canEdit || canDelete) && (
          <View style={styles.actionsSection}>
            {canEdit && (
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={handleEdit}
              >
                <Ionicons name="create-outline" size={20} color={APP_COLORS.textOnPrimary} />
                <Text style={styles.actionButtonText}>Edit Item</Text>
              </TouchableOpacity>
            )}

            {canDelete && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={APP_COLORS.textOnPrimary} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color={APP_COLORS.textOnPrimary} />
                    <Text style={styles.actionButtonText}>Delete Item</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// Helper component for info rows
function InfoRow({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: string
  label: string
  value: string
  valueColor?: string
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLabelContainer}>
        <Ionicons
          name={icon as keyof typeof Ionicons.glyphMap}
          size={18}
          color={APP_COLORS.primary}
        />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
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
    fontFamily: FONTS.regular,
  },
  headerButton: {
    marginRight: 8,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: APP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  itemName: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: APP_COLORS.text,
    marginBottom: 12,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: APP_COLORS.primary,
  },
  categoryText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.textOnPrimary,
    textTransform: 'capitalize',
  },
  statusSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
    backgroundColor: APP_COLORS.surface,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: APP_COLORS.info,
  },
  statusText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.textOnPrimary,
    textTransform: 'capitalize',
  },
  alertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  alertText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.textOnPrimary,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  infoLabel: {
    fontSize: 15,
    color: APP_COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    textAlign: 'right',
    flex: 1,
  },
  descriptionCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 22,
    color: APP_COLORS.text,
    fontFamily: FONTS.regular,
  },
  actionsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  editButton: {
    backgroundColor: APP_COLORS.primary,
  },
  deleteButton: {
    backgroundColor: APP_COLORS.error,
  },
  actionButtonText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.textOnPrimary,
  },
  // Transaction History Styles
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  countBadge: {
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 28,
    alignItems: 'center',
  },
  countBadgeText: {
    color: APP_COLORS.textOnPrimary,
    fontSize: 12,
    fontFamily: FONTS.bold,
  },
  transactionsLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  transactionsLoadingText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  emptyTransactions: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  emptyTransactionsText: {
    fontSize: 15,
    color: APP_COLORS.textSecondary,
    marginTop: 12,
    fontFamily: FONTS.regular,
  },
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transactionContent: {
    flex: 1,
    gap: 4,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionType: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
  },
  transactionQuantity: {
    fontSize: 15,
    fontFamily: FONTS.bold,
  },
  transactionDate: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  transactionNotes: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  transactionQuantityFlow: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
    fontFamily: FONTS.regular,
  },
  showMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    marginTop: 4,
    gap: 6,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  showMoreText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.primary,
  },
})
