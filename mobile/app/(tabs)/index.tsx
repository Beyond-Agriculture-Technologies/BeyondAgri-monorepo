import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuthStore } from '../../src/store/auth-store'
import { useAppStore } from '../../src/store/app-store'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'
import { dbService } from '../../src/services/database'
import { GlassCard } from '../../src/components/ui/GlassCard'
import { GradientCard } from '../../src/components/ui/GradientCard'
import { WeatherWidget } from '../../src/components/WeatherWidget'
import { useWeatherStore } from '../../src/store/weather-store'
import WholesalerHome from '../../src/components/WholesalerHome'

export default function DashboardScreen() {
  const user = useAuthStore(state => state.user)
  const userType = (user?.user_type || 'FARMER').toUpperCase()

  if (userType === 'WHOLESALER') {
    return <WholesalerHome />
  }

  return <FarmerDashboard />
}

function FarmerDashboard() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const user = useAuthStore(state => state.user)
  const { isOnline, farms, isSyncing } = useAppStore()
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState({
    totalFarms: 0,
    totalPhotos: 0,
    pendingSync: 0,
  })

  const hasProfileFarm = !!user?.farm_name

  const loadStats = async () => {
    try {
      const farms = await dbService.getFarms()
      const photos = await dbService.getPhotos()
      const offlineActions = await dbService.getOfflineActions()

      setStats({
        totalFarms: farms.length + (hasProfileFarm ? 1 : 0),
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
    const lat = user?.farm_latitude
    const lng = user?.farm_longitude
    if (lat && lng) {
      await useWeatherStore.getState().fetchWeather(lat, lng, true)
    }
    setRefreshing(false)
  }

  useEffect(() => {
    loadStats()
  }, [farms, hasProfileFarm])

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={APP_COLORS.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>Good day,</Text>
            <Text style={styles.userName}>{user?.name || 'Welcome'}</Text>
            <Text style={styles.userRole}>{getRoleDisplayName(user?.user_type || '')}</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusIndicator, isOnline ? styles.online : styles.offline]}>
              <Ionicons
                name={isOnline ? 'wifi' : 'cloud-offline'}
                size={14}
                color={isOnline ? APP_COLORS.success : APP_COLORS.warning}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isOnline ? APP_COLORS.success : APP_COLORS.warning },
                ]}
              >
                {isOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>
        </View>

        {/* Hero Card */}
        <View style={styles.heroSection}>
          <GradientCard
            colors={['rgba(34, 197, 94, 0.12)', 'rgba(34, 197, 94, 0.02)']}
            style={styles.heroCard}
          >
            <View style={styles.heroContent}>
              <View style={styles.heroIconCircle}>
                <Ionicons name="leaf" size={28} color={APP_COLORS.primary} />
              </View>
              <Text style={styles.heroTitle}>
                {stats.totalFarms === 0 ? 'Get Started' : 'Your farms are growing'}
              </Text>
              <Text style={styles.heroSubtitle}>
                {stats.totalFarms === 0
                  ? 'Add your first farm to start tracking your agriculture.'
                  : `Managing ${stats.totalFarms} farm${stats.totalFarms > 1 ? 's' : ''} with ${stats.totalPhotos} photos captured.`}
              </Text>
              <TouchableOpacity
                style={styles.heroCta}
                onPress={() =>
                  router.push(stats.totalFarms === 0 ? '/add-farm' : '/(tabs)/farms')
                }
              >
                <Text style={styles.heroCtaText}>
                  {stats.totalFarms === 0 ? 'Add Farm' : 'View Farms'}
                </Text>
                <Ionicons name="arrow-forward" size={16} color={APP_COLORS.textOnPrimary} />
              </TouchableOpacity>
            </View>
          </GradientCard>
        </View>

        {/* Weather */}
        <View style={styles.weatherSection}>
          <Text style={styles.sectionTitle}>Weather</Text>
          <WeatherWidget />
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statsGrid}>
            <GlassCard style={styles.statCardOuter}>
              <View style={styles.statCardInner}>
                <View style={[styles.statIconCircle, { backgroundColor: APP_COLORS.primaryDim }]}>
                  <Ionicons name="leaf" size={20} color={APP_COLORS.primary} />
                </View>
                <Text style={styles.statNumber}>{stats.totalFarms}</Text>
                <Text style={styles.statLabel}>Active Farms</Text>
              </View>
            </GlassCard>

            <GlassCard style={styles.statCardOuter}>
              <View style={styles.statCardInner}>
                <View style={[styles.statIconCircle, { backgroundColor: APP_COLORS.infoDim }]}>
                  <Ionicons name="camera" size={20} color={APP_COLORS.info} />
                </View>
                <Text style={styles.statNumber}>{stats.totalPhotos}</Text>
                <Text style={styles.statLabel}>Photos</Text>
              </View>
            </GlassCard>
          </View>

          {stats.pendingSync > 0 && (
            <GlassCard style={styles.syncCardOuter}>
              <View style={styles.syncRow}>
                <View style={[styles.statIconCircle, { backgroundColor: APP_COLORS.warningDim }]}>
                  <Ionicons name="sync" size={18} color={APP_COLORS.warning} />
                </View>
                <Text style={styles.syncText}>{stats.pendingSync} items pending sync</Text>
                {isSyncing && <Ionicons name="reload" size={16} color={APP_COLORS.warning} />}
              </View>
            </GlassCard>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity style={styles.actionCardWrapper} onPress={() => router.push('/add-farm')}>
              <GlassCard style={styles.actionCardOuter}>
                <View style={styles.actionCardInner}>
                  <View
                    style={[styles.actionIconCircle, { backgroundColor: APP_COLORS.primaryDim }]}
                  >
                    <Ionicons name="add-circle" size={24} color={APP_COLORS.primary} />
                  </View>
                  <Text style={styles.actionLabel}>Add Farm</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCardWrapper} onPress={() => router.push('/(tabs)/photos')}>
              <GlassCard style={styles.actionCardOuter}>
                <View style={styles.actionCardInner}>
                  <View style={[styles.actionIconCircle, { backgroundColor: APP_COLORS.infoDim }]}>
                    <Ionicons name="camera" size={24} color={APP_COLORS.info} />
                  </View>
                  <Text style={styles.actionLabel}>Take Photo</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCardWrapper} onPress={() => router.push('/(tabs)/farms')}>
              <GlassCard style={styles.actionCardOuter}>
                <View style={styles.actionCardInner}>
                  <View
                    style={[styles.actionIconCircle, { backgroundColor: APP_COLORS.successDim }]}
                  >
                    <Ionicons name="location" size={24} color={APP_COLORS.success} />
                  </View>
                  <Text style={styles.actionLabel}>View Map</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionCardWrapper} onPress={onRefresh}>
              <GlassCard style={styles.actionCardOuter}>
                <View style={styles.actionCardInner}>
                  <View
                    style={[styles.actionIconCircle, { backgroundColor: APP_COLORS.warningDim }]}
                  >
                    <Ionicons name="sync" size={24} color={APP_COLORS.warning} />
                  </View>
                  <Text style={styles.actionLabel}>Sync Data</Text>
                </View>
              </GlassCard>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
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
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontFamily: FONTS.regular,
    fontSize: 16,
    color: APP_COLORS.textSecondary,
  },
  userName: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: APP_COLORS.text,
    marginTop: 4,
    letterSpacing: -0.5,
  },
  userRole: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: APP_COLORS.primary,
    marginTop: 2,
  },
  statusContainer: {
    alignItems: 'flex-end',
    paddingTop: 4,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  online: {
    backgroundColor: APP_COLORS.successDim,
  },
  offline: {
    backgroundColor: APP_COLORS.warningDim,
  },
  statusText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    marginLeft: 4,
  },
  weatherSection: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 4,
  },
  heroSection: {
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.glassBorder,
  },
  heroContent: {
    padding: 20,
    alignItems: 'flex-start',
  },
  heroIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: APP_COLORS.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontFamily: FONTS.bold,
    fontSize: 22,
    color: APP_COLORS.text,
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: APP_COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  heroCtaText: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: APP_COLORS.textOnPrimary,
  },
  statsContainer: {
    padding: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCardOuter: {
    flex: 1,
    padding: 0,
  },
  statCardInner: {
    alignItems: 'center',
  },
  statIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontFamily: FONTS.bold,
    fontSize: 28,
    color: APP_COLORS.text,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  syncCardOuter: {
    padding: 0,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  syncText: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: APP_COLORS.warning,
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontFamily: FONTS.semiBold,
    fontSize: 18,
    color: APP_COLORS.text,
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCardWrapper: {
    width: '47%',
  },
  actionCardOuter: {
    padding: 0,
  },
  actionCardInner: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontFamily: FONTS.medium,
    fontSize: 14,
    color: APP_COLORS.text,
    textAlign: 'center',
  },
})
