import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useMarketplaceStore } from '../../src/store/marketplace-store'
import { useOrderStore } from '../../src/store/order-store'
import { formatCurrency } from '../../src/utils/order-helpers'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'

export default function PlaceOrderScreen() {
  const params = useLocalSearchParams<{ listingId: string }>()
  const listingId = parseInt(params.listingId || '0', 10)

  const { currentListing, detailLoading, fetchListingDetail } = useMarketplaceStore()
  const { placeOrder, actionLoading, actionError, clearActionError } = useOrderStore()

  const [quantity, setQuantity] = useState('')
  const [buyerNotes, setBuyerNotes] = useState('')

  useEffect(() => {
    if (listingId > 0) {
      fetchListingDetail(listingId)
    }
    return () => clearActionError()
  }, [listingId])

  const listing = currentListing

  const availableQty = listing ? parseFloat(listing.available_quantity) : 0
  const minQty = listing?.minimum_order_quantity ? parseFloat(listing.minimum_order_quantity) : 0
  const pricePerUnit = listing ? parseFloat(listing.price_per_unit) : 0
  const parsedQty = parseFloat(quantity) || 0
  const totalPrice = parsedQty * pricePerUnit

  const isValid =
    parsedQty > 0 &&
    parsedQty <= availableQty &&
    (minQty === 0 || parsedQty >= minQty)

  const handleSubmit = async () => {
    if (!listing || !isValid) return

    const result = await placeOrder({
      listing_id: listingId,
      quantity: parsedQty,
      buyer_notes: buyerNotes.trim() || undefined,
    })

    if (result) {
      Alert.alert(
        'Order Placed',
        `Your order for ${quantity} ${listing.unit} of ${listing.title} has been submitted. The farmer will review it shortly.`,
        [{ text: 'View Orders', onPress: () => router.replace('/(tabs)/orders') }]
      )
    }
  }

  if (detailLoading || !listing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={APP_COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Place Order</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
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
        <Text style={styles.headerTitle}>Place Order</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Listing Summary */}
          <View style={styles.listingCard}>
            <Text style={styles.listingTitle}>{listing.title}</Text>
            <View style={styles.listingMeta}>
              <Text style={styles.listingPrice}>
                {formatCurrency(listing.price_per_unit, listing.currency)} / {listing.unit}
              </Text>
              <Text style={styles.listingAvailable}>
                {listing.available_quantity} {listing.unit} available
              </Text>
            </View>
            {listing.farm_name && (
              <View style={styles.farmerRow}>
                <Ionicons name="leaf" size={16} color={APP_COLORS.primary} />
                <Text style={styles.farmerName}>{listing.farm_name}</Text>
              </View>
            )}
          </View>

          {/* Quantity Input */}
          <View style={styles.section}>
            <Text style={styles.label}>Quantity ({listing.unit})</Text>
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              placeholder={`Enter quantity${minQty > 0 ? ` (min ${minQty})` : ''}`}
              placeholderTextColor={APP_COLORS.textTertiary}
              keyboardType="decimal-pad"
            />
            {minQty > 0 && (
              <Text style={styles.hint}>
                Minimum order: {minQty} {listing.unit}
              </Text>
            )}
            {parsedQty > availableQty && (
              <Text style={styles.errorHint}>
                Exceeds available stock ({availableQty} {listing.unit})
              </Text>
            )}
            {minQty > 0 && parsedQty > 0 && parsedQty < minQty && (
              <Text style={styles.errorHint}>
                Below minimum order quantity ({minQty} {listing.unit})
              </Text>
            )}
          </View>

          {/* Total Price */}
          {parsedQty > 0 && (
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Order Total</Text>
              <Text style={styles.totalValue}>
                {formatCurrency(totalPrice.toFixed(2), listing.currency)}
              </Text>
              <Text style={styles.totalBreakdown}>
                {quantity} {listing.unit} x {formatCurrency(listing.price_per_unit, listing.currency)}
              </Text>
            </View>
          )}

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={buyerNotes}
              onChangeText={setBuyerNotes}
              placeholder="Any special requirements or delivery instructions..."
              placeholderTextColor={APP_COLORS.textTertiary}
              multiline
              numberOfLines={3}
              maxLength={1000}
            />
          </View>

          {/* Error */}
          {actionError && (
            <View style={styles.errorCard}>
              <Ionicons name="alert-circle" size={20} color={APP_COLORS.error} />
              <Text style={styles.errorText}>{actionError}</Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.bottomCTA}>
          <TouchableOpacity
            style={[styles.submitButton, !isValid && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="cart" size={20} color="#FFFFFF" />
                <Text style={styles.submitButtonText}>
                  {parsedQty > 0
                    ? `Place Order - ${formatCurrency(totalPrice.toFixed(2), listing.currency)}`
                    : 'Place Order'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  listingCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  listingTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  listingMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  listingPrice: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: APP_COLORS.primary,
  },
  listingAvailable: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  farmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  farmerName: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: APP_COLORS.text,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    fontFamily: FONTS.regular,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 13,
    color: APP_COLORS.textTertiary,
    marginTop: 6,
  },
  errorHint: {
    fontSize: 13,
    color: APP_COLORS.error,
    marginTop: 6,
  },
  totalCard: {
    backgroundColor: APP_COLORS.primary + '10',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.primary + '30',
  },
  totalLabel: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 28,
    fontFamily: FONTS.bold,
    color: APP_COLORS.primary,
  },
  totalBreakdown: {
    fontSize: 13,
    color: APP_COLORS.textTertiary,
    marginTop: 4,
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
  errorText: {
    fontSize: 14,
    color: APP_COLORS.error,
    flex: 1,
  },
  bottomCTA: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
})
