import React, { useEffect } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useWeatherStore } from '../store/weather-store'
import { useAuthStore } from '../store/auth-store'
import { useAppStore } from '../store/app-store'
import { APP_COLORS } from '../utils/constants'
import { FONTS } from '../theme'
import { GlassCard } from './ui/GlassCard'
import { GradientCard } from './ui/GradientCard'
import { ForecastDay } from '../types/weather'

function getWeatherIcon(conditionType: string, isDaytime: boolean | null): string {
  const type = conditionType.toUpperCase()
  if (type.includes('CLEAR') || type.includes('SUNNY'))
    return isDaytime === false ? 'moon' : 'sunny'
  if (type.includes('PARTLY_CLOUDY'))
    return isDaytime === false ? 'cloudy-night' : 'partly-sunny'
  if (type.includes('CLOUD') || type.includes('OVERCAST')) return 'cloudy'
  if (type.includes('RAIN') || type.includes('DRIZZLE')) return 'rainy'
  if (type.includes('THUNDER') || type.includes('STORM')) return 'thunderstorm'
  if (type.includes('SNOW') || type.includes('SLEET') || type.includes('ICE')) return 'snow'
  if (type.includes('FOG') || type.includes('HAZE') || type.includes('MIST')) return 'cloudy'
  if (type.includes('WIND')) return 'flag'
  return 'partly-sunny'
}

function getDayName(dateStr: string): string {
  // Parse YYYY-MM-DD format
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  if (date.getTime() === today.getTime()) return 'Today'
  if (date.getTime() === tomorrow.getTime()) return 'Tmrw'
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

export function WeatherWidget() {
  const { weather, isLoading, error, fetchWeather } = useWeatherStore()
  const user = useAuthStore(state => state.user)
  const isOnline = useAppStore(state => state.isOnline)

  const latitude = user?.farm_latitude
  const longitude = user?.farm_longitude

  useEffect(() => {
    if (latitude && longitude && isOnline) {
      fetchWeather(latitude, longitude)
    }
  }, [latitude, longitude, isOnline])

  // Don't render if no location is set
  if (!latitude || !longitude) return null

  // Loading state (only on first load)
  if (isLoading && !weather) {
    return (
      <GlassCard>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={APP_COLORS.info} size="small" />
          <Text style={styles.loadingText}>Loading weather...</Text>
        </View>
      </GlassCard>
    )
  }

  // Error state with no cached data
  if (error && !weather) {
    return (
      <GlassCard>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={24} color={APP_COLORS.textTertiary} />
          <Text style={styles.errorText}>Weather unavailable</Text>
        </View>
      </GlassCard>
    )
  }

  if (!weather) return null

  const { current, forecast } = weather
  const iconName = getWeatherIcon(current.weather_condition.type, current.is_daytime)

  return (
    <View style={styles.wrapper}>
      {/* Current Conditions */}
      <GradientCard
        colors={['rgba(59, 130, 246, 0.12)', 'rgba(59, 130, 246, 0.02)']}
        style={styles.currentCard}
      >
        <View style={styles.currentContent}>
          <View style={styles.currentLeft}>
            <Ionicons
              name={iconName as keyof typeof Ionicons.glyphMap}
              size={40}
              color={APP_COLORS.info}
            />
            <View style={styles.tempContainer}>
              <Text style={styles.temperature}>
                {Math.round(current.temperature_c)}°
              </Text>
              <Text style={styles.conditionText}>
                {current.weather_condition.description}
              </Text>
            </View>
          </View>
          <View style={styles.currentRight}>
            {current.relative_humidity != null && (
              <View style={styles.detailRow}>
                <Ionicons name="water" size={14} color={APP_COLORS.info} />
                <Text style={styles.detailText}>
                  {Math.round(current.relative_humidity)}%
                </Text>
              </View>
            )}
            {current.wind?.speed_kph != null && (
              <View style={styles.detailRow}>
                <Ionicons name="flag" size={14} color={APP_COLORS.textTertiary} />
                <Text style={styles.detailText}>
                  {Math.round(current.wind.speed_kph)} km/h
                </Text>
              </View>
            )}
            {current.uv_index != null && (
              <View style={styles.detailRow}>
                <Ionicons name="sunny" size={14} color={APP_COLORS.warning} />
                <Text style={styles.detailText}>UV {current.uv_index}</Text>
              </View>
            )}
          </View>
        </View>
      </GradientCard>

      {/* Forecast Row */}
      {forecast.forecast_days.length > 0 && (
        <View style={styles.forecastRow}>
          {forecast.forecast_days.slice(0, 5).map((day: ForecastDay, index: number) => {
            const dayIcon = getWeatherIcon(day.weather_condition.type, true)
            return (
              <GlassCard key={day.date || index} style={styles.forecastDay} noBorder>
                <View style={styles.forecastDayInner}>
                  <Text style={styles.forecastDayName}>{getDayName(day.date)}</Text>
                  <Ionicons
                    name={dayIcon as keyof typeof Ionicons.glyphMap}
                    size={20}
                    color={APP_COLORS.info}
                  />
                  <Text style={styles.forecastTemp}>
                    {day.max_temperature_c != null
                      ? `${Math.round(day.max_temperature_c)}°`
                      : '--'}
                  </Text>
                  <Text style={styles.forecastTempLow}>
                    {day.min_temperature_c != null
                      ? `${Math.round(day.min_temperature_c)}°`
                      : '--'}
                  </Text>
                </View>
              </GlassCard>
            )
          })}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: APP_COLORS.textSecondary,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  errorText: {
    fontFamily: FONTS.regular,
    fontSize: 14,
    color: APP_COLORS.textTertiary,
  },
  currentCard: {
    borderWidth: 1,
    borderColor: APP_COLORS.glassBorder,
  },
  currentContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tempContainer: {
    gap: 2,
  },
  temperature: {
    fontFamily: FONTS.bold,
    fontSize: 36,
    color: APP_COLORS.text,
    letterSpacing: -0.5,
  },
  conditionText: {
    fontFamily: FONTS.regular,
    fontSize: 13,
    color: APP_COLORS.textSecondary,
  },
  currentRight: {
    gap: 6,
    alignItems: 'flex-end',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    color: APP_COLORS.textSecondary,
  },
  forecastRow: {
    flexDirection: 'row',
    gap: 8,
  },
  forecastDay: {
    flex: 1,
    padding: 0,
  },
  forecastDayInner: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  forecastDayName: {
    fontFamily: FONTS.medium,
    fontSize: 11,
    color: APP_COLORS.textSecondary,
  },
  forecastTemp: {
    fontFamily: FONTS.semiBold,
    fontSize: 14,
    color: APP_COLORS.text,
  },
  forecastTempLow: {
    fontFamily: FONTS.regular,
    fontSize: 12,
    color: APP_COLORS.textTertiary,
  },
})
