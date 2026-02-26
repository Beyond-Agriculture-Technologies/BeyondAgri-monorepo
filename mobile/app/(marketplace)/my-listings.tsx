import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useMarketplaceStore } from '../../src/store/marketplace-store'
import { useMarketplacePermissions } from '../../src/hooks/useMarketplacePermissions'
import { useAppStore } from '../../src/store/app-store'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'
import { ProductListingFull, ListingStatusEnum } from '../../src/types/marketplace'
import {
  formatPricePerUnit,
  getListingStatusLabel,
  getListingStatusColor,
  getCategoryLabel,
  getListingActions,
  formatRelativeDate,
} from '../../src/utils/marketplace-helpers'

const STATUS_FILTERS = [
  { value: undefined, label: 'All' },
  { value: ListingStatusEnum.DRAFT, label: 'Draft' },
  { value: ListingStatusEnum.ACTIVE, label: 'Active' },
  { value: ListingStatusEnum.PAUSED, label: 'Paused' },
  { value: ListingStatusEnum.ARCHIVED, label: 'Archived' },
]

export default function MyListingsScreen() {
  const { isOnline } = useAppStore()
  const { permissions, isFarmer } = useMarketplacePermissions()
  const {
    myListings,
    myListingsLoading,
    myListingsError,
    fetchMyListings,
    publishListing,
    pauseListing,
    resumeListing,
    archiveListing,
  } = useMarketplaceStore()

  const [refreshing, setRefreshing] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<ListingStatusEnum | undefined>(undefined)
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null)

  useEffect(() => {
    if (isOnline && isFarmer) {
      fetchMyListings(selectedStatus)
    }
  }, [isOnline, isFarmer, selectedStatus])

  const onRefresh = async () => {
    if (!isOnline) return
    setRefreshing(true)
    await fetchMyListings(selectedStatus)
    setRefreshing(false)
  }

  const handleStatusFilter = (status: ListingStatusEnum | undefined) => {
    setSelectedStatus(status)
  }

  const handlePublish = async (listing: ProductListingFull) => {
    setActionLoadingId(listing.id)
    const success = await publishListing(listing.id)
    setActionLoadingId(null)
    if (success) {
      Alert.alert('Success', 'Listing published successfully')
    }
  }

  const handlePause = async (listing: ProductListingFull) => {
    setActionLoadingId(listing.id)
    const success = await pauseListing(listing.id)
    setActionLoadingId(null)
    if (success) {
      Alert.alert('Success', 'Listing paused')
    }
  }

  const handleResume = async (listing: ProductListingFull) => {
    setActionLoadingId(listing.id)
    const success = await resumeListing(listing.id)
    setActionLoadingId(null)
    if (success) {
      Alert.alert('Success', 'Listing resumed')
    }
  }

  const handleArchive = (listing: ProductListingFull) => {
    Alert.alert('Archive Listing', 'Are you sure you want to archive this listing?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Archive',
        style: 'destructive',
        onPress: async () => {
          setActionLoadingId(listing.id)
          const success = await archiveListing(listing.id)
          setActionLoadingId(null)
          if (success) {
            Alert.alert('Success', 'Listing archived successfully')
          } else {
            Alert.alert('Error', 'Failed to archive listing')
          }
        },
      },
    ])
  }

  const renderListingCard = useCallback(
    ({ item }: { item: ProductListingFull }) => {
      const actions = getListingActions(item.status)
      const isLoading = actionLoadingId === item.id

      return (
        <TouchableOpacity
          style={styles.listingCard}
          onPress={() => router.push(`/(marketplace)/listing-details?id=${item.id}`)}
          activeOpacity={0.7}
        >
          {/* Header */}
          <View style={styles.cardHeader}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getListingStatusColor(item.status) + '20' },
              ]}
            >
              <Text style={[styles.statusText, { color: getListingStatusColor(item.status) }]}>
                {getListingStatusLabel(item.status)}
              </Text>
            </View>
            <Text style={styles.dateText}>{formatRelativeDate(item.updated_at)}</Text>
          </View>

          {/* Title */}
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>

          {/* Category */}
          <Text style={styles.categoryText}>{getCategoryLabel(item.category)}</Text>

          {/* Price */}
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>
              {formatPricePerUnit(item.price_per_unit, item.currency, item.unit)}
            </Text>
            <Text style={styles.quantityText}>
              {parseFloat(item.available_quantity)} {item.unit}
            </Text>
          </View>

          {/* Actions */}
          {!isLoading ? (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push(`/(marketplace)/listing-form?id=${item.id}`)}
              >
                <Ionicons name="create-outline" size={18} color={APP_COLORS.primary} />
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>

              {actions.canPublish && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.primaryActionBtn]}
                  onPress={() => handlePublish(item)}
                >
                  <Ionicons name="rocket-outline" size={18} color={APP_COLORS.textOnPrimary} />
                  <Text style={styles.actionTextWhite}>Publish</Text>
                </TouchableOpacity>
              )}

              {actions.canPause && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.warningActionBtn]}
                  onPress={() => handlePause(item)}
                >
                  <Ionicons name="pause-outline" size={18} color={APP_COLORS.textOnPrimary} />
                  <Text style={styles.actionTextWhite}>Pause</Text>
                </TouchableOpacity>
              )}

              {actions.canResume && (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.primaryActionBtn]}
                  onPress={() => handleResume(item)}
                >
                  <Ionicons name="play-outline" size={18} color={APP_COLORS.textOnPrimary} />
                  <Text style={styles.actionTextWhite}>Resume</Text>
                </TouchableOpacity>
              )}

              {actions.canArchive && (
                <TouchableOpacity style={styles.actionBtn} onPress={() => handleArchive(item)}>
                  <Ionicons name="archive-outline" size={18} color={APP_COLORS.error} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={APP_COLORS.primary} />
            </View>
          )}
        </TouchableOpacity>
      )
    },
    [actionLoadingId]
  )

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={APP_COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Listings</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.filterTabs}>
        {STATUS_FILTERS.map(filter => (
          <TouchableOpacity
            key={filter.label}
            style={[styles.filterTab, selectedStatus === filter.value && styles.filterTabActive]}
            onPress={() => handleStatusFilter(filter.value)}
          >
            <Text
              style={[
                styles.filterTabText,
                selectedStatus === filter.value && styles.filterTabTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Results count */}
      <View style={styles.resultsBar}>
        <Text style={styles.resultsText}>
          {myListings.length} {myListings.length === 1 ? 'listing' : 'listings'}
        </Text>
      </View>
    </View>
  )

  const renderEmpty = () => {
    if (myListingsLoading) return null
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="document-text-outline" size={64} color={APP_COLORS.textSecondary} />
        <Text style={styles.emptyTitle}>No Listings Yet</Text>
        <Text style={styles.emptyText}>
          {myListingsError
            ? myListingsError
            : selectedStatus
              ? `You don't have any ${getListingStatusLabel(selectedStatus).toLowerCase()} listings.`
              : 'Create your first listing to start selling on the marketplace.'}
        </Text>
        {permissions.canCreateListings && (
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push('/(marketplace)/listing-form')}
          >
            <Ionicons name="add" size={20} color={APP_COLORS.textOnPrimary} />
            <Text style={styles.createButtonText}>Create Listing</Text>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  if (!isFarmer) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="lock-closed" size={64} color={APP_COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>Farmer Access Only</Text>
          <Text style={styles.emptyText}>Only farmers can create and manage listings.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={myListings}
        renderItem={renderListingCard}
        keyExtractor={item => item.id.toString()}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={APP_COLORS.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      {permissions.canCreateListings && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(marketplace)/listing-form')}
        >
          <Ionicons name="add" size={28} color={APP_COLORS.textOnPrimary} />
        </TouchableOpacity>
      )}
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: APP_COLORS.text,
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: APP_COLORS.surface,
  },
  filterTabActive: {
    backgroundColor: APP_COLORS.primary,
  },
  filterTabText: {
    fontSize: 14,
    color: APP_COLORS.text,
    fontFamily: FONTS.medium,
  },
  filterTabTextActive: {
    color: APP_COLORS.textOnPrimary,
  },
  resultsBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultsText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  listingCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold,
  },
  dateText: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priceText: {
    fontSize: 16,
    fontFamily: FONTS.bold,
    color: APP_COLORS.primary,
  },
  quantityText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: APP_COLORS.background,
    gap: 4,
  },
  primaryActionBtn: {
    backgroundColor: APP_COLORS.primary,
  },
  warningActionBtn: {
    backgroundColor: APP_COLORS.warning,
  },
  actionText: {
    fontSize: 13,
    color: APP_COLORS.primary,
    fontFamily: FONTS.medium,
  },
  actionTextWhite: {
    fontSize: 13,
    color: APP_COLORS.textOnPrimary,
    fontFamily: FONTS.medium,
  },
  loadingRow: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
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
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  createButtonText: {
    color: APP_COLORS.textOnPrimary,
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: APP_COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
})
