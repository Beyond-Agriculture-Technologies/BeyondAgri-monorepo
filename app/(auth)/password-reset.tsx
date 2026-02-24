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
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BackendAuthService } from '../../src/services/auth'
import { APP_COLORS } from '../../src/utils/constants'
import { FONTS } from '../../src/theme'
import { isPhoneNumber, normalizePhoneNumber } from '../../src/utils/phone-validation'
import { getErrorMessage } from '../../src/utils/error-handler'

export default function PasswordResetScreen() {
  const insets = useSafeAreaInsets()
  const [identifier, setIdentifier] = useState('')
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

  const handlePasswordReset = async () => {
    if (!identifier) {
      Alert.alert('Error', 'Please enter your email or phone number')
      return
    }

    setIsLoading(true)
    try {
      const normalizedIdentifier =
        inputType === 'phone' ? normalizePhoneNumber(identifier) : identifier

      const result = await BackendAuthService.requestPasswordReset(normalizedIdentifier)

      if (result.success) {
        const medium = inputType === 'phone' ? 'phone' : 'email'
        Alert.alert(
          'Reset Code Sent',
          `A password reset code has been sent to your ${medium}. Please check and then proceed to confirm the reset.`,
          [
            {
              text: 'Continue',
              onPress: () =>
                router.push({
                  pathname: '/(auth)/confirm-password-reset',
                  params: { email: normalizedIdentifier }, // Backend uses 'email' param for both
                }),
            },
          ]
        )
      } else {
        Alert.alert('Error', result.error || 'Failed to send reset code')
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
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={APP_COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email or phone number and we&apos;ll send you a code to reset your password
            </Text>
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
            </View>

            <TouchableOpacity
              style={[styles.resetButton, isLoading && styles.resetButtonDisabled]}
              onPress={handlePasswordReset}
              disabled={isLoading}
            >
              <Text style={styles.resetButtonText}>
                {isLoading ? 'Sending...' : 'Send Reset Code'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.backToLoginLink} onPress={() => router.back()}>
            <Text style={styles.backToLoginLinkText}>
              Remember your password? <Text style={styles.backToLoginLinkTextBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
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
    padding: 24,
    justifyContent: 'center',
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
    fontFamily: FONTS.bold,
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FONTS.regular,
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
  resetButton: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  resetButtonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    color: APP_COLORS.textOnPrimary,
    fontSize: 16,
    fontFamily: FONTS.semiBold,
  },
  backToLoginLink: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  backToLoginLinkText: {
    fontSize: 14,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
  },
  backToLoginLinkTextBold: {
    color: APP_COLORS.primary,
    fontFamily: FONTS.semiBold,
  },
})
