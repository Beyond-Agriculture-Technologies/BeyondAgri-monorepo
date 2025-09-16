import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useAuthStore } from '../../src/store/authStore'
import { useAppStore } from '../../src/store/appStore'
import { BackendAuthService } from '../../src/services/backendAuth'
import { dbService } from '../../src/services/database'
import { APP_COLORS } from '../../src/utils/constants'

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user)
  const { isOnline, isSyncing, offlineActions } = useAppStore()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true)
            try {
              await BackendAuthService.signOut()
              router.replace('/(auth)')
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out')
            } finally {
              setIsLoggingOut(false)
            }
          },
        },
      ]
    )
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
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data')
            }
          },
        },
      ]
    )
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'farmer':
        return 'Farmer'
      case 'wholesaler':
        return 'Wholesaler'
      case 'admin':
        return 'Administrator'
      default:
        return 'User'
    }
  }

  const getRoleDescription = (role: string) => {
    switch (role) {
      case 'farmer':
        return 'Manage your own farms and agricultural operations'
      case 'wholesaler':
        return 'Access farms from multiple farmers for wholesale operations'
      case 'admin':
        return 'Full system access and user management capabilities'
      default:
        return 'Standard user access'
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.userSection}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={APP_COLORS.primary} />
          </View>
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleContainer}>
            <Text style={styles.roleTitle}>{getRoleDisplayName(user?.user_type || user?.role || '')}</Text>
            <Text style={styles.roleDescription}>
              {getRoleDescription(user?.user_type || user?.role || '')}
            </Text>
          </View>
        </View>

        {/* Status Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>

          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <View style={styles.statusLeft}>
                <Ionicons
                  name={isOnline ? "wifi" : "wifi-off"}
                  size={20}
                  color={isOnline ? APP_COLORS.success : APP_COLORS.warning}
                />
                <Text style={styles.statusLabel}>Connection</Text>
              </View>
              <Text style={[
                styles.statusValue,
                { color: isOnline ? APP_COLORS.success : APP_COLORS.warning }
              ]}>
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
              <Text style={styles.statusValue}>
                {isSyncing ? 'Syncing...' : 'Up to date'}
              </Text>
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
          <Text style={styles.footerText}>
            BeyondAgri Mobile v1.0.0
          </Text>
          <Text style={styles.footerSubtext}>
            Offline-first agricultural management platform
          </Text>
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
    borderBottomColor: '#e5e7eb',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: APP_COLORS.textSecondary,
    marginBottom: 16,
  },
  roleContainer: {
    alignItems: 'center',
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.primary,
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 16,
  },
  statusCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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
    color: APP_COLORS.text,
    marginLeft: 12,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '500',
    color: APP_COLORS.text,
  },
  infoCard: {
    backgroundColor: APP_COLORS.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: APP_COLORS.text,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 16,
    color: APP_COLORS.text,
    marginLeft: 12,
  },
  logoutButton: {
    marginTop: 8,
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
    fontWeight: '500',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
})