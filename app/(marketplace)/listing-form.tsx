import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useMarketplaceStore } from '../../src/store/marketplace-store'
import { useMarketplacePermissions } from '../../src/hooks/useMarketplacePermissions'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'
import {
  ProductCategoryEnum,
  CreateListingRequest,
  UpdateListingRequest,
} from '../../src/types/marketplace'
import {
  getCategoryLabel,
  getCategoryIcon,
  getCategoryColor,
} from '../../src/utils/marketplace-helpers'

const CATEGORIES = Object.values(ProductCategoryEnum)
const QUALITY_GRADES = ['A', 'B', 'C']
const COMMON_UNITS = ['kg', 'g', 'tons', 'dozen', 'units', 'litres', 'boxes', 'crates']

interface FormData {
  title: string
  description: string
  category: ProductCategoryEnum
  available_quantity: string
  unit: string
  price_per_unit: string
  currency: string
  minimum_order_quantity: string
  quality_grade: string
  province: string
  city: string
  publish_immediately: boolean
}

const initialFormData: FormData = {
  title: '',
  description: '',
  category: ProductCategoryEnum.HARVEST,
  available_quantity: '',
  unit: 'kg',
  price_per_unit: '',
  currency: 'ZAR',
  minimum_order_quantity: '',
  quality_grade: '',
  province: '',
  city: '',
  publish_immediately: false,
}

export default function ListingFormScreen() {
  const params = useLocalSearchParams<{ id?: string }>()
  const listingId = params.id ? parseInt(params.id, 10) : null
  const isEditMode = listingId !== null

  const { permissions, isFarmer } = useMarketplacePermissions()
  const {
    currentListing,
    detailLoading,
    fetchListingDetail,
    createListing,
    updateListing,
    clearCurrentListing,
    fetchProvinces,
    provinces,
  } = useMarketplaceStore()

  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({})
  const [saving, setSaving] = useState(false)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [showUnitPicker, setShowUnitPicker] = useState(false)
  const [showGradePicker, setShowGradePicker] = useState(false)
  const [showProvincePicker, setShowProvincePicker] = useState(false)

  useEffect(() => {
    fetchProvinces()

    if (isEditMode && listingId) {
      fetchListingDetail(listingId)
    }

    return () => {
      clearCurrentListing()
    }
  }, [listingId])

  useEffect(() => {
    if (isEditMode && currentListing) {
      setFormData({
        title: currentListing.title || '',
        description: currentListing.description || '',
        category: currentListing.category,
        available_quantity: currentListing.available_quantity?.toString() || '',
        unit: currentListing.unit || 'kg',
        price_per_unit: currentListing.price_per_unit?.toString() || '',
        currency: currentListing.currency || 'ZAR',
        minimum_order_quantity: currentListing.minimum_order_quantity?.toString() || '',
        quality_grade: currentListing.quality_grade || '',
        province: currentListing.province || '',
        city: currentListing.city || '',
        publish_immediately: false,
      })
    }
  }, [currentListing])

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    } else if (formData.title.length > 255) {
      newErrors.title = 'Title must be less than 255 characters'
    }

    if (!formData.available_quantity.trim()) {
      newErrors.available_quantity = 'Quantity is required'
    } else if (
      isNaN(parseFloat(formData.available_quantity)) ||
      parseFloat(formData.available_quantity) < 0
    ) {
      newErrors.available_quantity = 'Enter a valid quantity'
    }

    if (!formData.unit.trim()) {
      newErrors.unit = 'Unit is required'
    }

    if (!formData.price_per_unit.trim()) {
      newErrors.price_per_unit = 'Price is required'
    } else if (
      isNaN(parseFloat(formData.price_per_unit)) ||
      parseFloat(formData.price_per_unit) < 0
    ) {
      newErrors.price_per_unit = 'Enter a valid price'
    }

    if (formData.minimum_order_quantity && isNaN(parseFloat(formData.minimum_order_quantity))) {
      newErrors.minimum_order_quantity = 'Enter a valid minimum order quantity'
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
      if (isEditMode && listingId) {
        const updateData: UpdateListingRequest = {
          title: formData.title,
          description: formData.description || undefined,
          category: formData.category,
          available_quantity: parseFloat(formData.available_quantity),
          unit: formData.unit,
          price_per_unit: parseFloat(formData.price_per_unit),
          currency: formData.currency,
          minimum_order_quantity: formData.minimum_order_quantity
            ? parseFloat(formData.minimum_order_quantity)
            : undefined,
          quality_grade: formData.quality_grade || undefined,
          province: formData.province || undefined,
          city: formData.city || undefined,
        }

        const result = await updateListing(listingId, updateData)
        if (result) {
          Alert.alert('Success', 'Listing updated successfully')
          router.back()
        } else {
          Alert.alert('Error', 'Failed to update listing')
        }
      } else {
        const createData: CreateListingRequest = {
          title: formData.title,
          description: formData.description || undefined,
          category: formData.category,
          available_quantity: parseFloat(formData.available_quantity),
          unit: formData.unit,
          price_per_unit: parseFloat(formData.price_per_unit),
          currency: formData.currency,
          minimum_order_quantity: formData.minimum_order_quantity
            ? parseFloat(formData.minimum_order_quantity)
            : undefined,
          quality_grade: formData.quality_grade || undefined,
          province: formData.province || undefined,
          city: formData.city || undefined,
          publish_immediately: formData.publish_immediately,
        }

        const result = await createListing(createData)
        if (result) {
          Alert.alert(
            'Success',
            formData.publish_immediately
              ? 'Listing created and published!'
              : 'Listing saved as draft',
            [{ text: 'OK', onPress: () => router.back() }]
          )
        } else {
          Alert.alert('Error', 'Failed to create listing')
        }
      }
    } catch (_error) {
      Alert.alert('Error', 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  if (!isFarmer || !permissions.canCreateListings) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="lock-closed" size={64} color={APP_COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Access Denied</Text>
          <Text style={styles.emptyText}>Only farmers can create listings.</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (isEditMode && detailLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading listing...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="close" size={24} color={APP_COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit Listing' : 'Create Listing'}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              placeholder="e.g., Fresh Organic Tomatoes"
              placeholderTextColor={APP_COLORS.textSecondary}
              value={formData.title}
              onChangeText={v => updateField('title', v)}
              maxLength={255}
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          {/* Description */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your product..."
              placeholderTextColor={APP_COLORS.textSecondary}
              value={formData.description}
              onChangeText={v => updateField('description', v)}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Category */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Category *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowCategoryPicker(!showCategoryPicker)}
            >
              <View style={styles.pickerButtonContent}>
                <Ionicons
                  name={getCategoryIcon(formData.category)}
                  size={20}
                  color={getCategoryColor(formData.category)}
                />
                <Text style={styles.pickerButtonText}>{getCategoryLabel(formData.category)}</Text>
              </View>
              <Ionicons
                name={showCategoryPicker ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={APP_COLORS.textSecondary}
              />
            </TouchableOpacity>
            {showCategoryPicker && (
              <View style={styles.optionsContainer}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.option, formData.category === cat && styles.optionSelected]}
                    onPress={() => {
                      updateField('category', cat)
                      setShowCategoryPicker(false)
                    }}
                  >
                    <Ionicons
                      name={getCategoryIcon(cat)}
                      size={18}
                      color={
                        formData.category === cat ? APP_COLORS.textOnPrimary : getCategoryColor(cat)
                      }
                    />
                    <Text
                      style={[
                        styles.optionText,
                        formData.category === cat && styles.optionTextSelected,
                      ]}
                    >
                      {getCategoryLabel(cat)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Quantity and Unit */}
          <View style={styles.row}>
            <View style={[styles.fieldGroup, { flex: 1 }]}>
              <Text style={styles.label}>Quantity *</Text>
              <TextInput
                style={[styles.input, errors.available_quantity && styles.inputError]}
                placeholder="100"
                placeholderTextColor={APP_COLORS.textSecondary}
                value={formData.available_quantity}
                onChangeText={v => updateField('available_quantity', v)}
                keyboardType="decimal-pad"
              />
              {errors.available_quantity && (
                <Text style={styles.errorText}>{errors.available_quantity}</Text>
              )}
            </View>

            <View style={[styles.fieldGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.label}>Unit *</Text>
              <TouchableOpacity
                style={[styles.pickerButton, errors.unit && styles.inputError]}
                onPress={() => setShowUnitPicker(!showUnitPicker)}
              >
                <Text style={styles.pickerButtonText}>{formData.unit}</Text>
                <Ionicons name="chevron-down" size={20} color={APP_COLORS.textSecondary} />
              </TouchableOpacity>
              {showUnitPicker && (
                <View style={styles.optionsContainer}>
                  {COMMON_UNITS.map(unit => (
                    <TouchableOpacity
                      key={unit}
                      style={[styles.option, formData.unit === unit && styles.optionSelected]}
                      onPress={() => {
                        updateField('unit', unit)
                        setShowUnitPicker(false)
                      }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          formData.unit === unit && styles.optionTextSelected,
                        ]}
                      >
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Price */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Price per Unit (ZAR) *</Text>
            <View style={styles.priceInputRow}>
              <Text style={styles.currencyPrefix}>R</Text>
              <TextInput
                style={[
                  styles.input,
                  styles.priceInput,
                  errors.price_per_unit && styles.inputError,
                ]}
                placeholder="25.00"
                placeholderTextColor={APP_COLORS.textSecondary}
                value={formData.price_per_unit}
                onChangeText={v => updateField('price_per_unit', v)}
                keyboardType="decimal-pad"
              />
            </View>
            {errors.price_per_unit && <Text style={styles.errorText}>{errors.price_per_unit}</Text>}
          </View>

          {/* Minimum Order Quantity */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Minimum Order Quantity</Text>
            <TextInput
              style={[styles.input, errors.minimum_order_quantity && styles.inputError]}
              placeholder="Optional"
              placeholderTextColor={APP_COLORS.textSecondary}
              value={formData.minimum_order_quantity}
              onChangeText={v => updateField('minimum_order_quantity', v)}
              keyboardType="decimal-pad"
            />
            {errors.minimum_order_quantity && (
              <Text style={styles.errorText}>{errors.minimum_order_quantity}</Text>
            )}
          </View>

          {/* Quality Grade */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Quality Grade</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowGradePicker(!showGradePicker)}
            >
              <Text style={styles.pickerButtonText}>
                {formData.quality_grade
                  ? `Grade ${formData.quality_grade}`
                  : 'Select grade (optional)'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
            {showGradePicker && (
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    updateField('quality_grade', '')
                    setShowGradePicker(false)
                  }}
                >
                  <Text style={styles.optionText}>No grade</Text>
                </TouchableOpacity>
                {QUALITY_GRADES.map(grade => (
                  <TouchableOpacity
                    key={grade}
                    style={[
                      styles.option,
                      formData.quality_grade === grade && styles.optionSelected,
                    ]}
                    onPress={() => {
                      updateField('quality_grade', grade)
                      setShowGradePicker(false)
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        formData.quality_grade === grade && styles.optionTextSelected,
                      ]}
                    >
                      Grade {grade}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Province */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Province</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowProvincePicker(!showProvincePicker)}
            >
              <Text style={styles.pickerButtonText}>
                {formData.province || 'Select province (optional)'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
            {showProvincePicker && (
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    updateField('province', '')
                    setShowProvincePicker(false)
                  }}
                >
                  <Text style={styles.optionText}>Use profile default</Text>
                </TouchableOpacity>
                {provinces.map(prov => (
                  <TouchableOpacity
                    key={prov}
                    style={[styles.option, formData.province === prov && styles.optionSelected]}
                    onPress={() => {
                      updateField('province', prov)
                      setShowProvincePicker(false)
                    }}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        formData.province === prov && styles.optionTextSelected,
                      ]}
                    >
                      {prov}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* City */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional"
              placeholderTextColor={APP_COLORS.textSecondary}
              value={formData.city}
              onChangeText={v => updateField('city', v)}
            />
          </View>

          {/* Publish Immediately Toggle (only for new listings) */}
          {!isEditMode && (
            <View style={styles.switchRow}>
              <View style={styles.switchLabel}>
                <Ionicons name="rocket" size={20} color={APP_COLORS.primary} />
                <View style={styles.switchTextContainer}>
                  <Text style={styles.switchTitle}>Publish Immediately</Text>
                  <Text style={styles.switchDescription}>Otherwise, saves as draft for review</Text>
                </View>
              </View>
              <Switch
                value={formData.publish_immediately}
                onValueChange={v => updateField('publish_immediately', v)}
                trackColor={{ false: APP_COLORS.border, true: APP_COLORS.primary + '60' }}
                thumbColor={
                  formData.publish_immediately ? APP_COLORS.primary : APP_COLORS.textSecondary
                }
              />
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
              <ActivityIndicator color={APP_COLORS.textOnPrimary} />
            ) : (
              <>
                <Ionicons
                  name={
                    isEditMode ? 'checkmark' : formData.publish_immediately ? 'rocket' : 'document'
                  }
                  size={20}
                  color={APP_COLORS.textOnPrimary}
                />
                <Text style={styles.submitButtonText}>
                  {isEditMode
                    ? 'Update Listing'
                    : formData.publish_immediately
                      ? 'Create & Publish'
                      : 'Save as Draft'}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: APP_COLORS.textSecondary,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
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
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: APP_COLORS.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: APP_COLORS.text,
    borderWidth: 1,
    borderColor: APP_COLORS.inputBorder,
    fontFamily: FONTS.regular,
  },
  inputError: {
    borderColor: APP_COLORS.error,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  errorText: {
    fontSize: 12,
    color: APP_COLORS.error,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
  },
  pickerButton: {
    backgroundColor: APP_COLORS.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: APP_COLORS.inputBorder,
  },
  pickerButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerButtonText: {
    fontSize: 16,
    color: APP_COLORS.text,
    fontFamily: FONTS.regular,
  },
  optionsContainer: {
    backgroundColor: APP_COLORS.surfaceElevated,
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  optionSelected: {
    backgroundColor: APP_COLORS.primary,
  },
  optionText: {
    fontSize: 15,
    color: APP_COLORS.text,
  },
  optionTextSelected: {
    color: APP_COLORS.textOnPrimary,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyPrefix: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  switchLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  switchTextContainer: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 15,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
  },
  switchDescription: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surfaceElevated,
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
    opacity: 0.7,
  },
  submitButtonText: {
    color: APP_COLORS.textOnPrimary,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
})
