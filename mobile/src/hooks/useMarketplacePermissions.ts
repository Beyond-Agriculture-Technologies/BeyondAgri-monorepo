import { useAuthStore } from '../store/auth-store'
import { DISABLE_RBAC } from '../utils/constants'

export interface MarketplacePermissionSet {
  // Browse (available to all, including guests)
  canBrowseMarketplace: boolean
  canViewListingDetails: boolean

  // Farmer capabilities
  canCreateListings: boolean
  canEditOwnListings: boolean
  canDeleteOwnListings: boolean
  canPublishListings: boolean

  // Wholesaler capabilities
  canContactFarmers: boolean
  canSaveListings: boolean

  // Admin capabilities
  canModerateListings: boolean
  canViewAllListings: boolean
}

const MarketplacePermissions: Record<
  'FARMER' | 'WHOLESALER' | 'ADMIN' | 'GUEST',
  MarketplacePermissionSet
> = {
  FARMER: {
    canBrowseMarketplace: true,
    canViewListingDetails: true,
    canCreateListings: true,
    canEditOwnListings: true,
    canDeleteOwnListings: true,
    canPublishListings: true,
    canContactFarmers: false,
    canSaveListings: false,
    canModerateListings: false,
    canViewAllListings: false,
  },
  WHOLESALER: {
    canBrowseMarketplace: true,
    canViewListingDetails: true,
    canCreateListings: false,
    canEditOwnListings: false,
    canDeleteOwnListings: false,
    canPublishListings: false,
    canContactFarmers: true,
    canSaveListings: true,
    canModerateListings: false,
    canViewAllListings: false,
  },
  ADMIN: {
    canBrowseMarketplace: true,
    canViewListingDetails: true,
    canCreateListings: true,
    canEditOwnListings: true,
    canDeleteOwnListings: true,
    canPublishListings: true,
    canContactFarmers: true,
    canSaveListings: true,
    canModerateListings: true,
    canViewAllListings: true,
  },
  GUEST: {
    canBrowseMarketplace: true,
    canViewListingDetails: true,
    canCreateListings: false,
    canEditOwnListings: false,
    canDeleteOwnListings: false,
    canPublishListings: false,
    canContactFarmers: false,
    canSaveListings: false,
    canModerateListings: false,
    canViewAllListings: false,
  },
}

// All permissions set to true for when RBAC is disabled
const ALL_PERMISSIONS: MarketplacePermissionSet = {
  canBrowseMarketplace: true,
  canViewListingDetails: true,
  canCreateListings: true,
  canEditOwnListings: true,
  canDeleteOwnListings: true,
  canPublishListings: true,
  canContactFarmers: true,
  canSaveListings: true,
  canModerateListings: true,
  canViewAllListings: true,
}

/**
 * Hook to access marketplace permissions for the current user
 *
 * Usage:
 * ```typescript
 * const { permissions, isFarmer } = useMarketplacePermissions()
 *
 * if (permissions.canCreateListings) {
 *   // Show create listing button
 * }
 * ```
 */
export const useMarketplacePermissions = () => {
  const user = useAuthStore(state => state.user)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  // Determine user type (GUEST if not authenticated)
  // Normalize to uppercase to handle backend returning lowercase values
  const rawUserType = isAuthenticated && user?.user_type ? user.user_type : 'GUEST'
  const userType = rawUserType.toUpperCase() as 'FARMER' | 'WHOLESALER' | 'ADMIN' | 'GUEST'

  // If RBAC is disabled, return all permissions as true
  const permissions = DISABLE_RBAC
    ? ALL_PERMISSIONS
    : MarketplacePermissions[userType as keyof typeof MarketplacePermissions] ||
      MarketplacePermissions.GUEST

  return {
    permissions,
    userType,
    user,
    isAuthenticated,
    isFarmer: userType === 'FARMER',
    isWholesaler: userType === 'WHOLESALER',
    isAdmin: userType === 'ADMIN',
    isGuest: !isAuthenticated || userType === 'GUEST',
    hasPermission: (permission: keyof MarketplacePermissionSet) => {
      if (DISABLE_RBAC) return true
      return permissions[permission] === true
    },
  }
}
