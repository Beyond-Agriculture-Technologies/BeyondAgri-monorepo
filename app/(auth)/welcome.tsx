import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { APP_COLORS } from '../../src/utils/constants'

const SCREEN_HEIGHT_BREAKPOINT = 700

export default function WelcomeScreen() {
  const { height } = useWindowDimensions()
  const isCompactLayout = height >= SCREEN_HEIGHT_BREAKPOINT

  if (isCompactLayout) {
    // Compact layout for taller screens - no scrolling needed
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.compactContent}>
          {/* Logo/Brand Section - Compact */}
          <View style={styles.logoSectionCompact}>
            <View style={styles.logoContainerCompact}>
              <Ionicons name="leaf" size={48} color={APP_COLORS.primary} />
            </View>
            <Text style={styles.appNameCompact}>BeyondAgri</Text>
            <Text style={styles.taglineCompact}>Empowering African Agriculture</Text>
          </View>

          {/* Features Section - All 4 features */}
          <View style={styles.featuresSectionCompact}>
            <FeatureItem
              icon="trending-up"
              title="Track Inventory"
              description="Manage produce and warehouse inventory"
              compact
            />
            <FeatureItem
              icon="people"
              title="Connect Markets"
              description="Link farmers with wholesalers"
              compact
            />
            <FeatureItem
              icon="shield-checkmark"
              title="Secure & Reliable"
              description="Safe data with offline functionality"
              compact
            />
            <FeatureItem
              icon="analytics"
              title="Smart Insights"
              description="Get reports and alerts for decisions"
              compact
            />
          </View>

          {/* CTA Buttons */}
          <View style={styles.buttonSectionCompact}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/(auth)/register')}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>Create Account</Text>
              <Ionicons name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/(auth)')}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Footer - Compact */}
          <View style={styles.footerCompact}>
            <Text style={styles.footerTextCompact}>Terms & Privacy Policy</Text>
          </View>
        </View>
      </SafeAreaView>
    )
  }

  // Full layout with ScrollView for smaller screens
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Logo/Brand Section */}
        <View style={styles.logoSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="leaf" size={64} color={APP_COLORS.primary} />
          </View>
          <Text style={styles.appName}>BeyondAgri</Text>
          <Text style={styles.tagline}>Empowering African Agriculture</Text>
        </View>

        {/* Features Section - All 4 features */}
        <View style={styles.featuresSection}>
          <FeatureItem
            icon="trending-up"
            title="Track Inventory"
            description="Manage your farm produce and warehouse inventory in real-time"
          />
          <FeatureItem
            icon="people"
            title="Connect Markets"
            description="Link farmers with wholesalers across the supply chain"
          />
          <FeatureItem
            icon="shield-checkmark"
            title="Secure & Reliable"
            description="Your data is safe with offline-first functionality"
          />
          <FeatureItem
            icon="analytics"
            title="Smart Insights"
            description="Get reports and alerts to make better business decisions"
          />
        </View>

        {/* CTA Buttons */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/register')}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>Create Account</Text>
            <Ionicons name="arrow-forward" size={20} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/(auth)')}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap
  title: string
  description: string
  compact?: boolean
}

function FeatureItem({ icon, title, description, compact }: FeatureItemProps) {
  return (
    <View style={compact ? styles.featureItemCompact : styles.featureItem}>
      <View style={compact ? styles.featureIconCompact : styles.featureIcon}>
        <Ionicons name={icon} size={compact ? 20 : 24} color={APP_COLORS.primary} />
      </View>
      <View style={styles.featureContent}>
        <Text style={compact ? styles.featureTitleCompact : styles.featureTitle}>{title}</Text>
        <Text style={compact ? styles.featureDescriptionCompact : styles.featureDescription}>
          {description}
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  logoSection: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: APP_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  featuresSection: {
    paddingVertical: 24,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
    paddingTop: 4,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    lineHeight: 20,
  },
  buttonSection: {
    paddingTop: 16,
    gap: 16,
  },
  primaryButton: {
    backgroundColor: APP_COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    shadowColor: APP_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: APP_COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: APP_COLORS.primary,
  },
  footer: {
    paddingTop: 32,
    paddingBottom: 16,
  },
  footerText: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  // Compact layout styles for taller screens (≥700px)
  compactContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  logoSectionCompact: {
    alignItems: 'center',
    paddingTop: 20,
  },
  logoContainerCompact: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: APP_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  appNameCompact: {
    fontSize: 28,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginBottom: 6,
  },
  taglineCompact: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  featuresSectionCompact: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  featureItemCompact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  featureIconCompact: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureTitleCompact: {
    fontSize: 15,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 2,
  },
  featureDescriptionCompact: {
    fontSize: 13,
    color: APP_COLORS.textSecondary,
    lineHeight: 18,
  },
  buttonSectionCompact: {
    gap: 12,
    paddingBottom: 8,
  },
  footerCompact: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  footerTextCompact: {
    fontSize: 11,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
})
