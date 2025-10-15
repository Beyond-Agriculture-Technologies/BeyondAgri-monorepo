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
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { BackendAuthService } from '../../src/services/auth'
import { APP_COLORS } from '../../src/utils/constants'

export default function ConfirmPasswordResetScreen() {
  const { email } = useLocalSearchParams<{ email: string }>()
  const [confirmationCode, setConfirmationCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleConfirmReset = async () => {
    if (!confirmationCode || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields')
      return
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match')
      return
    }

    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long')
      return
    }

    setIsLoading(true)
    try {
      const result = await BackendAuthService.confirmPasswordReset(
        email || '',
        confirmationCode,
        newPassword
      )

      if (result.success) {
        Alert.alert(
          'Password Reset Successful',
          'Your password has been successfully reset. You can now sign in with your new password.',
          [
            {
              text: 'Sign In',
              onPress: () => router.replace('/(auth)'),
            },
          ]
        )
      } else {
        Alert.alert('Error', result.error || 'Failed to reset password')
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
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
            <Text style={styles.title}>Confirm Reset</Text>
            <Text style={styles.subtitle}>
              Enter the verification code sent to {email} and your new password
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Verification Code</Text>
              <TextInput
                style={styles.input}
                value={confirmationCode}
                onChangeText={setConfirmationCode}
                placeholder="Enter verification code"
                keyboardType="number-pad"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.confirmButton, isLoading && styles.confirmButtonDisabled]}
              onPress={handleConfirmReset}
              disabled={isLoading}
            >
              <Text style={styles.confirmButtonText}>
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.resendLink} onPress={() => router.back()}>
            <Text style={styles.resendLinkText}>
              Didn&apos;t receive a code? <Text style={styles.resendLinkTextBold}>Try Again</Text>
            </Text>
          </TouchableOpacity>
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
  confirmButton: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmButtonDisabled: {
    opacity: 0.6,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resendLink: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  resendLinkText: {
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  resendLinkTextBold: {
    color: APP_COLORS.primary,
    fontWeight: '600',
  },
})
