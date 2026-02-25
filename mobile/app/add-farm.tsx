import React, { useState } from 'react'
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
import { router, Stack } from 'expo-router'
import { useAuthStore } from '../src/store/auth-store'
import { apiClient } from '../src/services/api'
import { AddressAutocomplete } from '../src/components/AddressAutocomplete'
import { GeocodeResponse } from '../src/types/geocoding'
import { APP_COLORS } from '../src/utils/constants'
import { FONTS } from '../src/theme'

export default function AddFarmScreen() {
  const user = useAuthStore(state => state.user)
  const setUser = useAuthStore(state => state.setUser)

  const isEditMode = !!user?.farm_name

  const [farmName, setFarmName] = useState(user?.farm_name || '')
  const [farmSize, setFarmSize] = useState(user?.farm_size || '')
  const [selectedAddress, setSelectedAddress] = useState<GeocodeResponse | null>(null)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!farmName.trim()) {
      newErrors.farmName = 'Farm name is required'
    }

    if (!selectedAddress && !user?.farm_address) {
      newErrors.address = 'Farm address is required'
    }

    if (farmSize && isNaN(Number(farmSize))) {
      newErrors.farmSize = 'Farm size must be a number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddressSelect = (address: GeocodeResponse) => {
    setSelectedAddress(address)
    if (errors.address) {
      setErrors(prev => {
        const next = { ...prev }
        delete next.address
        return next
      })
    }
  }

  const handleSave = async () => {
    if (!validate()) return

    setSaving(true)
    try {
      const updates: Record<string, unknown> = {
        farm_name: farmName.trim(),
      }

      if (farmSize.trim()) {
        updates.farm_size = farmSize.trim()
      }

      if (selectedAddress) {
        updates.farm_address = selectedAddress.formatted_address
        updates.farm_street = selectedAddress.street
        updates.farm_city = selectedAddress.city
        updates.farm_province = selectedAddress.province
        updates.farm_postal_code = selectedAddress.postal_code
        updates.farm_country = selectedAddress.country
        updates.farm_latitude = selectedAddress.latitude
        updates.farm_longitude = selectedAddress.longitude
        updates.farm_place_id = selectedAddress.place_id
      }

      const result = await apiClient.updateUserProfile(updates)

      if (result.success) {
        // Update the auth store with new farm data
        if (user) {
          setUser({
            ...user,
            farm_name: farmName.trim(),
            farm_size: farmSize.trim() || undefined,
            ...(selectedAddress
              ? {
                  farm_address: selectedAddress.formatted_address,
                  farm_street: selectedAddress.street,
                  farm_city: selectedAddress.city,
                  farm_province: selectedAddress.province,
                  farm_postal_code: selectedAddress.postal_code,
                  farm_country: selectedAddress.country,
                  farm_latitude: selectedAddress.latitude,
                  farm_longitude: selectedAddress.longitude,
                  farm_place_id: selectedAddress.place_id,
                }
              : {}),
          })
        }

        Alert.alert(
          isEditMode ? 'Farm Updated' : 'Farm Added',
          isEditMode
            ? 'Your farm details have been updated.'
            : 'Your farm has been added successfully.',
          [{ text: 'OK', onPress: () => router.back() }]
        )
      } else {
        Alert.alert('Error', result.message || 'Failed to save farm details. Please try again.')
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      Alert.alert('Error', message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: isEditMode ? 'Edit Farm' : 'Add Farm',
          headerStyle: { backgroundColor: APP_COLORS.surface },
          headerTintColor: APP_COLORS.text,
          headerTitleStyle: { fontFamily: FONTS.semiBold },
        }}
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Farm Name */}
            <View style={styles.field}>
              <Text style={styles.label}>Farm Name</Text>
              <TextInput
                style={[styles.input, errors.farmName && styles.inputError]}
                value={farmName}
                onChangeText={text => {
                  setFarmName(text)
                  if (errors.farmName) {
                    setErrors(prev => {
                      const next = { ...prev }
                      delete next.farmName
                      return next
                    })
                  }
                }}
                placeholder="e.g. Green Acres Farm"
                placeholderTextColor={APP_COLORS.placeholder}
              />
              {errors.farmName && <Text style={styles.errorText}>{errors.farmName}</Text>}
            </View>

            {/* Farm Address */}
            <View style={styles.field}>
              <AddressAutocomplete
                label="Farm Address"
                placeholder="Search for your farm address"
                initialValue={user?.farm_address || ''}
                onAddressSelect={handleAddressSelect}
              />
              {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
            </View>

            {selectedAddress && (
              <View style={styles.addressPreview}>
                <Ionicons name="location" size={16} color={APP_COLORS.primary} />
                <View style={styles.addressDetails}>
                  <Text style={styles.addressText}>{selectedAddress.formatted_address}</Text>
                  <Text style={styles.addressCoords}>
                    {selectedAddress.latitude.toFixed(4)}, {selectedAddress.longitude.toFixed(4)}
                  </Text>
                </View>
              </View>
            )}

            {/* Farm Size */}
            <View style={styles.field}>
              <Text style={styles.label}>Farm Size (hectares)</Text>
              <TextInput
                style={[styles.input, errors.farmSize && styles.inputError]}
                value={farmSize}
                onChangeText={text => {
                  setFarmSize(text)
                  if (errors.farmSize) {
                    setErrors(prev => {
                      const next = { ...prev }
                      delete next.farmSize
                      return next
                    })
                  }
                }}
                placeholder="e.g. 10"
                placeholderTextColor={APP_COLORS.placeholder}
                keyboardType="decimal-pad"
              />
              {errors.farmSize && <Text style={styles.errorText}>{errors.farmSize}</Text>}
            </View>
          </ScrollView>

          {/* Save Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={APP_COLORS.textOnPrimary} size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={20} color={APP_COLORS.textOnPrimary} />
                  <Text style={styles.saveButtonText}>
                    {isEditMode ? 'Update Farm' : 'Add Farm'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
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
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: APP_COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: FONTS.regular,
    backgroundColor: APP_COLORS.inputBackground,
    color: APP_COLORS.text,
  },
  inputError: {
    borderColor: APP_COLORS.error,
  },
  errorText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: APP_COLORS.error,
    marginTop: 4,
  },
  addressPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: APP_COLORS.primaryDim,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  addressDetails: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: APP_COLORS.text,
  },
  addressCoords: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surface,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.textOnPrimary,
  },
})
