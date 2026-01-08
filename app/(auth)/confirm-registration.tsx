import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { BackendAuthService } from '../../src/services/auth'
import { useAuthStore } from '../../src/store/auth-store'
import { APP_COLORS, OTP_CONFIG } from '../../src/utils/constants'
import {
  formatOTPCode,
  isValidOTPCode,
  calculateTimeRemaining,
  formatCountdown,
  canResendOTP,
} from '../../src/utils/otp-helpers'
import { getErrorMessage } from '../../src/utils/error-handler'

export default function ConfirmRegistrationScreen() {
  const registrationSession = useAuthStore(state => state.registrationSession)

  const [otpCode, setOTPCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(0)
  const [canResend, setCanResend] = useState(false)

  const otpInputRef = useRef<TextInput>(null)

  // Check if registration session exists
  useEffect(() => {
    if (!registrationSession) {
      Alert.alert('Error', 'No registration session found. Please register first.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/register') },
      ])
      return
    }

    // Initialize timer
    const remaining = calculateTimeRemaining(registrationSession.expiresAt)
    setTimeRemaining(remaining)
    setCanResend(canResendOTP(registrationSession.canResendAt))
  }, [registrationSession])

  // Countdown timer
  useEffect(() => {
    if (timeRemaining > 0) {
      const timer = setTimeout(() => {
        setTimeRemaining(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [timeRemaining])

  // Check if can resend
  useEffect(() => {
    if (registrationSession) {
      const checkResend = setInterval(() => {
        setCanResend(canResendOTP(registrationSession.canResendAt))
      }, 1000)
      return () => clearInterval(checkResend)
    }
  }, [registrationSession])

  const handleVerifyOTP = async () => {
    if (!registrationSession) {
      Alert.alert('Error', 'No registration session found')
      return
    }

    if (!isValidOTPCode(otpCode)) {
      Alert.alert('Invalid Code', 'Please enter a valid 6-digit verification code')
      return
    }

    setIsVerifying(true)
    try {
      const result = await BackendAuthService.confirmRegistration(
        registrationSession.email,
        otpCode
      )

      if (result.success) {
        // Clear registration session
        useAuthStore.getState().setRegistrationSession(null)

        // Show success message and navigate to login
        Alert.alert(
          'Registration Complete',
          'Your account has been created successfully. You can now sign in.',
          [
            {
              text: 'Sign In',
              onPress: () => router.replace('/(auth)'),
            },
          ]
        )
      } else {
        // Handle specific errors
        if (result.expired) {
          Alert.alert(
            'Code Expired',
            'Your verification code has expired. Please request a new one.',
            [
              {
                text: 'Resend Code',
                onPress: () => {
                  setOTPCode('')
                  handleResendOTP()
                },
              },
            ]
          )
        } else if (result.invalid) {
          Alert.alert(
            'Invalid Code',
            result.error || 'Incorrect verification code. Please try again.'
          )
          setOTPCode('')
          otpInputRef.current?.focus()
        } else if (result.alreadyConfirmed) {
          Alert.alert(
            'Already Confirmed',
            'Your account has already been confirmed. Please login.',
            [
              {
                text: 'Sign In',
                onPress: () => {
                  useAuthStore.getState().setRegistrationSession(null)
                  router.replace('/(auth)')
                },
              },
            ]
          )
        } else {
          Alert.alert('Verification Failed', result.error || 'Please try again')
        }
      }
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error))
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendOTP = async () => {
    if (!registrationSession) {
      Alert.alert('Error', 'No registration session found')
      return
    }

    if (!canResend) {
      Alert.alert('Please Wait', 'You can request a new code shortly')
      return
    }

    setIsResending(true)
    try {
      const result = await BackendAuthService.resendConfirmation(registrationSession.email)

      if (result.success) {
        // Update registration session with new expiration times
        useAuthStore.getState().setRegistrationSession({
          email: registrationSession.email,
          phoneDestination: registrationSession.phoneDestination,
          expiresAt: new Date(Date.now() + OTP_CONFIG.EXPIRY_MS),
          canResendAt: new Date(Date.now() + OTP_CONFIG.RESEND_DELAY_MS),
        })

        setTimeRemaining(OTP_CONFIG.EXPIRY_MS / 1000)
        setCanResend(false)

        Alert.alert('Code Resent', 'A new verification code has been sent to your phone')
      } else {
        if (result.notFound) {
          Alert.alert('Error', result.error || 'No registration found. Please register first.')
        } else if (result.rateLimited) {
          Alert.alert(
            'Too Many Requests',
            result.error || 'Please wait before requesting another code'
          )
        } else if (result.serverError) {
          Alert.alert(
            'Server Error',
            result.error || 'Something went wrong. Please try again later.'
          )
        } else {
          Alert.alert('Error', result.error || 'Failed to resend code')
        }
      }
    } catch (error: unknown) {
      Alert.alert('Error', getErrorMessage(error))
    } finally {
      setIsResending(false)
    }
  }

  if (!registrationSession) {
    return null
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={24} color={APP_COLORS.text} />
            </TouchableOpacity>

            <View style={styles.iconContainer}>
              <Ionicons name="phone-portrait-outline" size={64} color={APP_COLORS.primary} />
            </View>

            <Text style={styles.title}>Verify Your Phone</Text>
            <Text style={styles.subtitle}>
              We&apos;ve sent a 6-digit code to{'\n'}
              <Text style={styles.phoneNumber}>{registrationSession.phoneDestination}</Text>
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                ref={otpInputRef}
                style={styles.otpInput}
                value={formatOTPCode(otpCode)}
                onChangeText={text => {
                  const cleaned = text.replace(/\D/g, '')
                  if (cleaned.length <= OTP_CONFIG.CODE_LENGTH) {
                    setOTPCode(cleaned)
                  }
                }}
                placeholder="000 000"
                keyboardType="number-pad"
                autoFocus
                maxLength={OTP_CONFIG.CODE_LENGTH + 1} // 6 digits + 1 space
                textAlign="center"
              />

              {timeRemaining > 0 && (
                <Text style={styles.timerText}>
                  Code expires in {formatCountdown(timeRemaining)}
                </Text>
              )}

              {timeRemaining === 0 && (
                <Text style={styles.expiredText}>Code expired. Please resend.</Text>
              )}
            </View>

            <TouchableOpacity
              style={[styles.verifyButton, isVerifying && styles.verifyButtonDisabled]}
              onPress={handleVerifyOTP}
              disabled={isVerifying || otpCode.length !== OTP_CONFIG.CODE_LENGTH}
            >
              {isVerifying ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.verifyButtonText}>Verify Code</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendButton}
              onPress={handleResendOTP}
              disabled={!canResend || isResending}
            >
              {isResending ? (
                <ActivityIndicator size="small" color={APP_COLORS.primary} />
              ) : (
                <Text
                  style={[styles.resendButtonText, !canResend && styles.resendButtonTextDisabled]}
                >
                  {canResend ? 'Resend Code' : 'Resend available soon'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.helpContainer}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={APP_COLORS.textSecondary}
            />
            <Text style={styles.helpText}>
              Didn&apos;t receive the code? Check your messages or try resending
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    alignItems: 'center',
    marginBottom: 32,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 8,
    marginBottom: 16,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: APP_COLORS.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  phoneNumber: {
    fontWeight: '600',
    color: APP_COLORS.text,
  },
  form: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 20,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: APP_COLORS.text,
    marginBottom: 12,
  },
  otpInput: {
    borderWidth: 2,
    borderColor: APP_COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    fontSize: 32,
    fontWeight: 'bold',
    backgroundColor: APP_COLORS.surface,
    letterSpacing: 8,
    width: '100%',
  },
  timerText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
    marginTop: 8,
  },
  expiredText: {
    fontSize: 14,
    color: APP_COLORS.error,
    marginTop: 8,
  },
  verifyButton: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resendButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  resendButtonText: {
    fontSize: 14,
    color: APP_COLORS.primary,
    fontWeight: '600',
  },
  resendButtonTextDisabled: {
    color: APP_COLORS.textSecondary,
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
  },
  helpText: {
    fontSize: 12,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    flex: 1,
  },
})
