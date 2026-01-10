import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BackendAuthService } from '../../src/services/auth'
import { useAuthStore } from '../../src/store/auth-store'
import { APP_COLORS, OTP_CONFIG } from '../../src/utils/constants'
import { RegisterRequest } from '../../src/types'
import { isValidPhoneNumber, normalizePhoneNumber } from '../../src/utils/phone-validation'
import { getErrorMessage } from '../../src/utils/error-handler'

const roleOptions = [
  {
    value: 'FARMER' as const,
    label: 'Farmer',
    icon: 'leaf',
    description: 'Manage your own farms and crops',
  },
  {
    value: 'WHOLESALER' as const,
    label: 'Wholesaler',
    icon: 'business',
    description: 'Access farms from multiple farmers',
  },
  {
    value: 'ADMIN' as const,
    label: 'Administrator',
    icon: 'settings',
    description: 'Full system access and management',
  },
]

export default function RegisterScreen() {
  const insets = useSafeAreaInsets()
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
    phone_number: '',
    user_type: 'FARMER',
    name: '',
    address: '',
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleRegister = async () => {
    // Validation (email, password, phone REQUIRED)
    if (!formData.email || !formData.password || !formData.phone_number) {
      Alert.alert('Error', 'Email, password, and phone number are required')
      return
    }

    if (formData.password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }

    if (formData.password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long')
      return
    }

    // Validate phone format
    if (!isValidPhoneNumber(formData.phone_number)) {
      Alert.alert('Invalid Phone Number', 'Please use format: +27XXXXXXXXX or 0XXXXXXXXX')
      return
    }

    setIsLoading(true)
    try {
      // Prepare registration data
      const registrationData: RegisterRequest = {
        email: formData.email,
        password: formData.password,
        user_type: formData.user_type,
        phone_number: normalizePhoneNumber(formData.phone_number),
        ...(formData.name && { name: formData.name }),
        ...(formData.address && { address: formData.address }),
      }

      const result = await BackendAuthService.register(registrationData)

      if (result.success && result.status === 202 && result.data) {
        // Store registration session
        useAuthStore.getState().setRegistrationSession({
          email: formData.email,
          phoneDestination: result.data.code_delivery_destination,
          expiresAt: new Date(Date.now() + OTP_CONFIG.EXPIRY_MS),
          canResendAt: new Date(Date.now() + OTP_CONFIG.RESEND_DELAY_MS),
        })

        // Navigate to confirmation screen
        router.push('/(auth)/confirm-registration')
      } else {
        // Handle unexpected response
        Alert.alert('Error', 'Unexpected response from server. Please try again.')
      }
    } catch (error: unknown) {
      // Handle errors
      const errorMessage = getErrorMessage(error)

      if (
        errorMessage.toLowerCase().includes('already exists') ||
        errorMessage.toLowerCase().includes('already registered')
      ) {
        Alert.alert(
          'Email Already Registered',
          'This email is already registered. Would you like to sign in instead?',
          [
            {
              text: 'Use Different Email',
              style: 'cancel',
            },
            {
              text: 'Sign In',
              onPress: () => router.replace('/(auth)'),
            },
          ]
        )
      } else if (errorMessage.toLowerCase().includes('invalid phone')) {
        Alert.alert('Invalid Phone', 'Please use format: +27XXXXXXXXX or 0XXXXXXXXX')
      } else {
        Alert.alert('Registration Failed', errorMessage)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.header}>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color={APP_COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Join BeyondAgri to manage your agricultural operations
              </Text>
            </View>

            <View style={styles.form}>
              {/* User Type Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Account Type</Text>
                <View style={styles.roleContainer}>
                  {roleOptions.map(role => (
                    <TouchableOpacity
                      key={role.value}
                      style={[
                        styles.roleOption,
                        formData.user_type === role.value && styles.roleOptionSelected,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, user_type: role.value }))}
                    >
                      <Ionicons
                        name={role.icon as keyof typeof Ionicons.glyphMap}
                        size={24}
                        color={
                          formData.user_type === role.value
                            ? APP_COLORS.primary
                            : APP_COLORS.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.roleLabel,
                          formData.user_type === role.value && styles.roleLabelSelected,
                        ]}
                      >
                        {role.label}
                      </Text>
                      <Text style={styles.roleDescription}>{role.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.email}
                  onChangeText={text => setFormData(prev => ({ ...prev, email: text }))}
                  placeholder="Enter your email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={text => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="Enter your full name"
                  autoCapitalize="words"
                />
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone_number}
                  onChangeText={text => setFormData(prev => ({ ...prev, phone_number: text }))}
                  placeholder="+27821234567 or 0821234567"
                  keyboardType="phone-pad"
                />
                <Text style={styles.helperText}>You will receive a verification code via SMS</Text>
              </View>

              {/* Address */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.address}
                  onChangeText={text => setFormData(prev => ({ ...prev, address: text }))}
                  placeholder="Enter your address"
                  multiline
                  numberOfLines={3}
                />
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.password}
                  onChangeText={text => setFormData(prev => ({ ...prev, password: text }))}
                  placeholder="Enter your password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password *</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your password"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <TouchableOpacity
                style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                <Text style={styles.registerButtonText}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.signInLink} onPress={() => router.back()}>
              <Text style={styles.signInLinkText}>
                Already have an account? <Text style={styles.signInLinkTextBold}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: APP_COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingTop: 16,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: APP_COLORS.textSecondary,
    lineHeight: 22,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: APP_COLORS.surface,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  roleContainer: {
    gap: 12,
  },
  roleOption: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: APP_COLORS.surface,
    alignItems: 'center',
  },
  roleOptionSelected: {
    borderColor: APP_COLORS.primary,
    backgroundColor: '#f0fdf4',
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginTop: 8,
    marginBottom: 4,
  },
  roleLabelSelected: {
    color: APP_COLORS.primary,
  },
  roleDescription: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
  registerButton: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  signInLink: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  signInLinkText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  signInLinkTextBold: {
    color: APP_COLORS.primary,
    fontWeight: '600',
  },
  helperText: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    marginTop: 4,
  },
})
