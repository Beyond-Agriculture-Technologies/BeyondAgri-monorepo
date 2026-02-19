import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useAuthStore } from '../../src/store/auth-store'
import { useAppStore } from '../../src/store/app-store'
import { BackendAuthService } from '../../src/services/auth'
import { dbService } from '../../src/services/database'
import { apiClient } from '../../src/services/api'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'
import { VerificationStatus, UserRole, Permission } from '../../src/types'
import { GeocodeResponse } from '../../src/types/geocoding'
import { AddressAutocomplete } from '../../src/components/AddressAutocomplete'

export default function ProfileScreen() {
  const user = useAuthStore(state => state.user)
  const { isOnline, isSyncing, offlineActions } = useAppStore()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null)
  const [userRoles, setUserRoles] = useState<UserRole[]>([])
  const [_permissions, setPermissions] = useState<Permission[]>([])
  const [loadingAccountData, setLoadingAccountData] = useState(false)
  const [isEditingAddress, setIsEditingAddress] = useState(false)
  const [addressData, setAddressData] = useState<GeocodeResponse | null>(null)
  const [isSavingAddress, setIsSavingAddress] = useState(false)

  useEffect(() => {
    if (isOnline && user) {
      loadAccountData()
    }
  }, [isOnline, user])

  const loadAccountData = async () => {
    if (!isOnline) return

    setLoadingAccountData(true)
    try {
      // Load verification status
      const verificationResult = await apiClient.getVerificationStatus()
      if (verificationResult.success) {
        setVerificationStatus(verificationResult.data as VerificationStatus)
      }

      // Load user roles
      const rolesResult = await apiClient.getUserRoles()
      if (rolesResult.success) {
        setUserRoles((rolesResult.data as UserRole[]) || [])
      }

      // Load permissions
      const permissionsResult = await apiClient.getUserPermissions()
      if (permissionsResult.success) {
        setPermissions((permissionsResult.data as Permission[]) || [])
      }
    } catch (error) {
      console.error('Failed to load account data:', error)
    } finally {
      setLoadingAccountData(false)
    }
  }

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setIsLoggingOut(true)
          try {
            await BackendAuthService.signOut()
            router.replace('/(auth)')
          } catch (_error) {
            Alert.alert('Error', 'Failed to sign out')
          } finally {
            setIsLoggingOut(false)
          }
        },
      },
    ])
  }

  const handleClearData = () => {
    Alert.alert(
      'Clear Local Data',
      'This will remove all locally stored farms and photos. Data that has been synced to the server will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await dbService.clearAllData()
              Alert.alert('Success', 'Local data has been cleared')
            } catch (_error) {
              Alert.alert('Error', 'Failed to clear data')
            }
          },
        },
      ]
    )
  }

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will deactivate your account and disable login access. Your account can be recovered within 30 days by contacting support. After 30 days, your data may be permanently deleted.\n\nAre you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            // Second confirmation
            Alert.alert(
              'Final Confirmation',
              'This action will immediately deactivate your account. You will be signed out and unable to sign in until your account is recovered.\n\nDo you want to proceed?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const result = await apiClient.deactivateAccount()

                      if (result.success) {
                        Alert.alert(
                          'Account Deleted',
                          'Your account has been deactivated. Contact support within 30 days if you want to recover it.',
                          [
                            {
                              text: 'OK',
                              onPress: async () => {
                                await BackendAuthService.signOut()
                                router.replace('/(auth)')
                              },
                            },
                          ],
                          { cancelable: false }
                        )
                      } else {
                        Alert.alert(
                          'Error',
                          result.message || 'Failed to delete account. Please try again.'
                        )
                      }
                    } catch (_error) {
                      Alert.alert('Error', 'An unexpected error occurred. Please try again.')
                    }
                  },
                },
              ]
            )
          },
        },
      ]
    )
  }

  const handleSaveAddress = async () => {
    if (!addressData || !isOnline) return

    setIsSavingAddress(true)
    try {
      const result = await apiClient.updateUserProfile({
        profile: {
          address: addressData.formatted_address,
        },
        farmer_profile: {
          farm_address: addressData.formatted_address,
          farm_latitude: addressData.latitude,
          farm_longitude: addressData.longitude,
          farm_place_id: addressData.place_id,
        },
      })

      if (result.success) {
        // Refetch user from backend to confirm address was persisted
        const updatedUser = await BackendAuthService.getCurrentUser()
        if (updatedUser) {
          useAuthStore.getState().setUser(updatedUser)
        }
        setIsEditingAddress(false)
        setAddressData(null)
        Alert.alert('Success', 'Address updated successfully')
      } else {
        Alert.alert('Error', result.message || 'Failed to update address')
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setIsSavingAddress(false)
    }
  }

  const getRoleDisplayName = (role: string) => {
    switch (role.toUpperCase()) {
      case 'FARMER':
        return 'Farmer'
      case 'WHOLESALER':
        return 'Wholesaler'
      case 'ADMIN':
        return 'Administrator'
      default:
        return 'User'
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role.toUpperCase()) {
      case 'FARMER':
        return 'Manage your own farms and agricultural operations'
      case 'WHOLESALER':
        return 'Access farms from multiple farmers for wholesale operations'
      case 'ADMIN':
        return 'Full system access and user management capabilities'
      default:
        return 'Standard user access'
    }
  }

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return APP_COLORS.success
      case 'pending':
        return APP_COLORS.warning
      case 'rejected':
        return APP_COLORS.error
      default:
        return APP_COLORS.textSecondary
    }
  }

  const getVerificationStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return 'checkmark-circle'
      case 'pending':
        return 'time'
      case 'rejected':
        return 'close-circle'
      default:
        return 'help-circle'
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* User Info */}
        <View style={styles.userSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={APP_COLORS.primary} />
          </View>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleContainer}>
            <Text style={styles.roleTitle}>{getRoleDisplayName(user?.user_type || '')}</Text>
            <Text style={styles.roleDescription}>{getRoleDescription(user?.user_type || '')}</Text>
          </View>
        </View>

        {/* Verification Status Section */}
        {isOnline && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Verification</Text>
            <View style={styles.verificationCard}>
              {loadingAccountData ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading verification status...</Text>
                </View>
              ) : verificationStatus ? (
                <View style={styles.verificationRow}>
                  <View style={styles.verificationLeft}>
                    <Ionicons
                      name={getVerificationStatusIcon(verificationStatus.status)}
                      size={20}
                      color={getVerificationStatusColor(verificationStatus.status)}
                    />
                    <Text style={styles.verificationLabel}>Status</Text>
                  </View>
                  <Text
                    style={[
                      styles.verificationValue,
                      { color: getVerificationStatusColor(verificationStatus.status) },
                    ]}
                  >
                    {verificationStatus.status
                      ? verificationStatus.status.charAt(0).toUpperCase() +
                        verificationStatus.status.slice(1)
                      : 'Unknown'}
                  </Text>
                </View>
              ) : (
                <View style={styles.verificationRow}>
                  <View style={styles.verificationLeft}>
                    <Ionicons
                      name="information-circle"
                      size={20}
                      color={APP_COLORS.textSecondary}
                    />
                    <Text style={styles.verificationLabel}>Status</Text>
                  </View>
                  <Text style={styles.verificationValue}>Not Available</Text>
                </View>
              )}

              {userRoles.length > 0 && (
                <View style={styles.verificationRow}>
                  <View style={styles.verificationLeft}>
                    <Ionicons name="shield-checkmark" size={20} color={APP_COLORS.primary} />
                    <Text style={styles.verificationLabel}>Roles</Text>
                  </View>
                  <Text style={styles.verificationValue}>
                    {userRoles.map(role => role.role_name).join(', ')}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Address Section */}
        {isOnline && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Address</Text>
            <View style={styles.addressCard}>
              {isEditingAddress ? (
                <View style={{ zIndex: 1 }}>
                  <AddressAutocomplete
                    placeholder="Search for your address"
                    initialValue={user?.farm_address || user?.address || ''}
                    onAddressSelect={(address: GeocodeResponse) => {
                      setAddressData(address)
                    }}
                  />
                  <View style={styles.addressActions}>
                    <TouchableOpacity
                      style={styles.addressCancelButton}
                      onPress={() => {
                        setIsEditingAddress(false)
                        setAddressData(null)
                      }}
                    >
                      <Text style={styles.addressCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.addressSaveButton,
                        (!addressData || isSavingAddress) && styles.addressSaveButtonDisabled,
                      ]}
                      onPress={handleSaveAddress}
                      disabled={!addressData || isSavingAddress}
                    >
                      <Text style={styles.addressSaveText}>
                        {isSavingAddress ? 'Saving...' : 'Save'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.addressDisplay}>
                  <View style={styles.addressTextContainer}>
                    <Ionicons name="location-outline" size={20} color={APP_COLORS.primary} />
                    <Text style={styles.addressText}>
                      {user?.farm_address || user?.address || 'No address set'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addressEditButton}
                    onPress={() => setIsEditingAddress(true)}
                  >
                    <Ionicons name="pencil" size={16} color={APP_COLORS.primary} />
                    <Text style={styles.addressEditText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>

          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusLeft}>
                <Ionicons
                  name={isOnline ? 'wifi' : 'cloud-offline'}
                  size={20}
                  color={isOnline ? APP_COLORS.success : APP_COLORS.warning}
                />
                <Text style={styles.statusLabel}>Connection</Text>
              </View>
              <Text
                style={[
                  styles.statusValue,
                  { color: isOnline ? APP_COLORS.success : APP_COLORS.warning },
                ]}
              >
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>

            <View style={styles.statusRow}>
              <View style={styles.statusLeft}>
                <Ionicons
                  name="sync"
                  size={20}
                  color={isSyncing ? APP_COLORS.primary : APP_COLORS.textSecondary}
                />
                <Text style={styles.statusLabel}>Sync Status</Text>
              </View>
              <Text style={styles.statusValue}>{isSyncing ? 'Syncing...' : 'Up to date'}</Text>
            </View>

            {offlineActions.length > 0 && (
              <View style={styles.statusRow}>
                <View style={styles.statusLeft}>
                  <Ionicons name="time" size={20} color={APP_COLORS.warning} />
                  <Text style={styles.statusLabel}>Pending Actions</Text>
                </View>
                <Text style={[styles.statusValue, { color: APP_COLORS.warning }]}>
                  {offlineActions.length} items
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Database</Text>
              <Text style={styles.infoValue}>SQLite</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Authentication</Text>
              <Text style={styles.infoValue}>Backend API</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          {isOnline && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={loadAccountData}
              disabled={loadingAccountData}
            >
              <View style={styles.actionLeft}>
                <Ionicons name="refresh" size={20} color={APP_COLORS.primary} />
                <Text style={styles.actionText}>
                  {loadingAccountData ? 'Refreshing Account...' : 'Refresh Account Data'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.actionButton}>
            <View style={styles.actionLeft}>
              <Ionicons name="sync" size={20} color={APP_COLORS.primary} />
              <Text style={styles.actionText}>Force Sync</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleClearData}>
            <View style={styles.actionLeft}>
              <Ionicons name="trash" size={20} color={APP_COLORS.warning} />
              <Text style={styles.actionText}>Clear Local Data</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textSecondary} />
          </TouchableOpacity>

          {isOnline && (
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteAccountButton]}
              onPress={handleDeleteAccount}
            >
              <View style={styles.actionLeft}>
                <Ionicons name="close-circle" size={20} color={APP_COLORS.error} />
                <Text style={[styles.actionText, styles.deleteAccountText]}>Delete Account</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textSecondary} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            <View style={styles.actionLeft}>
              <Ionicons name="log-out" size={20} color={APP_COLORS.error} />
              <Text style={[styles.actionText, styles.logoutText]}>
                {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={APP_COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>BeyondAgri Mobile v1.0.0</Text>
          <Text style={styles.footerSubtext}>Offline-first agricultural management platform</Text>
        </View>
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
  userSection: {
    backgroundColor: APP_COLORS.surface,
    padding: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: APP_COLORS.primaryDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontFamily: FONTS.bold,
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
    marginBottom: 16,
  },
  roleContainer: {
    alignItems: 'center',
  },
  roleTitle: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.primary,
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: APP_COLORS.text,
    marginLeft: 12,
  },
  statusValue: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: APP_COLORS.text,
  },
  infoCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderLight,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: APP_COLORS.text,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: APP_COLORS.textSecondary,
  },
  actionButton: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: APP_COLORS.text,
    marginLeft: 12,
  },
  deleteAccountButton: {
    marginTop: 8,
  },
  deleteAccountText: {
    color: APP_COLORS.error,
  },
  logoutButton: {
    marginTop: 8,
    backgroundColor: APP_COLORS.errorDim,
    borderColor: APP_COLORS.errorDim,
  },
  logoutText: {
    color: APP_COLORS.error,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
  verificationCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  verificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  verificationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationLabel: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: APP_COLORS.text,
    marginLeft: 12,
  },
  verificationValue: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: APP_COLORS.text,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
  },
  addressCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  addressDisplay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: APP_COLORS.text,
    marginLeft: 12,
    flex: 1,
  },
  addressEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addressEditText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: APP_COLORS.primary,
    marginLeft: 4,
  },
  addressActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  addressCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  addressCancelText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: APP_COLORS.textSecondary,
  },
  addressSaveButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: APP_COLORS.primary,
  },
  addressSaveButtonDisabled: {
    opacity: 0.5,
  },
  addressSaveText: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.textOnPrimary,
  },
})
