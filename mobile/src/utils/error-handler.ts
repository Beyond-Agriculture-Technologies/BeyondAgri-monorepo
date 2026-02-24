/**
 * Error handling utilities for type-safe error processing
 */

/**
 * Extracts a user-friendly error message from an unknown error
 * @param error - The error to extract the message from
 * @returns A string message that can be safely displayed
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }
  return 'An unexpected error occurred'
}

/**
 * Checks if an error is a network-related error
 * @param error - The error to check
 * @returns True if the error is network-related
 */
export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false
  }
  const message = error.message.toLowerCase()
  return (
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('connection') ||
    message.includes('timeout')
  )
}

/**
 * API error interface for structured error handling
 */
export interface ApiError {
  code: string
  message: string
  status: number
}

/**
 * Parses an API error response into a structured format
 * @param response - The API response object
 * @param status - The HTTP status code
 * @returns Structured API error
 */
export function parseApiError(response: unknown, status: number): ApiError {
  const errorObj =
    response && typeof response === 'object' ? (response as Record<string, unknown>) : {}

  const errorMessage =
    (typeof errorObj.error === 'string' ? errorObj.error : null) ||
    (typeof errorObj.message === 'string' ? errorObj.message : null) ||
    'Unknown error'

  return {
    code: (typeof errorObj.code === 'string' ? errorObj.code : null) || `HTTP_${status}`,
    message: errorMessage,
    status,
  }
}

/**
 * Gets a user-friendly error message based on error code
 * @param errorCode - The error code
 * @returns User-friendly error message
 */
export function getUserFriendlyMessage(errorCode: string): string {
  const errorMessages: Record<string, string> = {
    HTTP_400: 'Invalid request. Please check your input.',
    HTTP_401: 'Please sign in to continue.',
    HTTP_403: 'You do not have permission to perform this action.',
    HTTP_404: 'The requested resource was not found.',
    HTTP_429: 'Too many requests. Please wait before trying again.',
    HTTP_500: 'Something went wrong on our end. Please try again later.',
    NETWORK_ERROR: 'Network error. Please check your connection.',
  }

  return errorMessages[errorCode] || 'An unexpected error occurred.'
}
