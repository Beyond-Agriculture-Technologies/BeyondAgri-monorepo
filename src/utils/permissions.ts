/**
 * Role-Based Access Control (RBAC) for Inventory Management
 *
 * Defines permissions for different user types:
 * - Farmer: Basic inventory management for their own harvests
 * - Wholesaler: Advanced inventory management with warehouse operations
 * - Admin: Full system access
 */

import { DISABLE_RBAC } from './constants'

export interface InventoryPermissionSet {
  // Basic Inventory Operations
  canViewOwnInventory: boolean
  canCreateInventory: boolean
  canEditOwnInventory: boolean
  canDeleteOwnInventory: boolean
  canEditInventory: boolean
  canDeleteInventory: boolean

  // Warehouse Management
  canViewWarehouses: boolean
  canManageWarehouses: boolean

  // Advanced Features
  canViewAllInventory: boolean
  canTransferItems: boolean
  canManageInventoryTypes: boolean

  // Reports & Analytics
  canViewReports: boolean
  canViewBatches: boolean
  canViewAlerts: boolean

  // Admin Features
  canManageUsers?: boolean
  canViewAuditLogs?: boolean
  canAccessSystemSettings?: boolean
}

export const InventoryPermissions: Record<
  'FARMER' | 'WHOLESALER' | 'ADMIN',
  InventoryPermissionSet
> = {
  FARMER: {
    // Farmers can manage their own inventory (harvests, livestock products)
    canViewOwnInventory: true,
    canCreateInventory: true,
    canEditOwnInventory: true,
    canDeleteOwnInventory: true,
    canEditInventory: true,
    canDeleteInventory: true,

    // Farmers don't manage warehouses (they sell to wholesalers)
    canViewWarehouses: false,
    canManageWarehouses: false,

    // Farmers only see their own inventory
    canViewAllInventory: false,
    canTransferItems: false,
    canManageInventoryTypes: false,

    // Farmers can view their own reports and batches
    canViewReports: true,
    canViewBatches: true,
    canViewAlerts: true,
  },

  WHOLESALER: {
    // Wholesalers manage aggregated inventory from multiple farmers
    canViewOwnInventory: true,
    canCreateInventory: true,
    canEditOwnInventory: true,
    canDeleteOwnInventory: true,
    canEditInventory: true,
    canDeleteInventory: true,

    // Wholesalers manage warehouses and storage facilities
    canViewWarehouses: true,
    canManageWarehouses: true,

    // Wholesalers can see inventory from farmers they work with
    canViewAllInventory: true,
    canTransferItems: true,
    canManageInventoryTypes: true,

    // Wholesalers get advanced reporting and batch tracking
    canViewReports: true,
    canViewBatches: true,
    canViewAlerts: true,
  },

  ADMIN: {
    // Admins have full access to everything
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

    // Admin-only features
    canManageUsers: true,
    canViewAuditLogs: true,
    canAccessSystemSettings: true,
  },
}

/**
 * Helper function to check if a user has a specific permission
 */
export function hasPermission(
  userType: 'FARMER' | 'WHOLESALER' | 'ADMIN',
  permission: keyof InventoryPermissionSet
): boolean {
  // If RBAC is disabled, grant all permissions
  if (DISABLE_RBAC) {
    return true
  }

  return InventoryPermissions[userType][permission] === true
}

/**
 * Get display-friendly role names
 */
export function getRoleDisplayName(userType: 'FARMER' | 'WHOLESALER' | 'ADMIN'): string {
  const roleNames = {
    FARMER: 'Farmer',
    WHOLESALER: 'Wholesaler',
    ADMIN: 'Administrator',
  }
  return roleNames[userType] || 'User'
}

/**
 * Get role-specific dashboard titles
 */
export function getDashboardTitle(userType: 'FARMER' | 'WHOLESALER' | 'ADMIN'): string {
  const titles = {
    FARMER: 'My Farm Inventory',
    WHOLESALER: 'Warehouse Inventory',
    ADMIN: 'System Inventory Overview',
  }
  return titles[userType] || 'Inventory'
}

/**
 * Get role-specific action button labels
 */
export function getActionLabels(userType: 'FARMER' | 'WHOLESALER' | 'ADMIN') {
  const labels = {
    FARMER: {
      addItem: 'Add Harvest',
      viewItems: 'View My Harvests',
      dashboard: 'Farm Dashboard',
    },
    WHOLESALER: {
      addItem: 'Add Inventory Item',
      viewItems: 'View All Inventory',
      dashboard: 'Warehouse Dashboard',
    },
    ADMIN: {
      addItem: 'Add Inventory Item',
      viewItems: 'View All Inventory',
      dashboard: 'System Dashboard',
    },
  }
  return labels[userType] || labels.FARMER
}
