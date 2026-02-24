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
} from 'react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { BackendAuthService } from '../../src/services/auth'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'
import { isPhoneNumber, normalizePhoneNumber } from '../../src/utils/phone-validation'
import { getErrorMessage } from '../../src/utils/error-handler'

export default function LoginScreen() {
  const insets = useSafeAreaInsets()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [inputType, setInputType] = useState<'email' | 'phone' | null>(null)

  const handleIdentifierChange = (text: string) => {
    setIdentifier(text)

    if (text.trim().length === 0) {
      setInputType(null)
    } else if (isPhoneNumber(text)) {
      setInputType('phone')
    } else {
      setInputType('email')
    }
  }

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Error', 'Please enter your email/phone and password')
      return
    }

    setIsLoading(true)
    try {
      // Normalize phone numbers to E.164 format
      const normalizedIdentifier =
        inputType === 'phone' ? normalizePhoneNumber(identifier) : identifier

      const result = await BackendAuthService.signIn(normalizedIdentifier, password)

      if (result.success) {
        router.replace('/(tabs)')
      } else {
        // Provide more specific error messages
        const errorMessage = result.error || 'Please check your credentials'
        const isInvalidCredentials =
          errorMessage.toLowerCase().includes('invalid') ||
          errorMessage.toLowerCase().includes('incorrect') ||
          errorMessage.toLowerCase().includes('unauthorized')

        if (isInvalidCredentials) {
          Alert.alert(
            'Invalid Credentials',
            'The email or password you entered is incorrect. Please try again.',
            [
              {
                text: 'Try Again',
                style: 'cancel',
              },
              {
                text: 'Reset Password',
                onPress: () => router.push('/(auth)/password-reset'),
              },
            ]
          )
        } else {
          Alert.alert('Login Failed', errorMessage)
        }
      }
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error))
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
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>BeyondAgri</Text>
            <Text style={styles.subtitle}>Welcome back to your farm management platform</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email or Phone Number</Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={identifier}
                  onChangeText={handleIdentifierChange}
                  placeholder="Enter email or phone"
                  placeholderTextColor={APP_COLORS.placeholder}
                  keyboardType="default"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {inputType && (
                  <View style={styles.inputTypeIndicator}>
                    <Ionicons
                      name={inputType === 'email' ? 'mail-outline' : 'call-outline'}
                      size={16}
                      color={APP_COLORS.textSecondary}
                    />
                  </View>
                )}
              </View>
              {inputType === 'phone' && (
                <Text style={styles.helperText}>Format: +27821234567 or 0821234567</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={APP_COLORS.placeholder}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.loginButtonText}>{isLoading ? 'Signing In...' : 'Sign In'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.forgotPasswordLink}
              onPress={() => router.push('/(auth)/password-reset')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
              <Text style={styles.registerLinkText}>
                Don&apos;t have an account?{' '}
                <Text style={styles.registerLinkTextBold}>Create Account</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontFamily: FONTS.extraBold,
    color: APP_COLORS.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: APP_COLORS.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: FONTS.regular,
    backgroundColor: APP_COLORS.inputBackground,
    color: APP_COLORS.text,
  },
  inputTypeIndicator: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  helperText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
    marginTop: 4,
  },
  loginButton: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: APP_COLORS.textOnPrimary,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
  footer: {
    alignItems: 'center',
  },
  forgotPasswordLink: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: APP_COLORS.primary,
    fontFamily: FONTS.semiBold,
  },
  registerLinkText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
  registerLinkTextBold: {
    color: APP_COLORS.primary,
    fontFamily: FONTS.semiBold,
  },
})
