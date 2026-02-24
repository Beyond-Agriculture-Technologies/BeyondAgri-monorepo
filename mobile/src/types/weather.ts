// Weather condition
export interface WeatherCondition {
  icon_uri: string | null
  description: string
  type: string
}

// Wind data
export interface Wind {
  direction: number | null
  speed_kph: number | null
  gust_kph: number | null
}

// Precipitation data
export interface Precipitation {
  probability: number | null
  quantity_mm: number | null
}

// Current conditions response
export interface CurrentConditionsResponse {
  temperature_c: number
  feels_like_c: number | null
  relative_humidity: number | null
  weather_condition: WeatherCondition
  wind: Wind | null
  uv_index: number | null
  precipitation: Precipitation | null
  cloud_cover: number | null
  is_daytime: boolean | null
  visibility_km: number | null
}

// Single forecast day
export interface ForecastDay {
  date: string
  max_temperature_c: number | null
  min_temperature_c: number | null
  weather_condition: WeatherCondition
  precipitation: Precipitation | null
  wind: Wind | null
  sunrise: string | null
  sunset: string | null
}

// Forecast response
export interface ForecastResponse {
  forecast_days: ForecastDay[]
}

// Combined summary response
export interface WeatherSummaryResponse {
  current: CurrentConditionsResponse
  forecast: ForecastResponse
}
