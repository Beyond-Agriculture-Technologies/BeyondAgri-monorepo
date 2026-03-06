import { useAuthStore } from '../store/auth-store'

export interface OrderPermissionSet {
  canPlaceOrders: boolean
  canViewMyOrders: boolean
  canViewIncomingOrders: boolean
  canConfirmOrders: boolean
  canDeclineOrders: boolean
  canCompleteOrders: boolean
  canCancelOrders: boolean
  canViewSuppliers: boolean
  canViewBuyerStats: boolean
  canViewSellerStats: boolean
}

const OrderPermissions: Record<
  'FARMER' | 'WHOLESALER' | 'ADMIN' | 'GUEST',
  OrderPermissionSet
> = {
  FARMER: {
    canPlaceOrders: false,
    canViewMyOrders: false,
    canViewIncomingOrders: true,
    canConfirmOrders: true,
    canDeclineOrders: true,
    canCompleteOrders: false,
    canCancelOrders: false,
    canViewSuppliers: false,
    canViewBuyerStats: false,
    canViewSellerStats: true,
  },
  WHOLESALER: {
    canPlaceOrders: true,
    canViewMyOrders: true,
    canViewIncomingOrders: false,
    canConfirmOrders: false,
    canDeclineOrders: false,
    canCompleteOrders: true,
    canCancelOrders: true,
    canViewSuppliers: true,
    canViewBuyerStats: true,
    canViewSellerStats: false,
  },
  ADMIN: {
    canPlaceOrders: true,
    canViewMyOrders: true,
    canViewIncomingOrders: true,
    canConfirmOrders: true,
    canDeclineOrders: true,
    canCompleteOrders: true,
    canCancelOrders: true,
    canViewSuppliers: true,
    canViewBuyerStats: true,
    canViewSellerStats: true,
  },
  GUEST: {
    canPlaceOrders: false,
    canViewMyOrders: false,
    canViewIncomingOrders: false,
    canConfirmOrders: false,
    canDeclineOrders: false,
    canCompleteOrders: false,
    canCancelOrders: false,
    canViewSuppliers: false,
    canViewBuyerStats: false,
    canViewSellerStats: false,
  },
}

export const useOrderPermissions = () => {
  const user = useAuthStore(state => state.user)
  const isAuthenticated = useAuthStore(state => state.isAuthenticated)

  const rawUserType = isAuthenticated && user?.user_type ? user.user_type : 'GUEST'
  const userType = rawUserType.toUpperCase() as 'FARMER' | 'WHOLESALER' | 'ADMIN' | 'GUEST'

  const permissions =
    OrderPermissions[userType as keyof typeof OrderPermissions] ||
    OrderPermissions.GUEST

  return {
    permissions,
    userType,
    isFarmer: userType === 'FARMER',
    isWholesaler: userType === 'WHOLESALER',
    isAdmin: userType === 'ADMIN',
  }
}
