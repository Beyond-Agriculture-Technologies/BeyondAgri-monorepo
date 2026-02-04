import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useInventoryStore } from '../../src/store/inventory-store'
import { useInventoryPermissions } from '../../src/hooks/useInventoryPermissions'
import { APP_COLORS, INVENTORY_DEFAULTS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'
import { InventoryStatusEnum, InventoryItemCreate } from '../../src/types/inventory'

// Validation helper functions
function isValidDate(dateString: string): boolean {
  if (!dateString) return true // Optional field
  const date = new Date(dateString)
  return date instanceof Date && !isNaN(date.getTime()) && date.getFullYear() > 1900
}

function isValidNumber(value: string | number | undefined): boolean {
  if (value === undefined || value === '') return true // Optional
  const num = typeof value === 'string' ? parseFloat(value) : value
  return !isNaN(num) && num >= 0
}

function isValidPositiveNumber(value: string | number): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return !isNaN(num) && num > 0
}

export default function ItemFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>()
  const { permissions } = useInventoryPermissions()
  const {
    currentItem,
    itemsLoading,
    inventoryTypes,
    warehouses,
    fetchItemById,
    fetchInventoryTypes,
    fetchWarehouses,
    createItem,
    updateItem,
  } = useInventoryStore()

  const isEditMode = !!id
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    item_name: '',
    description: '',
    status: InventoryStatusEnum.AVAILABLE,
    current_quantity: '',
    unit: 'kg',
    cost_per_unit: '',
    currency: INVENTORY_DEFAULTS.CURRENCY as string,
    minimum_quantity: '',
    batch_number: '',
    acquisition_date: '',
    expiry_date: '',
    inventory_type_id: '',
    warehouse_id: '',
    bin_id: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (permissions.canManageWarehouses) {
      fetchInventoryTypes()
      fetchWarehouses()
    }

    if (isEditMode && id) {
      loadItem()
    }
  }, [id])

  const loadItem = async () => {
    await fetchItemById(Number(id))
    if (currentItem) {
      setFormData({
        item_name: currentItem.item_name,
        description: currentItem.description || '',
        status: currentItem.status,
        current_quantity: currentItem.current_quantity.toString(),
        unit: currentItem.unit,
        cost_per_unit: currentItem.cost_per_unit?.toString() || '',
        currency: currentItem.currency,
        minimum_quantity: currentItem.minimum_quantity?.toString() || '',
        batch_number: currentItem.batch_number || '',
        acquisition_date: currentItem.acquisition_date || '',
        expiry_date: currentItem.expiry_date || '',
        inventory_type_id: currentItem.inventory_type_id?.toString() || '',
        warehouse_id: currentItem.warehouse_id?.toString() || '',
        bin_id: currentItem.bin_id?.toString() || '',
      })
    }
  }

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Required field validation
    if (!formData.item_name.trim()) {
      newErrors.item_name = 'Item name is required'
    }

    if (!formData.current_quantity || !isValidPositiveNumber(formData.current_quantity)) {
      newErrors.current_quantity = 'Quantity must be a positive number'
    }

    if (!formData.unit.trim()) {
      newErrors.unit = 'Unit of measure is required'
    }

    if (!formData.inventory_type_id) {
      newErrors.inventory_type_id = 'Inventory type is required'
    }

    // Optional numeric field validation
    if (formData.cost_per_unit && !isValidNumber(formData.cost_per_unit)) {
      newErrors.cost_per_unit = 'Cost per unit must be a valid number'
    }

    if (formData.minimum_quantity && !isValidNumber(formData.minimum_quantity)) {
      newErrors.minimum_quantity = 'Minimum quantity must be a valid number'
    }

    // Date validation
    if (formData.acquisition_date && !isValidDate(formData.acquisition_date)) {
      newErrors.acquisition_date = 'Invalid acquisition date format'
    }

    if (formData.expiry_date && !isValidDate(formData.expiry_date)) {
      newErrors.expiry_date = 'Invalid expiry date format'
    }

    // Logical validation
    if (
      formData.expiry_date &&
      formData.acquisition_date &&
      isValidDate(formData.expiry_date) &&
      isValidDate(formData.acquisition_date)
    ) {
      const expiryDate = new Date(formData.expiry_date)
      const acquisitionDate = new Date(formData.acquisition_date)
      if (expiryDate <= acquisitionDate) {
        newErrors.expiry_date = 'Expiry date must be after acquisition date'
      }
    }

    if (
      formData.minimum_quantity &&
      formData.current_quantity &&
      isValidNumber(formData.minimum_quantity) &&
      isValidPositiveNumber(formData.current_quantity)
    ) {
      const minQty = Number(formData.minimum_quantity)
      const currentQty = Number(formData.current_quantity)
      if (minQty > currentQty) {
        newErrors.minimum_quantity = 'Minimum quantity cannot exceed current quantity'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors in the form')
      return
    }

    setSaving(true)

    try {
      const itemData: InventoryItemCreate = {
        item_name: formData.item_name.trim(),
        description: formData.description.trim() || undefined,
        status: formData.status,
        current_quantity: Number(formData.current_quantity),
        unit: formData.unit.trim(),
        cost_per_unit: Number(formData.cost_per_unit),
        currency: formData.currency,
        minimum_quantity: formData.minimum_quantity ? Number(formData.minimum_quantity) : undefined,
        batch_number: formData.batch_number.trim() || undefined,
        acquisition_date: formData.acquisition_date || undefined,
        expiry_date: formData.expiry_date || undefined,
        inventory_type_id: Number(formData.inventory_type_id),
        warehouse_id: formData.warehouse_id ? Number(formData.warehouse_id) : undefined,
        bin_id: formData.bin_id ? Number(formData.bin_id) : undefined,
      }

      let result
      if (isEditMode) {
        result = await updateItem(Number(id), itemData)
      } else {
        result = await createItem(itemData)
      }

      setSaving(false)

      if (result) {
        Alert.alert('Success', `Item ${isEditMode ? 'updated' : 'created'} successfully`, [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ])
      } else {
        Alert.alert(
          'Error',
          `Failed to ${isEditMode ? 'update' : 'create'} item. Please try again.`
        )
      }
    } catch {
      setSaving(false)
      Alert.alert('Error', 'An unexpected error occurred')
    }
  }

  if (itemsLoading && isEditMode) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: isEditMode ? 'Edit Item' : 'Add Item',
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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: isEditMode ? 'Edit Item' : 'Add Item',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Item Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.item_name && styles.inputError]}
                value={formData.item_name}
                onChangeText={value => updateField('item_name', value)}
                placeholder="e.g., Fresh Tomatoes"
                placeholderTextColor={APP_COLORS.placeholder}
              />
              {errors.item_name && <Text style={styles.errorText}>{errors.item_name}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={value => updateField('description', value)}
                placeholder="Additional details about the item..."
                placeholderTextColor={APP_COLORS.placeholder}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Inventory Type <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, errors.inventory_type_id && styles.inputError]}
                value={formData.inventory_type_id}
                onChangeText={value => updateField('inventory_type_id', value)}
                placeholder="Inventory Type ID"
                keyboardType="numeric"
                placeholderTextColor={APP_COLORS.placeholder}
              />
              {errors.inventory_type_id && (
                <Text style={styles.errorText}>{errors.inventory_type_id}</Text>
              )}
              <Text style={styles.helpText}>
                {inventoryTypes.length > 0
                  ? `${inventoryTypes.length} types available`
                  : 'No inventory types configured'}
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Status <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.chipContainer}>
                {Object.values(InventoryStatusEnum).map(status => (
                  <TouchableOpacity
                    key={status}
                    style={[styles.chip, formData.status === status && styles.chipSelected]}
                    onPress={() => updateField('status', status)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        formData.status === status && styles.chipTextSelected,
                      ]}
                    >
                      {status}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Quantity & Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity & Pricing</Text>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex]}>
                <Text style={styles.label}>
                  Quantity <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.current_quantity && styles.inputError]}
                  value={formData.current_quantity}
                  onChangeText={value => updateField('current_quantity', value)}
                  placeholder="0"
                  keyboardType="numeric"
                  placeholderTextColor={APP_COLORS.placeholder}
                />
                {errors.current_quantity && (
                  <Text style={styles.errorText}>{errors.current_quantity}</Text>
                )}
              </View>

              <View style={[styles.inputGroup, styles.flex]}>
                <Text style={styles.label}>
                  Unit <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.unit && styles.inputError]}
                  value={formData.unit}
                  onChangeText={value => updateField('unit', value)}
                  placeholder="kg"
                  placeholderTextColor={APP_COLORS.placeholder}
                />
                {errors.unit && <Text style={styles.errorText}>{errors.unit}</Text>}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex]}>
                <Text style={styles.label}>
                  Unit Price <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={[styles.input, errors.cost_per_unit && styles.inputError]}
                  value={formData.cost_per_unit}
                  onChangeText={value => updateField('cost_per_unit', value)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  placeholderTextColor={APP_COLORS.placeholder}
                />
                {errors.cost_per_unit && (
                  <Text style={styles.errorText}>{errors.cost_per_unit}</Text>
                )}
              </View>

              <View style={[styles.inputGroup, styles.flex]}>
                <Text style={styles.label}>Currency</Text>
                <TextInput
                  style={styles.input}
                  value={formData.currency}
                  onChangeText={value => updateField('currency', value)}
                  placeholder={INVENTORY_DEFAULTS.CURRENCY}
                  placeholderTextColor={APP_COLORS.placeholder}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Minimum Stock Level</Text>
              <TextInput
                style={styles.input}
                value={formData.minimum_quantity}
                onChangeText={value => updateField('minimum_quantity', value)}
                placeholder="Optional"
                keyboardType="numeric"
                placeholderTextColor={APP_COLORS.placeholder}
              />
              <Text style={styles.helpText}>Alert when stock falls below this level</Text>
            </View>
          </View>

          {/* Batch Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Batch Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Batch Number</Text>
              <TextInput
                style={styles.input}
                value={formData.batch_number}
                onChangeText={value => updateField('batch_number', value)}
                placeholder="e.g., BATCH-2025-001"
                placeholderTextColor={APP_COLORS.placeholder}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Acquisition Date</Text>
              <TextInput
                style={styles.input}
                value={formData.acquisition_date}
                onChangeText={value => updateField('acquisition_date', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={APP_COLORS.placeholder}
              />
              <Text style={styles.helpText}>Format: YYYY-MM-DD</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Expiry Date</Text>
              <TextInput
                style={styles.input}
                value={formData.expiry_date}
                onChangeText={value => updateField('expiry_date', value)}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={APP_COLORS.placeholder}
              />
              <Text style={styles.helpText}>Format: YYYY-MM-DD</Text>
            </View>
          </View>

          {/* Location (Wholesalers only) */}
          {permissions.canManageWarehouses && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Location</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Warehouse</Text>
                <TextInput
                  style={styles.input}
                  value={formData.warehouse_id}
                  onChangeText={value => updateField('warehouse_id', value)}
                  placeholder="Warehouse ID"
                  keyboardType="numeric"
                  placeholderTextColor={APP_COLORS.placeholder}
                />
                <Text style={styles.helpText}>
                  {warehouses.length > 0
                    ? `${warehouses.length} warehouses available`
                    : 'No warehouses configured'}
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Storage Bin</Text>
                <TextInput
                  style={styles.input}
                  value={formData.bin_id}
                  onChangeText={value => updateField('bin_id', value)}
                  placeholder="Bin ID"
                  keyboardType="numeric"
                  placeholderTextColor={APP_COLORS.placeholder}
                />
              </View>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color={APP_COLORS.textOnPrimary} />
            ) : (
              <>
                <Ionicons
                  name={isEditMode ? 'checkmark-circle' : 'add-circle'}
                  size={20}
                  color={APP_COLORS.textOnPrimary}
                />
                <Text style={styles.submitButtonText}>
                  {isEditMode ? 'Update Item' : 'Create Item'}
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
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontFamily: FONTS.medium,
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  required: {
    color: APP_COLORS.error,
  },
  input: {
    backgroundColor: APP_COLORS.inputBackground,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: APP_COLORS.text,
    borderWidth: 1,
    borderColor: APP_COLORS.inputBorder,
  },
  inputError: {
    borderColor: APP_COLORS.error,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 12,
  },
  errorText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: APP_COLORS.error,
    marginTop: 4,
  },
  helpText: {
    fontSize: 13,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
    marginTop: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: APP_COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  chipSelected: {
    backgroundColor: APP_COLORS.primary,
    borderColor: APP_COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: APP_COLORS.textSecondary,
    textTransform: 'capitalize',
  },
  chipTextSelected: {
    color: APP_COLORS.textOnPrimary,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  footer: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 0 : 16,
    backgroundColor: APP_COLORS.surfaceElevated,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.textOnPrimary,
  },
})
