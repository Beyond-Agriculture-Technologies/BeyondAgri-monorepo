// Autocomplete types

export interface AutocompletePrediction {
  place_id: string
  description: string
  main_text: string
  secondary_text: string
}

export interface AutocompleteResponse {
  predictions: AutocompletePrediction[]
}

// Geocode types

export interface GeocodeResponse {
  formatted_address: string
  street: string
  city: string
  province: string
  postal_code: string
  country: string
  latitude: number
  longitude: number
  place_id: string
}
