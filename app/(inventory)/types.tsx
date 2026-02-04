import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Switch,
  ScrollView,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useInventoryStore } from '../../src/store/inventory-store'
import { useInventoryPermissions } from '../../src/hooks/useInventoryPermissions'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'
import {
  InventoryTypeResponse,
  InventoryTypeCreate,
  InventoryCategoryEnum,
} from '../../src/types/inventory'

export default function InventoryTypesScreen() {
  const { permissions } = useInventoryPermissions()
  const { inventoryTypes, typesLoading, fetchInventoryTypes, createInventoryType } =
    useInventoryStore()

  const [refreshing, setRefreshing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [formData, setFormData] = useState<InventoryTypeCreate>({
    type_name: '',
    category: InventoryCategoryEnum.HARVEST,
    description: '',
    unit_of_measure: 'kg',
    perishable: true,
    typical_shelf_life_days: undefined,
    reorder_point: undefined,
    reorder_quantity: undefined,
  })

  useEffect(() => {
    loadTypes()
  }, [])

  const loadTypes = async () => {
    await fetchInventoryTypes()
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadTypes()
    setRefreshing(false)
  }

  const handleAddType = async () => {
    if (!formData.type_name.trim()) {
      Alert.alert('Validation Error', 'Type name is required')
      return
    }

    if (!formData.unit_of_measure.trim()) {
      Alert.alert('Validation Error', 'Unit of measure is required')
      return
    }

    const result = await createInventoryType(formData)
    if (result) {
      Alert.alert('Success', 'Inventory type created successfully')
      setShowAddModal(false)
      resetForm()
      await loadTypes()
    } else {
      Alert.alert('Error', 'Failed to create inventory type')
    }
  }

  const resetForm = () => {
    setFormData({
      type_name: '',
      category: InventoryCategoryEnum.HARVEST,
      description: '',
      unit_of_measure: 'kg',
      perishable: true,
      typical_shelf_life_days: undefined,
      reorder_point: undefined,
      reorder_quantity: undefined,
    })
  }

  const getCategoryIcon = (category: InventoryCategoryEnum) => {
    switch (category) {
      case InventoryCategoryEnum.HARVEST:
        return 'leaf'
      case InventoryCategoryEnum.MEAT:
        return 'restaurant'
      case InventoryCategoryEnum.POULTRY:
        return 'egg'
      case InventoryCategoryEnum.PACKAGING:
        return 'cube-outline'
      case InventoryCategoryEnum.SUPPLIES:
        return 'construct'
      default:
        return 'pricetag'
    }
  }

  const getCategoryColor = (category: InventoryCategoryEnum) => {
    switch (category) {
      case InventoryCategoryEnum.HARVEST:
        return APP_COLORS.success
      case InventoryCategoryEnum.MEAT:
        return APP_COLORS.error
      case InventoryCategoryEnum.POULTRY:
        return APP_COLORS.warning
      case InventoryCategoryEnum.PACKAGING:
        return APP_COLORS.info
      case InventoryCategoryEnum.SUPPLIES:
        return APP_COLORS.secondary
      default:
        return APP_COLORS.primary
    }
  }

  const renderType = ({ item }: { item: InventoryTypeResponse }) => {
    const categoryColor = getCategoryColor(item.category)
    const categoryIcon = getCategoryIcon(item.category)

    return (
      <View style={styles.typeCard}>
        <View style={styles.typeHeader}>
          <View style={styles.typeHeaderLeft}>
            <View style={[styles.categoryIcon, { backgroundColor: `${categoryColor}20` }]}>
              <Ionicons name={categoryIcon} size={24} color={categoryColor} />
            </View>
            <View style={styles.typeInfo}>
              <Text style={styles.typeName}>{item.type_name}</Text>
              <Text style={styles.categoryText}>
                {item.category.charAt(0).toUpperCase() + item.category.slice(1)}
              </Text>
            </View>
          </View>
          {item.perishable && (
            <View style={styles.perishableBadge}>
              <Ionicons name="time-outline" size={14} color={APP_COLORS.warning} />
              <Text style={styles.perishableText}>Perishable</Text>
            </View>
          )}
        </View>

        {item.description && <Text style={styles.description}>{item.description}</Text>}

        <View style={styles.typeDetails}>
          <View style={styles.detailRow}>
            <Ionicons name="scale-outline" size={16} color={APP_COLORS.textSecondary} />
            <Text style={styles.detailText}>Unit: {item.unit_of_measure}</Text>
          </View>

          {item.typical_shelf_life_days && (
            <View style={styles.detailRow}>
              <Ionicons name="calendar-outline" size={16} color={APP_COLORS.textSecondary} />
              <Text style={styles.detailText}>Shelf Life: {item.typical_shelf_life_days} days</Text>
            </View>
          )}

          {item.reorder_point !== undefined && (
            <View style={styles.detailRow}>
              <Ionicons name="alert-circle-outline" size={16} color={APP_COLORS.textSecondary} />
              <Text style={styles.detailText}>Reorder Point: {item.reorder_point}</Text>
            </View>
          )}

          {item.reorder_quantity !== undefined && (
            <View style={styles.detailRow}>
              <Ionicons name="refresh-outline" size={16} color={APP_COLORS.textSecondary} />
              <Text style={styles.detailText}>Reorder Qty: {item.reorder_quantity}</Text>
            </View>
          )}
        </View>
      </View>
    )
  }

  if (typesLoading && inventoryTypes.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen
          options={{
            title: 'Inventory Types',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading inventory types...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Inventory Types',
          headerShown: true,
          headerBackTitle: 'Back',
          headerRight: () =>
            permissions.canManageInventoryTypes ? (
              <TouchableOpacity onPress={() => setShowAddModal(true)} style={styles.headerButton}>
                <Ionicons name="add-circle" size={28} color={APP_COLORS.primary} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <FlatList
        data={inventoryTypes}
        renderItem={renderType}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="pricetag-outline" size={64} color={APP_COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>No Inventory Types</Text>
            <Text style={styles.emptySubtitle}>
              Create inventory types to categorize your products
            </Text>
            {permissions.canManageInventoryTypes && (
              <TouchableOpacity style={styles.emptyButton} onPress={() => setShowAddModal(true)}>
                <Ionicons name="add" size={20} color={APP_COLORS.textOnPrimary} />
                <Text style={styles.emptyButtonText}>Add Type</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Add Type Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Inventory Type</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color={APP_COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Type Name */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Type Name <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Tomatoes, Chicken Breast"
                  value={formData.type_name}
                  onChangeText={text => setFormData({ ...formData, type_name: text })}
                  placeholderTextColor={APP_COLORS.textSecondary}
                />
              </View>

              {/* Category */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Category <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.categoryOptions}>
                  {Object.values(InventoryCategoryEnum).map(category => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryOption,
                        formData.category === category && styles.categoryOptionActive,
                      ]}
                      onPress={() => setFormData({ ...formData, category })}
                    >
                      <Text
                        style={[
                          styles.categoryOptionText,
                          formData.category === category && styles.categoryOptionTextActive,
                        ]}
                      >
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Description */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Optional description..."
                  value={formData.description}
                  onChangeText={text => setFormData({ ...formData, description: text })}
                  multiline
                  numberOfLines={3}
                  placeholderTextColor={APP_COLORS.textSecondary}
                />
              </View>

              {/* Unit of Measure */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>
                  Unit of Measure <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., kg, liters, pieces"
                  value={formData.unit_of_measure}
                  onChangeText={text => setFormData({ ...formData, unit_of_measure: text })}
                  placeholderTextColor={APP_COLORS.textSecondary}
                />
              </View>

              {/* Perishable Toggle */}
              <View style={styles.formGroup}>
                <View style={styles.switchRow}>
                  <View>
                    <Text style={styles.label}>Perishable</Text>
                    <Text style={styles.helperText}>Does this product expire?</Text>
                  </View>
                  <Switch
                    value={formData.perishable}
                    onValueChange={value => setFormData({ ...formData, perishable: value })}
                    trackColor={{ false: APP_COLORS.border, true: APP_COLORS.primary }}
                    thumbColor="white"
                  />
                </View>
              </View>

              {/* Shelf Life */}
              {formData.perishable && (
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Typical Shelf Life (days)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g., 7, 30, 90"
                    value={formData.typical_shelf_life_days?.toString() || ''}
                    onChangeText={text =>
                      setFormData({
                        ...formData,
                        typical_shelf_life_days: text ? parseInt(text) : undefined,
                      })
                    }
                    keyboardType="numeric"
                    placeholderTextColor={APP_COLORS.textSecondary}
                  />
                </View>
              )}

              {/* Reorder Point */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Reorder Point</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Minimum quantity before reordering"
                  value={formData.reorder_point?.toString() || ''}
                  onChangeText={text =>
                    setFormData({
                      ...formData,
                      reorder_point: text ? parseInt(text) : undefined,
                    })
                  }
                  keyboardType="numeric"
                  placeholderTextColor={APP_COLORS.textSecondary}
                />
              </View>

              {/* Reorder Quantity */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Reorder Quantity</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Quantity to reorder"
                  value={formData.reorder_quantity?.toString() || ''}
                  onChangeText={text =>
                    setFormData({
                      ...formData,
                      reorder_quantity: text ? parseInt(text) : undefined,
                    })
                  }
                  keyboardType="numeric"
                  placeholderTextColor={APP_COLORS.textSecondary}
                />
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButtonSecondary}
                onPress={() => {
                  setShowAddModal(false)
                  resetForm()
                }}
              >
                <Text style={styles.modalButtonSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButtonPrimary} onPress={handleAddType}>
                <Text style={styles.modalButtonPrimaryText}>Create Type</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    marginTop: 16,
    fontSize: 16,
    color: APP_COLORS.textSecondary,
  },
  headerButton: {
    marginRight: 8,
  },
  list: {
    padding: 16,
  },
  typeCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  typeHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  typeInfo: {
    flex: 1,
  },
  typeName: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  perishableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${APP_COLORS.warning}20`,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  perishableText: {
    fontSize: 12,
    color: APP_COLORS.warning,
    fontFamily: FONTS.semiBold,
  },
  description: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  typeDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: APP_COLORS.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  emptyButtonText: {
    color: APP_COLORS.textOnPrimary,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: APP_COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: APP_COLORS.surfaceElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  required: {
    color: APP_COLORS.error,
  },
  input: {
    backgroundColor: APP_COLORS.inputBackground,
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: APP_COLORS.text,
    borderWidth: 1,
    borderColor: APP_COLORS.inputBorder,
    fontFamily: FONTS.regular,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: APP_COLORS.background,
    borderWidth: 2,
    borderColor: APP_COLORS.border,
  },
  categoryOptionActive: {
    borderColor: APP_COLORS.primary,
    backgroundColor: `${APP_COLORS.primary}10`,
  },
  categoryOptionText: {
    fontSize: 14,
    color: APP_COLORS.text,
  },
  categoryOptionTextActive: {
    color: APP_COLORS.primary,
    fontFamily: FONTS.semiBold,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helperText: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  modalButtonSecondary: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: APP_COLORS.background,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  modalButtonSecondaryText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
  },
  modalButtonPrimary: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: APP_COLORS.primary,
    alignItems: 'center',
  },
  modalButtonPrimaryText: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.textOnPrimary,
  },
})
