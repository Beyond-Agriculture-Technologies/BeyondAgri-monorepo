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
import { APP_COLORS } from '../../src/utils/constants'
import { RegisterRequest } from '../../src/types'

const roleOptions = [
  { value: 'farmer' as const, label: 'Farmer', icon: 'leaf', description: 'Manage your own farms and crops' },
  { value: 'wholesaler' as const, label: 'Wholesaler', icon: 'business', description: 'Access farms from multiple farmers' },
  { value: 'admin' as const, label: 'Administrator', icon: 'settings', description: 'Full system access and management' },
]

export default function RegisterScreen() {
  const insets = useSafeAreaInsets()
  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
    phone_number: '',
    user_type: 'farmer',
    name: '',
    address: '',
  })
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleRegister = async () => {
    // Validation
    if (!formData.email || !formData.password) {
      Alert.alert('Error', 'Email and password are required')
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

    setIsLoading(true)
    try {
      // Remove empty fields
      const registrationData: RegisterRequest = {
        email: formData.email,
        password: formData.password,
        user_type: formData.user_type,
        ...(formData.name && { name: formData.name }),
        ...(formData.phone_number && { phone_number: formData.phone_number }),
        ...(formData.address && { address: formData.address }),
      }

      const result = await BackendAuthService.register(registrationData)

      if (result.success) {
        Alert.alert(
          'Registration Successful',
          'Your account has been created successfully. You can now sign in.',
          [
            {
              text: 'Sign In',
              onPress: () => router.replace('/(auth)'),
            },
          ]
        )
      } else {
        Alert.alert('Registration Failed', result.error || 'Please try again')
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred')
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
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => router.back()}
              >
                <Ionicons name="arrow-back" size={24} color={APP_COLORS.text} />
              </TouchableOpacity>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join BeyondAgri to manage your agricultural operations</Text>
            </View>

            <View style={styles.form}>
              {/* User Type Selection */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Account Type</Text>
                <View style={styles.roleContainer}>
                  {roleOptions.map((role) => (
                    <TouchableOpacity
                      key={role.value}
                      style={[
                        styles.roleOption,
                        formData.user_type === role.value && styles.roleOptionSelected,
                      ]}
                      onPress={() => setFormData(prev => ({ ...prev, user_type: role.value }))}
                    >
                      <Ionicons
                        name={role.icon as any}
                        size={24}
                        color={formData.user_type === role.value ? APP_COLORS.primary : APP_COLORS.textSecondary}
                      />
                      <Text style={[
                        styles.roleLabel,
                        formData.user_type === role.value && styles.roleLabelSelected,
                      ]}>
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
                  onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
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
                  onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                  placeholder="Enter your full name"
                  autoCapitalize="words"
                />
              </View>

              {/* Phone */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={formData.phone_number}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, phone_number: text }))}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Address */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.address}
                  onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
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
                  onChangeText={(text) => setFormData(prev => ({ ...prev, password: text }))}
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

            <TouchableOpacity
              style={styles.signInLink}
              onPress={() => router.back()}
            >
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
})