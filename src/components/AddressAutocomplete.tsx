import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
  LayoutChangeEvent,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { APP_COLORS } from '../utils/constants'
import { FONTS } from '../theme'
import { geocodingApi } from '../services/geocodingApi'
import { AutocompletePrediction, GeocodeResponse } from '../types/geocoding'

function generateSessionToken(): string {
  const globalCrypto = globalThis.crypto
  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return globalCrypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

interface AddressAutocompleteProps {
  onAddressSelect: (address: GeocodeResponse) => void
  initialValue?: string
  label?: string
  placeholder?: string
}

export function AddressAutocomplete({
  onAddressSelect,
  initialValue = '',
  label,
  placeholder = 'Search for an address',
}: AddressAutocompleteProps) {
  const [inputText, setInputText] = useState(initialValue)
  const [predictions, setPredictions] = useState<AutocompletePrediction[]>([])
  const [isDropdownVisible, setIsDropdownVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [inputHeight, setInputHeight] = useState(0)

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sessionTokenRef = useRef<string>(generateSessionToken())
  const isMountedRef = useRef(true)
  const latestInputRef = useRef(initialValue)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  const fetchPredictions = async (text: string) => {
    setIsLoading(true)
    try {
      const result = await geocodingApi.autocomplete(text, sessionTokenRef.current)
      if (!isMountedRef.current || latestInputRef.current !== text) return

      if (result.success && result.data?.predictions) {
        setPredictions(result.data.predictions)
        setIsDropdownVisible(result.data.predictions.length > 0)
      } else {
        setPredictions([])
        setIsDropdownVisible(false)
      }
    } catch (err) {
      console.error('Address autocomplete error:', err)
      setPredictions([])
      setIsDropdownVisible(false)
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  const handleTextChange = (text: string) => {
    setInputText(text)
    latestInputRef.current = text

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    if (text.length < 3) {
      setPredictions([])
      setIsDropdownVisible(false)
      return
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchPredictions(text)
    }, 300)
  }

  const handlePredictionSelect = async (prediction: AutocompletePrediction) => {
    setInputText(prediction.description)
    latestInputRef.current = prediction.description
    setIsDropdownVisible(false)
    setPredictions([])
    setIsLoading(true)

    try {
      const result = await geocodingApi.geocodeByPlaceId(
        prediction.place_id,
        sessionTokenRef.current
      )

      if (result.success && result.data) {
        onAddressSelect(result.data)
      } else {
        Alert.alert('Address Error', 'Could not resolve address details. Please try again.')
      }
    } catch {
      Alert.alert('Address Error', 'Could not resolve address details. Please try again.')
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }

    sessionTokenRef.current = generateSessionToken()
  }

  const handleFocus = () => {
    sessionTokenRef.current = generateSessionToken()
    if (predictions.length > 0 && inputText.length >= 3) {
      setIsDropdownVisible(true)
    }
  }

  const handleBlur = () => {
    setTimeout(() => {
      if (isMountedRef.current) {
        setIsDropdownVisible(false)
      }
    }, 200)
  }

  const handleInputLayout = (event: LayoutChangeEvent) => {
    setInputHeight(event.nativeEvent.layout.height)
  }

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper} onLayout={handleInputLayout}>
        <TextInput
          style={[styles.input, isDropdownVisible && styles.inputFocused]}
          value={inputText}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          placeholderTextColor={APP_COLORS.placeholder}
          autoCorrect={false}
        />
        {isLoading && (
          <ActivityIndicator
            style={styles.loadingIndicator}
            size="small"
            color={APP_COLORS.primary}
          />
        )}
      </View>
      {isDropdownVisible && (
        <View style={[styles.dropdownContainer, { top: inputHeight + (label ? 28 : 0) + 4 }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.dropdownList}
          >
            {predictions.map(item => (
              <TouchableOpacity
                key={item.place_id}
                style={styles.predictionItem}
                onPress={() => handlePredictionSelect(item)}
              >
                <Ionicons name="location-outline" size={16} color={APP_COLORS.textSecondary} />
                <View style={styles.predictionTextContainer}>
                  <Text style={styles.predictionMainText}>{item.main_text}</Text>
                  <Text style={styles.predictionSecondaryText}>{item.secondary_text}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    zIndex: 1,
  },
  label: {
    fontSize: 16,
    fontFamily: FONTS.semiBold,
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  inputWrapper: {
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
  inputFocused: {
    borderColor: APP_COLORS.inputBorderFocus,
  },
  loadingIndicator: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  dropdownContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2,
    elevation: 5,
    maxHeight: 200,
    backgroundColor: APP_COLORS.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: APP_COLORS.inputBorder,
    overflow: 'hidden',
  },
  dropdownList: {
    maxHeight: 200,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.borderLight,
  },
  predictionTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  predictionMainText: {
    fontSize: 14,
    fontFamily: FONTS.medium,
    color: APP_COLORS.text,
  },
  predictionSecondaryText: {
    fontSize: 12,
    fontFamily: FONTS.regular,
    color: APP_COLORS.textSecondary,
    marginTop: 2,
  },
})
