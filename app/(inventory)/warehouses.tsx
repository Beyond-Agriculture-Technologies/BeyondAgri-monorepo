import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Stack } from 'expo-router'
import { useInventoryStore } from '../../src/store/inventory-store'
import { useAppStore } from '../../src/store/app-store'
import { useInventoryPermissions } from '../../src/hooks/useInventoryPermissions'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'
import { WarehouseResponse, WarehouseCreate } from '../../src/types/inventory'

export default function WarehousesScreen() {
  const { isOnline } = useAppStore()
  const { permissions } = useInventoryPermissions()
  const {
    warehouses,
    warehousesLoading,
    warehousesError,
    fetchWarehouses,
    createWarehouse,
    updateWarehouse,
    deleteWarehouse,
  } = useInventoryStore()

  const [refreshing, setRefreshing] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseResponse | null>(null)
  const [formData, setFormData] = useState({
    warehouse_name: '',
    address: '',
    city: '',
    province: '',
    country: 'South Africa',
    storage_capacity: '',
    temperature_controlled: false,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOnline) {
      loadWarehouses()
    }
  }, [isOnline])

  const loadWarehouses = async () => {
    await fetchWarehouses()
  }

  const onRefresh = async () => {
    if (!isOnline) return
    setRefreshing(true)
    await loadWarehouses()
    setRefreshing(false)
  }

  const handleAdd = () => {
    setEditingWarehouse(null)
    setFormData({
      warehouse_name: '',
      address: '',
      city: '',
      province: '',
      country: 'South Africa',
      storage_capacity: '',
      temperature_controlled: false,
    })
    setShowModal(true)
  }

  const handleEdit = (warehouse: WarehouseResponse) => {
    setEditingWarehouse(warehouse)
    setFormData({
      warehouse_name: warehouse.warehouse_name,
      address: warehouse.address || '',
      city: warehouse.city || '',
      province: warehouse.province || '',
      country: warehouse.country,
      storage_capacity: warehouse.storage_capacity?.toString() || '',
      temperature_controlled: warehouse.temperature_controlled,
    })
    setShowModal(true)
  }

  const handleDelete = (warehouse: WarehouseResponse) => {
    Alert.alert(
      'Delete Warehouse',
      `Are you sure you want to delete "${warehouse.warehouse_name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteWarehouse(warehouse.id)
            if (success) {
              Alert.alert('Success', 'Warehouse deleted successfully')
            } else {
              Alert.alert('Error', 'Failed to delete warehouse')
            }
          },
        },
      ]
    )
  }

  const handleSubmit = async () => {
    if (!formData.warehouse_name.trim()) {
      Alert.alert('Validation Error', 'Warehouse name is required')
      return
    }

    setSaving(true)

    const data: WarehouseCreate = {
      warehouse_name: formData.warehouse_name.trim(),
      address: formData.address.trim() || undefined,
      city: formData.city.trim() || undefined,
      province: formData.province.trim() || undefined,
      country: formData.country,
      storage_capacity: formData.storage_capacity ? Number(formData.storage_capacity) : undefined,
      temperature_controlled: formData.temperature_controlled,
      is_active: true,
    }

    let success
    if (editingWarehouse) {
      success = await updateWarehouse(editingWarehouse.id, data)
    } else {
      success = await createWarehouse(data)
    }

    setSaving(false)

    if (success) {
      setShowModal(false)
      Alert.alert('Success', `Warehouse ${editingWarehouse ? 'updated' : 'created'} successfully`)
    } else {
      Alert.alert('Error', `Failed to ${editingWarehouse ? 'update' : 'create'} warehouse`)
    }
  }

  const renderWarehouse = ({ item }: { item: WarehouseResponse }) => {
    const location = [item.city, item.province].filter(Boolean).join(', ')

    return (
      <View style={styles.warehouseCard}>
        <View style={styles.warehouseHeader}>
          <View style={styles.warehouseIcon}>
            <Ionicons name="business" size={24} color={APP_COLORS.primary} />
          </View>
          <View style={styles.warehouseInfo}>
            <Text style={styles.warehouseName}>{item.warehouse_name}</Text>
            {location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={14} color={APP_COLORS.textSecondary} />
                <Text style={styles.locationText}>{location}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.warehouseDetails}>
          {item.storage_capacity && (
            <View style={styles.detailItem}>
              <Ionicons name="cube-outline" size={16} color={APP_COLORS.textSecondary} />
              <Text style={styles.detailText}>
                Capacity: {item.storage_capacity} {item.capacity_unit || ''}
              </Text>
            </View>
          )}
          <View style={styles.detailItem}>
            <Ionicons name="calendar-outline" size={16} color={APP_COLORS.textSecondary} />
            <Text style={styles.detailText}>
              Created: {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        {permissions.canManageWarehouses && (
          <View style={styles.warehouseActions}>
            <TouchableOpacity style={styles.actionButton} onPress={() => handleEdit(item)}>
              <Ionicons name="create-outline" size={18} color={APP_COLORS.primary} />
              <Text style={styles.actionButtonText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.deleteAction]}
              onPress={() => handleDelete(item)}
            >
              <Ionicons name="trash-outline" size={18} color={APP_COLORS.error} />
              <Text style={[styles.actionButtonText, styles.deleteText]}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    )
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="business-outline" size={64} color={APP_COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>No Warehouses</Text>
      <Text style={styles.emptyText}>Add your first warehouse to get started</Text>
      {permissions.canManageWarehouses && (
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Ionicons name="add" size={20} color={APP_COLORS.textOnPrimary} />
          <Text style={styles.addButtonText}>Add Warehouse</Text>
        </TouchableOpacity>
      )}
    </View>
  )

  if (warehousesLoading && warehouses.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Warehouses',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading warehouses...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: 'Warehouses',
          headerShown: true,
          headerBackTitle: 'Back',
          headerRight: () =>
            permissions.canManageWarehouses ? (
              <TouchableOpacity onPress={handleAdd} style={styles.headerButton}>
                <Ionicons name="add-circle" size={28} color={APP_COLORS.primary} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{warehouses.length}</Text>
          <Text style={styles.statLabel}>Total Warehouses</Text>
        </View>
      </View>

      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline" size={16} color="white" />
          <Text style={styles.offlineText}>Viewing cached data</Text>
        </View>
      )}

      {warehousesError && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color="white" />
          <Text style={styles.errorBannerText} numberOfLines={2}>
            {warehousesError}
          </Text>
          <TouchableOpacity onPress={loadWarehouses} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={warehouses}
        renderItem={renderWarehouse}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={APP_COLORS.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingWarehouse ? 'Edit Warehouse' : 'Add Warehouse'}
            </Text>
            <TouchableOpacity onPress={handleSubmit} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={APP_COLORS.primary} />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Warehouse Name <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={formData.warehouse_name}
                onChangeText={text => setFormData(prev => ({ ...prev, warehouse_name: text }))}
                placeholder="e.g., Main Storage Facility"
                placeholderTextColor={APP_COLORS.placeholder}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                value={formData.address}
                onChangeText={text => setFormData(prev => ({ ...prev, address: text }))}
                placeholder="e.g., 123 Farm Road"
                placeholderTextColor={APP_COLORS.placeholder}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={formData.city}
                onChangeText={text => setFormData(prev => ({ ...prev, city: text }))}
                placeholder="e.g., Cape Town"
                placeholderTextColor={APP_COLORS.placeholder}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Province</Text>
              <TextInput
                style={styles.input}
                value={formData.province}
                onChangeText={text => setFormData(prev => ({ ...prev, province: text }))}
                placeholder="e.g., Western Cape"
                placeholderTextColor={APP_COLORS.placeholder}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Storage Capacity (optional)</Text>
              <TextInput
                style={styles.input}
                value={formData.storage_capacity}
                onChangeText={text => setFormData(prev => ({ ...prev, storage_capacity: text }))}
                placeholder="e.g., 10000"
                keyboardType="numeric"
                placeholderTextColor={APP_COLORS.placeholder}
              />
              <Text style={styles.helpText}>Maximum storage capacity in kg</Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
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
    marginTop: 12,
    fontSize: 16,
    color: APP_COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },
  headerButton: {
    marginRight: 8,
  },
  statsContainer: {
    padding: 16,
  },
  statCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  statValue: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: APP_COLORS.primary,
  },
  statLabel: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginTop: 4,
    fontFamily: FONTS.regular,
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
    color: APP_COLORS.textOnPrimary,
    fontSize: 14,
    fontFamily: FONTS.medium,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: APP_COLORS.textOnPrimary,
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  warehouseCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  warehouseHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  warehouseIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: APP_COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  warehouseInfo: {
    flex: 1,
  },
  warehouseName: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  warehouseDetails: {
    gap: 8,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  warehouseActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: APP_COLORS.background,
    gap: 6,
  },
  deleteAction: {
    backgroundColor: APP_COLORS.errorDim,
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: APP_COLORS.primary,
  },
  deleteText: {
    color: APP_COLORS.error,
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
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  addButtonText: {
    color: APP_COLORS.textOnPrimary,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: APP_COLORS.surfaceElevated,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  cancelText: {
    fontSize: 16,
    color: APP_COLORS.error,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
  },
  saveText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.primary,
  },
  modalContent: {
    padding: 16,
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
    color: APP_COLORS.text,
    borderWidth: 1,
    borderColor: APP_COLORS.inputBorder,
    fontFamily: FONTS.regular,
  },
  helpText: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginTop: 4,
  },
})
