import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Farm } from '../../src/types'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'
import { dbService } from '../../src/services/database'
import { useAppStore } from '../../src/store/app-store'

export default function FarmsScreen() {
  const insets = useSafeAreaInsets()
  const [farms, setFarms] = useState<Farm[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const { isOnline } = useAppStore()

  const loadFarms = async () => {
    try {
      const farmsData = await dbService.getFarms()
      setFarms(farmsData)
    } catch (error) {
      console.error('Error loading farms:', error)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadFarms()
    setRefreshing(false)
  }

  useEffect(() => {
    loadFarms()
  }, [])

  const renderFarmItem = ({ item }: { item: Farm }) => (
    <TouchableOpacity style={styles.farmCard}>
      <View style={styles.farmHeader}>
        <View style={styles.farmInfo}>
          <Text style={styles.farmName}>{item.name}</Text>
          <Text style={styles.farmLocation}>📍 {item.location}</Text>
        </View>
        <View
          style={[
            styles.syncStatus,
            item.syncStatus === 'synced'
              ? styles.synced
              : item.syncStatus === 'pending'
                ? styles.pending
                : styles.failed,
          ]}
        >
          <Text
            style={[
              styles.syncStatusText,
              item.syncStatus === 'synced'
                ? { color: APP_COLORS.success }
                : item.syncStatus === 'pending'
                  ? { color: APP_COLORS.warning }
                  : { color: APP_COLORS.error },
            ]}
          >
            {item.syncStatus}
          </Text>
        </View>
      </View>

      <View style={styles.farmDetails}>
        <View style={styles.farmDetail}>
          <Ionicons name="resize" size={16} color={APP_COLORS.textSecondary} />
          <Text style={styles.farmDetailText}>{item.area} hectares</Text>
        </View>
        <View style={styles.farmDetail}>
          <Ionicons name="calendar" size={16} color={APP_COLORS.textSecondary} />
          <Text style={styles.farmDetailText}>
            Added {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View style={styles.farmActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="eye" size={16} color={APP_COLORS.primary} />
          <Text style={styles.actionText}>View</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="camera" size={16} color={APP_COLORS.secondary} />
          <Text style={styles.actionText}>Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="create" size={16} color={APP_COLORS.warning} />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  )

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="leaf-outline" size={64} color={APP_COLORS.textSecondary} />
      <Text style={styles.emptyTitle}>No farms yet</Text>
      <Text style={styles.emptySubtitle}>
        Add your first farm to start managing your agricultural operations
      </Text>
      <TouchableOpacity style={styles.addButton}>
        <Ionicons name="add" size={20} color={APP_COLORS.textOnPrimary} />
        <Text style={styles.addButtonText}>Add Your First Farm</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>My Farms</Text>
          <Text style={styles.headerSubtitle}>
            {farms.length} {farms.length === 1 ? 'farm' : 'farms'} total
          </Text>
        </View>
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="add" size={24} color={APP_COLORS.primary} />
        </TouchableOpacity>
      </View>

      {!isOnline && (
        <View style={styles.offlineBar}>
          <Ionicons name="cloud-offline" size={16} color={APP_COLORS.warning} />
          <Text style={styles.offlineText}>
            You&apos;re offline. Changes will sync when connection is restored.
          </Text>
        </View>
      )}

      <FlatList
        data={farms}
        renderItem={renderFarmItem}
        keyExtractor={item => item.id}
        contentContainerStyle={farms.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={EmptyState}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: APP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: APP_COLORS.text,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
  headerButton: {
    padding: 8,
  },
  offlineBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.warningDim,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  offlineText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: APP_COLORS.warning,
    marginLeft: 8,
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 32,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    color: APP_COLORS.textOnPrimary,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    marginLeft: 8,
  },
  farmCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  farmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  farmInfo: {
    flex: 1,
  },
  farmName: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  farmLocation: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
  },
  syncStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  synced: {
    backgroundColor: APP_COLORS.successDim,
  },
  pending: {
    backgroundColor: APP_COLORS.warningDim,
  },
  failed: {
    backgroundColor: APP_COLORS.errorDim,
  },
  syncStatusText: {
    fontSize: 10,
    fontFamily: FONTS.medium,
    textTransform: 'uppercase',
  },
  farmDetails: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  farmDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  farmDetailText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
    marginLeft: 4,
  },
  farmActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.borderLight,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: APP_COLORS.glass,
  },
  actionText: {
    fontSize: 12,
    color: APP_COLORS.text,
    marginLeft: 4,
    fontFamily: FONTS.medium,
  },
})
