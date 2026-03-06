import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useOrderStore } from '../../src/store/order-store'
import { OrderStatusEnum } from '../../src/types/order'
import {
  getOrderStatusLabel,
  getOrderStatusColor,
  formatOrderDateTime,
  formatCurrency,
} from '../../src/utils/order-helpers'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'

export default function OrderDetailScreen() {
  const params = useLocalSearchParams<{ orderId: string; role: string }>()
  const orderId = parseInt(params.orderId || '0', 10)
  const role = params.role || 'buyer' // 'buyer' (wholesaler) or 'seller' (farmer)

  const {
    currentOrder,
    detailLoading,
    detailError,
    actionLoading,
    actionError,
    fetchMyOrderDetail,
    fetchIncomingOrderDetail,
    completeOrder,
    cancelOrder,
    confirmOrder,
    declineOrder,
    clearCurrentOrder,
    clearActionError,
  } = useOrderStore()

  const [declineReason, setDeclineReason] = useState('')
  const [showDeclineInput, setShowDeclineInput] = useState(false)

  useEffect(() => {
    if (orderId > 0) {
      if (role === 'seller') {
        fetchIncomingOrderDetail(orderId)
      } else {
        fetchMyOrderDetail(orderId)
      }
    }
    return () => {
      clearCurrentOrder()
      clearActionError()
    }
  }, [orderId])

  const handleComplete = () => {
    Alert.alert(
      'Complete Order',
      'Confirm that you have received this order?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Complete',
          onPress: async () => {
            const success = await completeOrder(orderId)
            if (success) {
              Alert.alert('Order Completed', 'The order has been marked as completed.')
            }
          },
        },
      ]
    )
  }

  const handleCancel = () => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            const success = await cancelOrder(orderId)
            if (success) {
              Alert.alert('Order Cancelled', 'The order has been cancelled.')
            }
          },
        },
      ]
    )
  }

  const handleConfirm = async () => {
    const success = await confirmOrder(orderId)
    if (success) {
      Alert.alert('Order Confirmed', 'The order has been confirmed. Stock has been reserved.')
    }
  }

  const handleDecline = async () => {
    if (!showDeclineInput) {
      setShowDeclineInput(true)
      return
    }
    const success = await declineOrder(orderId, declineReason.trim() || undefined)
    if (success) {
      Alert.alert('Order Declined', 'The order has been declined.')
      setShowDeclineInput(false)
    }
  }

  const order = currentOrder

  if (detailLoading || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={APP_COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          {detailLoading ? (
            <ActivityIndicator size="large" color={APP_COLORS.primary} />
          ) : (
            <Text style={styles.errorText}>{detailError || 'Order not found'}</Text>
          )}
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={APP_COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order #{order.id}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Status Badge */}
        <View style={styles.statusSection}>
          <View style={[styles.statusBadgeLarge, { backgroundColor: getOrderStatusColor(order.status) + '20' }]}>
            <Text style={[styles.statusTextLarge, { color: getOrderStatusColor(order.status) }]}>
              {getOrderStatusLabel(order.status)}
            </Text>
          </View>
        </View>

        {/* Listing Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Product</Text>
          <Text style={styles.listingTitle}>{order.listing_title}</Text>
          <View style={styles.row}>
            <Text style={styles.detailLabel}>Quantity</Text>
            <Text style={styles.detailValue}>{order.quantity} {order.unit}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.detailLabel}>Price per unit</Text>
            <Text style={styles.detailValue}>{formatCurrency(order.price_per_unit, order.currency)}</Text>
          </View>
          <View style={[styles.row, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.total_price, order.currency)}</Text>
          </View>
        </View>

        {/* Parties */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {role === 'buyer' ? 'Seller' : 'Buyer'}
          </Text>
          {role === 'buyer' ? (
            <>
              <Text style={styles.partyName}>{order.seller_farm_name || order.seller_name || 'Unknown'}</Text>
              {order.seller_farm_name && order.seller_name && (
                <Text style={styles.partySubName}>{order.seller_name}</Text>
              )}
            </>
          ) : (
            <Text style={styles.partyName}>{order.buyer_name || 'Unknown Buyer'}</Text>
          )}
        </View>

        {/* Notes */}
        {order.buyer_notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Buyer Notes</Text>
            <Text style={styles.notesText}>{order.buyer_notes}</Text>
          </View>
        )}
        {order.seller_notes && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Seller Notes</Text>
            <Text style={styles.notesText}>{order.seller_notes}</Text>
          </View>
        )}
        {order.decline_reason && (
          <View style={[styles.card, { borderColor: APP_COLORS.error + '40' }]}>
            <Text style={[styles.cardTitle, { color: APP_COLORS.error }]}>Decline Reason</Text>
            <Text style={styles.notesText}>{order.decline_reason}</Text>
          </View>
        )}

        {/* Timeline */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Timeline</Text>
          <View style={styles.timelineItem}>
            <Ionicons name="time-outline" size={16} color={APP_COLORS.textSecondary} />
            <Text style={styles.timelineLabel}>Created</Text>
            <Text style={styles.timelineValue}>{formatOrderDateTime(order.created_at)}</Text>
          </View>
          {order.confirmed_at && (
            <View style={styles.timelineItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#3B82F6" />
              <Text style={styles.timelineLabel}>Confirmed</Text>
              <Text style={styles.timelineValue}>{formatOrderDateTime(order.confirmed_at)}</Text>
            </View>
          )}
          {order.declined_at && (
            <View style={styles.timelineItem}>
              <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
              <Text style={styles.timelineLabel}>Declined</Text>
              <Text style={styles.timelineValue}>{formatOrderDateTime(order.declined_at)}</Text>
            </View>
          )}
          {order.completed_at && (
            <View style={styles.timelineItem}>
              <Ionicons name="checkmark-done-circle-outline" size={16} color="#10B981" />
              <Text style={styles.timelineLabel}>Completed</Text>
              <Text style={styles.timelineValue}>{formatOrderDateTime(order.completed_at)}</Text>
            </View>
          )}
          {order.cancelled_at && (
            <View style={styles.timelineItem}>
              <Ionicons name="ban-outline" size={16} color="#6B7280" />
              <Text style={styles.timelineLabel}>Cancelled</Text>
              <Text style={styles.timelineValue}>{formatOrderDateTime(order.cancelled_at)}</Text>
            </View>
          )}
        </View>

        {/* Decline Input (farmer) */}
        {showDeclineInput && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reason for Declining</Text>
            <TextInput
              style={styles.declineInput}
              value={declineReason}
              onChangeText={setDeclineReason}
              placeholder="Optional: explain why you're declining..."
              placeholderTextColor={APP_COLORS.textTertiary}
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        {/* Action Error */}
        {actionError && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color={APP_COLORS.error} />
            <Text style={styles.actionErrorText}>{actionError}</Text>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Action Buttons */}
      {role === 'buyer' && order.status === OrderStatusEnum.PENDING && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleCancel}
            disabled={actionLoading}
          >
            <Text style={styles.actionButtonText}>Cancel Order</Text>
          </TouchableOpacity>
        </View>
      )}
      {role === 'buyer' && order.status === OrderStatusEnum.CONFIRMED && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleCancel}
            disabled={actionLoading}
          >
            <Text style={styles.actionButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.successButton]}
            onPress={handleComplete}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionButtonText}>Mark Received</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
      {role === 'seller' && order.status === OrderStatusEnum.PENDING && (
        <View style={styles.bottomActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.dangerButton]}
            onPress={handleDecline}
            disabled={actionLoading}
          >
            <Text style={styles.actionButtonText}>
              {showDeclineInput ? 'Submit Decline' : 'Decline'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.successButton]}
            onPress={handleConfirm}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.actionButtonText}>Confirm</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  scrollView: {
    flex: 1,
    padding: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: APP_COLORS.textSecondary,
    fontSize: 16,
  },
  statusSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadgeLarge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusTextLarge: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
  },
  card: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  cardTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginBottom: 10,
  },
  listingTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: APP_COLORS.text,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  detailValue: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: APP_COLORS.text,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
    marginBottom: 0,
  },
  totalLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: APP_COLORS.text,
  },
  totalValue: {
    fontFamily: FONTS.bold,
    fontSize: 18,
    color: APP_COLORS.primary,
  },
  partyName: {
    fontFamily: FONTS.semiBold,
    fontSize: 16,
    color: APP_COLORS.text,
  },
  partySubName: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  notesText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: APP_COLORS.text,
    lineHeight: 20,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  timelineLabel: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  timelineValue: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: APP_COLORS.text,
    marginLeft: 'auto',
  },
  declineInput: {
    backgroundColor: APP_COLORS.background,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: APP_COLORS.text,
    fontFamily: FONTS.regular,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.error + '15',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  actionErrorText: {
    fontSize: 14,
    color: APP_COLORS.error,
    flex: 1,
  },
  bottomActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  successButton: {
    backgroundColor: '#10B981',
  },
  dangerButton: {
    backgroundColor: APP_COLORS.error,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
})
