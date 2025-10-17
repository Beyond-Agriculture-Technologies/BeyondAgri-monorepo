import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useInventoryStore } from '../../src/store/inventory-store'
import { APP_COLORS } from '../../src/utils/constants'

interface TransferModalProps {
  visible: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function TransferModal({ visible, onClose, onSuccess }: TransferModalProps) {
  const {
    transferModal,
    warehouses,
    bins,
    transferItem,
    fetchWarehouses,
    fetchBins,
    closeTransferModal,
  } = useInventoryStore()

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number | null>(null)
  const [selectedBinId, setSelectedBinId] = useState<number | null>(null)
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')
  const [step, setStep] = useState<'warehouse' | 'bin' | 'quantity' | 'confirm'>('warehouse')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (visible) {
      loadWarehouses()
      // Reset state when modal opens
      setSelectedWarehouseId(null)
      setSelectedBinId(null)
      setQuantity('')
      setNotes('')
      setStep('warehouse')
    }
  }, [visible])

  const loadWarehouses = async () => {
    await fetchWarehouses()
  }

  const handleWarehouseSelect = async (warehouseId: number) => {
    setSelectedWarehouseId(warehouseId)
    setSelectedBinId(null)
    // Load bins for selected warehouse
    await fetchBins({ warehouse_id: warehouseId })
    setStep('bin')
  }

  const handleBinSelect = (binId: number | null) => {
    setSelectedBinId(binId)
    setStep('quantity')
  }

  const handleQuantityNext = () => {
    if (!quantity || Number(quantity) <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity')
      return
    }
    if (transferModal.item && Number(quantity) > transferModal.item.quantity) {
      Alert.alert(
        'Invalid Quantity',
        `Cannot transfer more than available quantity (${transferModal.item.quantity})`
      )
      return
    }
    setStep('confirm')
  }

  const handleConfirmTransfer = async () => {
    if (!transferModal.item || !selectedWarehouseId) return

    setLoading(true)
    try {
      const success = await transferItem(
        transferModal.item.id,
        selectedWarehouseId,
        selectedBinId || undefined
      )

      if (success) {
        Alert.alert('Success', 'Item transferred successfully', [
          {
            text: 'OK',
            onPress: () => {
              closeTransferModal()
              onClose()
              onSuccess?.()
            },
          },
        ])
      } else {
        Alert.alert('Error', 'Failed to transfer item. Please try again.')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to transfer item'
      Alert.alert('Error', errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    closeTransferModal()
    onClose()
  }

  const selectedWarehouse = warehouses.find(w => w.id === selectedWarehouseId)
  const selectedBin = bins.find(b => b.id === selectedBinId)
  const availableBins = bins.filter(b => b.warehouse_id === selectedWarehouseId)

  // Filter out current warehouse
  const availableWarehouses = warehouses.filter(w => w.id !== transferModal.sourceWarehouseId)

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="swap-horizontal" size={24} color={APP_COLORS.primary} />
              <Text style={styles.headerTitle}>Transfer Item</Text>
            </View>
            <TouchableOpacity onPress={handleClose} disabled={loading}>
              <Ionicons name="close" size={24} color={APP_COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressStep}>
              <View
                style={[
                  styles.progressDot,
                  (step === 'warehouse' ||
                    step === 'bin' ||
                    step === 'quantity' ||
                    step === 'confirm') &&
                    styles.progressDotActive,
                ]}
              />
              <Text style={styles.progressLabel}>Warehouse</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <View
                style={[
                  styles.progressDot,
                  (step === 'bin' || step === 'quantity' || step === 'confirm') &&
                    styles.progressDotActive,
                ]}
              />
              <Text style={styles.progressLabel}>Bin</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <View
                style={[
                  styles.progressDot,
                  (step === 'quantity' || step === 'confirm') && styles.progressDotActive,
                ]}
              />
              <Text style={styles.progressLabel}>Quantity</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <View style={[styles.progressDot, step === 'confirm' && styles.progressDotActive]} />
              <Text style={styles.progressLabel}>Confirm</Text>
            </View>
          </View>

          {/* Item Info */}
          {transferModal.item && (
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{transferModal.item.product_name}</Text>
              <Text style={styles.itemDetails}>
                Available: {transferModal.item.quantity} {transferModal.item.unit}
              </Text>
              {transferModal.item.warehouse_name && (
                <Text style={styles.itemDetails}>
                  Current Location: {transferModal.item.warehouse_name}
                  {transferModal.item.bin_number && ` - Bin ${transferModal.item.bin_number}`}
                </Text>
              )}
            </View>
          )}

          {/* Content */}
          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {step === 'warehouse' && (
              <View>
                <Text style={styles.stepTitle}>Select Destination Warehouse</Text>
                {availableWarehouses.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No other warehouses available</Text>
                  </View>
                ) : (
                  availableWarehouses.map(warehouse => (
                    <TouchableOpacity
                      key={warehouse.id}
                      style={[
                        styles.optionCard,
                        selectedWarehouseId === warehouse.id && styles.optionCardSelected,
                      ]}
                      onPress={() => handleWarehouseSelect(warehouse.id)}
                    >
                      <View style={styles.optionLeft}>
                        <Ionicons
                          name="business"
                          size={20}
                          color={
                            selectedWarehouseId === warehouse.id
                              ? APP_COLORS.primary
                              : APP_COLORS.textSecondary
                          }
                        />
                        <View style={styles.optionInfo}>
                          <Text style={styles.optionName}>{warehouse.name}</Text>
                          {warehouse.location && (
                            <Text style={styles.optionMeta}>{warehouse.location}</Text>
                          )}
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textSecondary} />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {step === 'bin' && (
              <View>
                <Text style={styles.stepTitle}>Select Destination Bin (Optional)</Text>
                <TouchableOpacity
                  style={[styles.optionCard, selectedBinId === null && styles.optionCardSelected]}
                  onPress={() => handleBinSelect(null)}
                >
                  <View style={styles.optionLeft}>
                    <Ionicons
                      name="apps"
                      size={20}
                      color={selectedBinId === null ? APP_COLORS.primary : APP_COLORS.textSecondary}
                    />
                    <Text style={styles.optionName}>No specific bin</Text>
                  </View>
                  {selectedBinId === null && (
                    <Ionicons name="checkmark-circle" size={20} color={APP_COLORS.primary} />
                  )}
                </TouchableOpacity>

                {availableBins.map(bin => (
                  <TouchableOpacity
                    key={bin.id}
                    style={[
                      styles.optionCard,
                      selectedBinId === bin.id && styles.optionCardSelected,
                    ]}
                    onPress={() => handleBinSelect(bin.id)}
                  >
                    <View style={styles.optionLeft}>
                      <Ionicons
                        name="cube"
                        size={20}
                        color={
                          selectedBinId === bin.id ? APP_COLORS.primary : APP_COLORS.textSecondary
                        }
                      />
                      <View style={styles.optionInfo}>
                        <Text style={styles.optionName}>Bin {bin.bin_number}</Text>
                        {bin.capacity && (
                          <Text style={styles.optionMeta}>Capacity: {bin.capacity}</Text>
                        )}
                      </View>
                    </View>
                    {selectedBinId === bin.id && (
                      <Ionicons name="checkmark-circle" size={20} color={APP_COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))}

                <TouchableOpacity style={styles.backButton} onPress={() => setStep('warehouse')}>
                  <Ionicons name="arrow-back" size={20} color={APP_COLORS.primary} />
                  <Text style={styles.backButtonText}>Back to Warehouse</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'quantity' && (
              <View>
                <Text style={styles.stepTitle}>Enter Transfer Quantity</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder={`Max: ${transferModal.item?.quantity || 0}`}
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholderTextColor={APP_COLORS.textSecondary}
                  />
                  <Text style={styles.inputUnit}>{transferModal.item?.unit || ''}</Text>
                </View>

                <Text style={styles.stepTitle}>Notes (Optional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Add transfer notes..."
                  multiline
                  numberOfLines={3}
                  value={notes}
                  onChangeText={setNotes}
                  placeholderTextColor={APP_COLORS.textSecondary}
                />

                <TouchableOpacity style={styles.backButton} onPress={() => setStep('bin')}>
                  <Ionicons name="arrow-back" size={20} color={APP_COLORS.primary} />
                  <Text style={styles.backButtonText}>Back to Bin Selection</Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'confirm' && (
              <View>
                <Text style={styles.stepTitle}>Confirm Transfer</Text>
                <View style={styles.confirmCard}>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Item:</Text>
                    <Text style={styles.confirmValue}>{transferModal.item?.product_name}</Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>Quantity:</Text>
                    <Text style={styles.confirmValue}>
                      {quantity} {transferModal.item?.unit}
                    </Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>From:</Text>
                    <Text style={styles.confirmValue}>
                      {transferModal.item?.warehouse_name || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmLabel}>To:</Text>
                    <Text style={styles.confirmValue}>{selectedWarehouse?.name || 'N/A'}</Text>
                  </View>
                  {selectedBin && (
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>Bin:</Text>
                      <Text style={styles.confirmValue}>Bin {selectedBin.bin_number}</Text>
                    </View>
                  )}
                  {notes && (
                    <View style={styles.confirmRow}>
                      <Text style={styles.confirmLabel}>Notes:</Text>
                      <Text style={styles.confirmValue}>{notes}</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity style={styles.backButton} onPress={() => setStep('quantity')}>
                  <Ionicons name="arrow-back" size={20} color={APP_COLORS.primary} />
                  <Text style={styles.backButtonText}>Back to Quantity</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {step === 'warehouse' && (
              <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
            {step === 'bin' && (
              <TouchableOpacity style={styles.primaryButton} onPress={() => setStep('quantity')}>
                <Text style={styles.primaryButtonText}>Next</Text>
              </TouchableOpacity>
            )}
            {step === 'quantity' && (
              <TouchableOpacity style={styles.primaryButton} onPress={handleQuantityNext}>
                <Text style={styles.primaryButtonText}>Next</Text>
              </TouchableOpacity>
            )}
            {step === 'confirm' && (
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                onPress={handleConfirmTransfer}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Text style={styles.primaryButtonText}>Confirm Transfer</Text>
                    <Ionicons name="checkmark" size={20} color="white" />
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: APP_COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  progressStep: {
    alignItems: 'center',
    gap: 4,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e5e7eb',
  },
  progressDotActive: {
    backgroundColor: APP_COLORS.primary,
  },
  progressLabel: {
    fontSize: 10,
    color: APP_COLORS.textSecondary,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 4,
  },
  itemInfo: {
    padding: 16,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    borderColor: APP_COLORS.primary,
    backgroundColor: `${APP_COLORS.primary}10`,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 15,
    fontWeight: '500',
    color: APP_COLORS.text,
  },
  optionMeta: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: APP_COLORS.text,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  inputUnit: {
    position: 'absolute',
    right: 16,
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    fontWeight: '500',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  confirmCard: {
    backgroundColor: APP_COLORS.background,
    borderRadius: 12,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  confirmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmLabel: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    fontWeight: '500',
  },
  confirmValue: {
    fontSize: 14,
    color: APP_COLORS.text,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 15,
    color: APP_COLORS.primary,
    fontWeight: '500',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  primaryButton: {
    backgroundColor: APP_COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: APP_COLORS.textSecondary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.textSecondary,
  },
})
