import { useAuthStore } from '../store/auth-store'
import {
  InventoryPermissions,
  InventoryPermissionSet,
  getRoleDisplayName,
  getDashboardTitle,
  getActionLabels,
  hasPermission,
} from '../utils/permissions'
import { DISABLE_RBAC } from '../utils/constants'

// All permissions set to true for when RBAC is disabled
const ALL_PERMISSIONS: InventoryPermissionSet = {
  canViewOwnInventory: true,
  canCreateInventory: true,
  canEditOwnInventory: true,
  canDeleteOwnInventory: true,
  canEditInventory: true,
  canDeleteInventory: true,
  canViewWarehouses: true,
  canManageWarehouses: true,
  canViewAllInventory: true,
  canTransferItems: true,
  canManageInventoryTypes: true,
  canViewReports: true,
  canViewBatches: true,
  canViewAlerts: true,
  canManageUsers: true,
  canViewAuditLogs: true,
  canAccessSystemSettings: true,
}

/**
 * Hook to access inventory permissions for the current user
 *
 * Usage:
 * ```typescript
 * const permissions = useInventoryPermissions()
 *
 * if (permissions.canManageWarehouses) {
 *   // Show warehouse management UI
 * }
 * ```
 */
export const useInventoryPermissions = () => {
  const user = useAuthStore(state => state.user)
  const userType = user?.user_type || 'FARMER'

  // If RBAC is disabled, return all permissions as true
  const permissions = DISABLE_RBAC ? ALL_PERMISSIONS : InventoryPermissions[userType]

  return {
    permissions,
    userType,
    user,
    roleDisplayName: getRoleDisplayName(userType),
    dashboardTitle: getDashboardTitle(userType),
    actionLabels: getActionLabels(userType),
    hasPermission: (permission: keyof InventoryPermissionSet) =>
      hasPermission(userType, permission),
  }
}
