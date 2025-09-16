import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../src/store/authStore'
import { useAppStore } from '../../src/store/appStore'
import { APP_COLORS } from '../../src/utils/constants'
import { dbService } from '../../src/services/database'

export default function DashboardScreen() {
  const user = useAuthStore((state) => state.user)
  const { isOnline, farms, isSyncing } = useAppStore()
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    totalFarms: 0,
    totalPhotos: 0,
    pendingSync: 0,
  })

  const loadStats = async () => {
    try {
      const farms = await dbService.getFarms()
      const photos = await dbService.getPhotos()
      const offlineActions = await dbService.getOfflineActions()

      setStats({
        totalFarms: farms.length,
        totalPhotos: photos.length,
        pendingSync: offlineActions.length,
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadStats()
    setRefreshing(false)
  }

  useEffect(() => {
    loadStats()
  }, [farms])

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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good day,</Text>
            <Text style={styles.userName}>{user?.name || 'Welcome'}</Text>
            <Text style={styles.userRole}>{getRoleDisplayName(user?.role || '')}</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, isOnline ? styles.online : styles.offline]}>
              <Ionicons
                name={isOnline ? "wifi" : "wifi-off"}
                size={16}
                color="white"
              />
              <Text style={styles.statusText}>
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.primaryCard]}>
              <Ionicons name="leaf" size={24} color={APP_COLORS.primary} />
              <Text style={styles.statNumber}>{stats.totalFarms}</Text>
              <Text style={styles.statLabel}>Active Farms</Text>
            </View>

            <View style={[styles.statCard, styles.secondaryCard]}>
              <Ionicons name="camera" size={24} color={APP_COLORS.secondary} />
              <Text style={styles.statNumber}>{stats.totalPhotos}</Text>
              <Text style={styles.statLabel}>Photos</Text>
            </View>
          </View>

          {stats.pendingSync > 0 && (
            <View style={[styles.statCard, styles.warningCard, styles.fullWidth]}>
              <View style={styles.syncRow}>
                <Ionicons name="sync" size={20} color={APP_COLORS.warning} />
                <Text style={styles.syncText}>
                  {stats.pendingSync} items pending sync
                </Text>
                {isSyncing && (
                  <Ionicons name="reload" size={16} color={APP_COLORS.warning} />
                )}
              </View>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="add-circle" size={32} color={APP_COLORS.primary} />
              <Text style={styles.actionLabel}>Add Farm</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="camera" size={32} color={APP_COLORS.secondary} />
              <Text style={styles.actionLabel}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="location" size={32} color={APP_COLORS.success} />
              <Text style={styles.actionLabel}>View Map</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCard}>
              <Ionicons name="sync" size={32} color={APP_COLORS.warning} />
              <Text style={styles.actionLabel}>Sync Data</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <Text style={styles.activityText}>
              {stats.totalFarms === 0
                ? "No farms added yet. Start by adding your first farm!"
                : "Your farms are ready for management. Add photos and track your progress."
              }
            </Text>
          </View>
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
  header: {
    padding: 20,
    backgroundColor: APP_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 16,
    color: APP_COLORS.textSecondary,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginTop: 4,
  },
  userRole: {
    fontSize: 14,
    color: APP_COLORS.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  online: {
    backgroundColor: APP_COLORS.success,
  },
  offline: {
    backgroundColor: APP_COLORS.warning,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  statsContainer: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: APP_COLORS.surface,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryCard: {
    borderLeftWidth: 4,
    borderLeftColor: APP_COLORS.primary,
  },
  secondaryCard: {
    borderLeftWidth: 4,
    borderLeftColor: APP_COLORS.secondary,
  },
  warningCard: {
    borderLeftWidth: 4,
    borderLeftColor: APP_COLORS.warning,
  },
  fullWidth: {
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncText: {
    fontSize: 14,
    color: APP_COLORS.warning,
    marginLeft: 8,
    marginRight: 8,
    fontWeight: '500',
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: APP_COLORS.surface,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionLabel: {
    fontSize: 14,
    color: APP_COLORS.text,
    marginTop: 8,
    fontWeight: '500',
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: APP_COLORS.surface,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activityText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
  },
})