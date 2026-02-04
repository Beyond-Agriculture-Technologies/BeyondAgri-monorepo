import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import { useMarketplaceStore } from '../../src/store/marketplace-store'
import { useMarketplacePermissions } from '../../src/hooks/useMarketplacePermissions'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'
import {
  formatPricePerUnit,
  formatAvailability,
  getCategoryLabel,
  getCategoryIcon,
  getCategoryColor,
  getListingStatusLabel,
  getListingStatusColor,
  formatDate,
  getListingActions,
} from '../../src/utils/marketplace-helpers'

export default function ListingDetailsScreen() {
  const params = useLocalSearchParams<{ id: string }>()
  const listingId = parseInt(params.id || '0', 10)

  const { permissions, isFarmer } = useMarketplacePermissions()
  const {
    currentListing,
    detailLoading,
    detailError,
    fetchListingDetail,
    clearCurrentListing,
    publishListing,
    pauseListing,
    resumeListing,
    archiveListing,
    myListings,
  } = useMarketplaceStore()

  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (listingId > 0) {
      fetchListingDetail(listingId)
    }

    return () => {
      clearCurrentListing()
    }
  }, [listingId])

  const handlePublish = async () => {
    setActionLoading(true)
    const success = await publishListing(listingId)
    setActionLoading(false)
    if (success) {
      Alert.alert('Success', 'Listing published successfully')
    }
  }

  const handlePause = async () => {
    setActionLoading(true)
    const success = await pauseListing(listingId)
    setActionLoading(false)
    if (success) {
      Alert.alert('Success', 'Listing paused successfully')
    }
  }

  const handleResume = async () => {
    setActionLoading(true)
    const success = await resumeListing(listingId)
    setActionLoading(false)
    if (success) {
      Alert.alert('Success', 'Listing resumed successfully')
    }
  }

  const handleArchive = () => {
    Alert.alert(
      'Archive Listing',
      'Are you sure you want to archive this listing? It will be removed from the marketplace.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true)
            const success = await archiveListing(listingId)
            setActionLoading(false)
            if (success) {
              Alert.alert('Success', 'Listing archived successfully')
              router.back()
            }
          },
        },
      ]
    )
  }

  const handleContact = () => {
    if (currentListing?.farmer) {
      Alert.alert(
        'Contact Farmer',
        `You can contact ${currentListing.farm_name || 'the farmer'} to inquire about this listing.`,
        [{ text: 'OK' }]
      )
    }
  }

  if (detailLoading || !currentListing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={APP_COLORS.primary} />
          <Text style={styles.loadingText}>
            {detailLoading ? 'Loading listing...' : detailError || 'Listing not found'}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const listing = currentListing
  // Check if this listing belongs to the current user by checking if it exists in myListings
  // myListings only contains the authenticated user's listings (filtered by backend)
  const isOwnListing = isFarmer && myListings.some(l => l.id === listing.id)
  // Check if we have the full listing with status (from my-listings) vs browse listing (public)
  const hasStatus = 'status' in listing && listing.status !== undefined
  const actions = hasStatus ? getListingActions(listing.status) : null

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={APP_COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Listing Details</Text>
        {isOwnListing && (
          <TouchableOpacity
            onPress={() => router.push(`/(marketplace)/listing-form?id=${listingId}`)}
            style={styles.editButton}
          >
            <Ionicons name="create-outline" size={24} color={APP_COLORS.primary} />
          </TouchableOpacity>
        )}
        {!isOwnListing && <View style={{ width: 40 }} />}
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Category and Status */}
        <View style={styles.badgeRow}>
          <View style={styles.categoryBadge}>
            <Ionicons
              name={getCategoryIcon(listing.category)}
              size={16}
              color={getCategoryColor(listing.category)}
            />
            <Text style={[styles.categoryText, { color: getCategoryColor(listing.category) }]}>
              {getCategoryLabel(listing.category)}
            </Text>
          </View>
          {hasStatus && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getListingStatusColor(listing.status) + '20' },
              ]}
            >
              <Text style={[styles.statusText, { color: getListingStatusColor(listing.status) }]}>
                {getListingStatusLabel(listing.status)}
              </Text>
            </View>
          )}
          {listing.is_featured && (
            <View style={styles.featuredBadge}>
              <Ionicons name="star" size={12} color={APP_COLORS.warning} />
              <Text style={styles.featuredText}>Featured</Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={styles.title}>{listing.title}</Text>

        {/* Price Card */}
        <View style={styles.priceCard}>
          <View style={styles.priceMain}>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.priceValue}>
              {formatPricePerUnit(listing.price_per_unit, listing.currency, listing.unit)}
            </Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceMain}>
            <Text style={styles.priceLabel}>Available</Text>
            <Text style={styles.availabilityValue}>
              {formatAvailability(listing.available_quantity, listing.unit)}
            </Text>
          </View>
        </View>

        {/* Minimum Order */}
        {listing.minimum_order_quantity && (
          <View style={styles.infoCard}>
            <Ionicons name="cart" size={20} color={APP_COLORS.textSecondary} />
            <Text style={styles.infoText}>
              Minimum order: {listing.minimum_order_quantity} {listing.unit}
            </Text>
          </View>
        )}

        {/* Description */}
        {listing.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{listing.description}</Text>
          </View>
        )}

        {/* Quality & Certifications */}
        {(listing.quality_grade ||
          (listing.certifications && listing.certifications.length > 0)) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quality & Certifications</Text>
            <View style={styles.qualityRow}>
              {listing.quality_grade && (
                <View style={styles.qualityBadge}>
                  <Text style={styles.qualityText}>Grade {listing.quality_grade}</Text>
                </View>
              )}
              {listing.certifications?.map((cert, index) => (
                <View key={index} style={styles.certBadge}>
                  <Ionicons name="checkmark-circle" size={14} color={APP_COLORS.success} />
                  <Text style={styles.certText}>{cert}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Location */}
        {(listing.province || listing.city) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={20} color={APP_COLORS.textSecondary} />
              <Text style={styles.locationText}>
                {[listing.city, listing.province].filter(Boolean).join(', ')}
              </Text>
            </View>
          </View>
        )}

        {/* Farmer Info */}
        {listing.farmer && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Seller</Text>
            <View style={styles.farmerCard}>
              <View style={styles.farmerIcon}>
                <Ionicons name="leaf" size={24} color={APP_COLORS.primary} />
              </View>
              <View style={styles.farmerInfo}>
                <Text style={styles.farmName}>
                  {listing.farm_name || listing.farmer.farm_name || 'Farm'}
                </Text>
                {listing.farmer.farm_location && (
                  <Text style={styles.farmLocation}>{listing.farmer.farm_location}</Text>
                )}
              </View>
              {permissions.canContactFarmers && (
                <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
                  <Ionicons name="chatbubble" size={20} color={APP_COLORS.textOnPrimary} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Listing Dates */}
        {(listing.published_at || ('created_at' in listing && listing.created_at)) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            <View style={styles.timelineCard}>
              {listing.published_at && (
                <View style={styles.timelineRow}>
                  <Ionicons name="calendar" size={16} color={APP_COLORS.textSecondary} />
                  <Text style={styles.timelineLabel}>Published:</Text>
                  <Text style={styles.timelineValue}>{formatDate(listing.published_at)}</Text>
                </View>
              )}
              {'expires_at' in listing && listing.expires_at && (
                <View style={styles.timelineRow}>
                  <Ionicons name="time" size={16} color={APP_COLORS.warning} />
                  <Text style={styles.timelineLabel}>Expires:</Text>
                  <Text style={styles.timelineValue}>{formatDate(listing.expires_at)}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Owner Actions */}
        {isOwnListing && actions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <View style={styles.actionsCard}>
              {actions.canPublish && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryAction]}
                  onPress={handlePublish}
                  disabled={actionLoading}
                >
                  <Ionicons name="rocket" size={20} color={APP_COLORS.textOnPrimary} />
                  <Text style={styles.actionButtonTextWhite}>Publish</Text>
                </TouchableOpacity>
              )}
              {actions.canPause && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.warningAction]}
                  onPress={handlePause}
                  disabled={actionLoading}
                >
                  <Ionicons name="pause" size={20} color={APP_COLORS.textOnPrimary} />
                  <Text style={styles.actionButtonTextWhite}>Pause</Text>
                </TouchableOpacity>
              )}
              {actions.canResume && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryAction]}
                  onPress={handleResume}
                  disabled={actionLoading}
                >
                  <Ionicons name="play" size={20} color={APP_COLORS.textOnPrimary} />
                  <Text style={styles.actionButtonTextWhite}>Resume</Text>
                </TouchableOpacity>
              )}
              {actions.canArchive && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.dangerAction]}
                  onPress={handleArchive}
                  disabled={actionLoading}
                >
                  <Ionicons name="archive" size={20} color={APP_COLORS.textOnPrimary} />
                  <Text style={styles.actionButtonTextWhite}>Archive</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom CTA for non-owners */}
      {!isOwnListing && permissions.canContactFarmers && (
        <View style={styles.bottomCTA}>
          <TouchableOpacity style={styles.ctaButton} onPress={handleContact}>
            <Ionicons name="chatbubble" size={20} color={APP_COLORS.textOnPrimary} />
            <Text style={styles.ctaButtonText}>Contact Seller</Text>
          </TouchableOpacity>
        </View>
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: APP_COLORS.textSecondary,
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
  editButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    marginBottom: 12,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: APP_COLORS.surface,
  },
  categoryText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.warningDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  featuredText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.warning,
  },
  title: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: APP_COLORS.text,
    marginBottom: 16,
  },
  priceCard: {
    flexDirection: 'row',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  priceMain: {
    flex: 1,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 20,
    fontFamily: FONTS.bold,
    color: APP_COLORS.primary,
  },
  availabilityValue: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
  },
  priceDivider: {
    width: 1,
    backgroundColor: APP_COLORS.border,
    marginHorizontal: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  infoText: {
    fontSize: 14,
    color: APP_COLORS.text,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    color: APP_COLORS.textSecondary,
    lineHeight: 22,
  },
  qualityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  qualityBadge: {
    backgroundColor: APP_COLORS.infoDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  qualityText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.info,
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.successDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  certText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.success,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 15,
    color: APP_COLORS.text,
  },
  farmerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  farmerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: APP_COLORS.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  farmerInfo: {
    flex: 1,
  },
  farmName: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginBottom: 2,
  },
  farmLocation: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
  },
  contactButton: {
    backgroundColor: APP_COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  timelineLabel: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  timelineValue: {
    fontSize: 14,
    color: APP_COLORS.text,
    fontFamily: FONTS.medium,
  },
  actionsCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  primaryAction: {
    backgroundColor: APP_COLORS.primary,
  },
  warningAction: {
    backgroundColor: APP_COLORS.warning,
  },
  dangerAction: {
    backgroundColor: APP_COLORS.error,
  },
  actionButtonTextWhite: {
    color: APP_COLORS.textOnPrimary,
    fontSize: 14,
    fontFamily: FONTS.semiBold,
  },
  bottomCTA: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.surfaceElevated,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  ctaButtonText: {
    color: APP_COLORS.textOnPrimary,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
})
