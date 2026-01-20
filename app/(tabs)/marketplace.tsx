import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useMarketplaceStore } from '../../src/store/marketplace-store'
import { useAppStore } from '../../src/store/app-store'
import { useMarketplacePermissions } from '../../src/hooks/useMarketplacePermissions'
import { APP_COLORS } from '../../src/utils/constants'
import { ListingStatusEnum } from '../../src/types/marketplace'
import {
  getListingStatusColor,
  getListingStatusLabel,
  getCategoryColor,
  getCategoryIcon,
} from '../../src/utils/marketplace-helpers'

export default function MarketplaceDashboard() {
  const { isOnline } = useAppStore()
  const { permissions, isFarmer, isWholesaler, isGuest } = useMarketplacePermissions()
  const {
    myListings,
    myListingsLoading,
    browseListings,
    browseLoading,
    fetchMyListings,
    fetchBrowseListings,
    fetchCategories,
    categories,
  } = useMarketplaceStore()

  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (isOnline) {
      loadDashboard()
    }
  }, [isOnline])

  const loadDashboard = async () => {
    const promises: Promise<void>[] = [
      fetchBrowseListings({ page: 1, page_size: 5, featured_only: true }),
      fetchCategories(),
    ]

    if (isFarmer) {
      promises.push(fetchMyListings())
    }

    await Promise.all(promises)
  }

  const onRefresh = async () => {
    if (!isOnline) return
    setRefreshing(true)
    await loadDashboard()
    setRefreshing(false)
  }

  // Calculate farmer stats
  const activeListings = myListings.filter(l => l.status === ListingStatusEnum.ACTIVE).length
  const draftListings = myListings.filter(l => l.status === ListingStatusEnum.DRAFT).length
  const pausedListings = myListings.filter(l => l.status === ListingStatusEnum.PAUSED).length

  const isLoading =
    (myListingsLoading || browseLoading) && myListings?.length === 0 && browseListings?.length === 0

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
          <Text style={styles.loadingText}>Loading marketplace...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={APP_COLORS.primary}
          />
        }
      >
        {/* Role Badge */}
        <View style={styles.roleBadgeContainer}>
          <View style={styles.roleBadge}>
            <Ionicons
              name={isFarmer ? 'leaf' : isWholesaler ? 'storefront' : 'person'}
              size={16}
              color={APP_COLORS.primary}
            />
            <Text style={styles.roleBadgeText}>
              {isFarmer ? 'Farmer' : isWholesaler ? 'Wholesaler' : 'Guest'} View
            </Text>
          </View>
          <Text style={styles.dashboardTitle}>
            {isFarmer ? 'My Marketplace' : 'Browse Marketplace'}
          </Text>
        </View>

        {/* Farmer Stats */}
        {isFarmer && (
          <View style={styles.statsSection}>
            <View style={[styles.statCard, activeListings > 0 && styles.activeCard]}>
              <View style={styles.statIcon}>
                <Ionicons name="checkmark-circle" size={24} color={APP_COLORS.success} />
              </View>
              <Text style={styles.statValue}>{activeListings}</Text>
              <Text style={styles.statLabel}>Active</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="document" size={24} color={APP_COLORS.textSecondary} />
              </View>
              <Text style={styles.statValue}>{draftListings}</Text>
              <Text style={styles.statLabel}>Drafts</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <Ionicons name="pause-circle" size={24} color={APP_COLORS.warning} />
              </View>
              <Text style={styles.statValue}>{pausedListings}</Text>
              <Text style={styles.statLabel}>Paused</Text>
            </View>
          </View>
        )}

        {/* Categories */}
        {categories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Browse by Category</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryScroll}
            >
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[styles.categoryChip, { borderColor: getCategoryColor(category) }]}
                  onPress={() => router.push(`/(marketplace)/browse?category=${category}`)}
                >
                  <Ionicons
                    name={getCategoryIcon(category)}
                    size={18}
                    color={getCategoryColor(category)}
                  />
                  <Text style={[styles.categoryChipText, { color: getCategoryColor(category) }]}>
                    {category.charAt(0) + category.slice(1).toLowerCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Featured Listings */}
        {browseListings?.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Listings</Text>
              <TouchableOpacity onPress={() => router.push('/(marketplace)/browse')}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {browseListings.slice(0, 3).map(listing => (
              <TouchableOpacity
                key={listing.id}
                style={styles.listingCard}
                onPress={() => router.push(`/(marketplace)/listing-details?id=${listing.id}`)}
              >
                <View style={styles.listingLeft}>
                  <Text style={styles.listingTitle} numberOfLines={1}>
                    {listing.title}
                  </Text>
                  <Text style={styles.listingCategory}>
                    {listing.category.charAt(0) + listing.category.slice(1).toLowerCase()}
                  </Text>
                  {listing.farm_name && (
                    <Text style={styles.listingFarm} numberOfLines={1}>
                      {listing.farm_name}
                    </Text>
                  )}
                </View>
                <View style={styles.listingRight}>
                  <Text style={styles.listingPrice}>
                    {listing.currency} {parseFloat(listing.price_per_unit).toFixed(2)}
                  </Text>
                  <Text style={styles.listingUnit}>per {listing.unit}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* My Recent Listings (Farmer only) */}
        {isFarmer && myListings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Listings</Text>
              <TouchableOpacity onPress={() => router.push('/(marketplace)/my-listings')}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {myListings.slice(0, 3).map(listing => (
              <TouchableOpacity
                key={listing.id}
                style={styles.listingCard}
                onPress={() => router.push(`/(marketplace)/listing-details?id=${listing.id}`)}
              >
                <View style={styles.listingLeft}>
                  <Text style={styles.listingTitle} numberOfLines={1}>
                    {listing.title}
                  </Text>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: getListingStatusColor(listing.status) + '20' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getListingStatusColor(listing.status) },
                        ]}
                      >
                        {getListingStatusLabel(listing.status)}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.listingRight}>
                  <Text style={styles.listingPrice}>
                    {listing.currency} {parseFloat(listing.price_per_unit).toFixed(2)}
                  </Text>
                  <Text style={styles.listingUnit}>per {listing.unit}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          {permissions.canCreateListings && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(marketplace)/listing-form')}
            >
              <View style={styles.actionLeft}>
                <Ionicons name="add-circle" size={24} color={APP_COLORS.primary} />
                <Text style={styles.actionText}>Create New Listing</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(marketplace)/browse')}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="search" size={24} color={APP_COLORS.primary} />
              <Text style={styles.actionText}>Browse All Listings</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textSecondary} />
          </TouchableOpacity>

          {isFarmer && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/(marketplace)/my-listings')}
            >
              <View style={styles.actionLeft}>
                <Ionicons name="list" size={24} color={APP_COLORS.primary} />
                <Text style={styles.actionText}>Manage My Listings</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Guest Notice */}
        {isGuest && (
          <View style={styles.guestNotice}>
            <Ionicons name="information-circle" size={20} color={APP_COLORS.info} />
            <Text style={styles.guestText}>
              Sign in as a farmer to create listings or as a wholesaler to contact sellers.
            </Text>
          </View>
        )}

        {/* Offline Notice */}
        {!isOnline && (
          <View style={styles.offlineNotice}>
            <Ionicons name="cloud-offline" size={20} color={APP_COLORS.warning} />
            <Text style={styles.offlineText}>You are offline. Some features may be limited.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  scrollView: {
    flex: 1,
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
  roleBadgeContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: APP_COLORS.primary,
  },
  dashboardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: APP_COLORS.text,
  },
  statsSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeCard: {
    borderWidth: 2,
    borderColor: APP_COLORS.success,
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  seeAllText: {
    fontSize: 14,
    color: APP_COLORS.primary,
    fontWeight: '500',
  },
  categoryScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: APP_COLORS.surface,
    borderWidth: 1.5,
    gap: 8,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listingCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  listingLeft: {
    flex: 1,
    marginRight: 16,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  listingCategory: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  listingFarm: {
    fontSize: 12,
    color: APP_COLORS.primary,
    marginTop: 2,
  },
  listingRight: {
    alignItems: 'flex-end',
  },
  listingPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: APP_COLORS.text,
  },
  listingUnit: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionText: {
    fontSize: 16,
    color: APP_COLORS.text,
    fontWeight: '500',
  },
  guestNotice: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guestText: {
    flex: 1,
    fontSize: 14,
    color: '#0369a1',
  },
  offlineNotice: {
    backgroundColor: '#fff3cd',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  offlineText: {
    flex: 1,
    fontSize: 14,
    color: '#856404',
  },
})
