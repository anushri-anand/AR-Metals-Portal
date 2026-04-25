const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api'

function getApiBaseUrl() {
  if (typeof window === 'undefined') {
    return API_BASE_URL
  }

  try {
    const configuredUrl = new URL(API_BASE_URL)
    const currentHost = window.location.hostname
    const isLocalBackendHost =
      configuredUrl.hostname === 'localhost' || configuredUrl.hostname === '127.0.0.1'
    const isLocalFrontendHost = currentHost === 'localhost' || currentHost === '127.0.0.1'

    if (isLocalBackendHost && !isLocalFrontendHost) {
      configuredUrl.hostname = currentHost
    }

    return configuredUrl.toString().replace(/\/$/, '')
  } catch {
    return API_BASE_URL.replace(/\/$/, '')
  }
}

export async function fetchAPI(path: string, options?: RequestInit) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const company =
    typeof window !== 'undefined' ? localStorage.getItem('selected_company') : null
  const response = await doFetch(path, options, token, company)

  if (
    response.status === 401 &&
    typeof window !== 'undefined' &&
    !path.startsWith('/accounts/login/') &&
    !path.startsWith('/accounts/refresh/')
  ) {
    const refreshedAccessToken = await refreshAccessToken()

    if (refreshedAccessToken) {
      const retryResponse = await doFetch(
        path,
        options,
        refreshedAccessToken,
        company
      )

      return handleResponse(retryResponse)
    }
  }

  return handleResponse(response)
}

async function doFetch(
  path: string,
  options: RequestInit | undefined,
  token: string | null,
  company: string | null
) {
  const shouldSendCompanyHeader = Boolean(company) && !path.startsWith('/accounts/')
  const isFormData =
    typeof FormData !== 'undefined' && options?.body instanceof FormData
  const headers = new Headers(options?.headers)

  if (!isFormData) {
    headers.set('Content-Type', 'application/json')
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  if (shouldSendCompanyHeader && company) {
    headers.set('X-Company', company)
  }

  return fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  })
}

async function handleResponse(response: Response) {
  const contentType = response.headers.get('content-type')

  if (!response.ok) {
    const errorData =
      contentType && contentType.includes('application/json')
        ? await response.json()
        : null

    const errorMessage = extractErrorMessage(errorData)

    throw new Error(errorMessage || `API request failed: ${response.status}`)
  }

  if (contentType && contentType.includes('application/json')) {
    return response.json()
  }

  return null
}

async function refreshAccessToken() {
  if (typeof window === 'undefined') {
    return null
  }

  const refreshToken = localStorage.getItem('refresh_token')

  if (!refreshToken) {
    clearAuthTokens()
    return null
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/accounts/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh: refreshToken,
      }),
      cache: 'no-store',
    })

    if (!response.ok) {
      clearAuthTokens()
      return null
    }

    const data = await response.json()
    const nextAccessToken = data.access as string | undefined
    const nextRefreshToken = data.refresh as string | undefined

    if (!nextAccessToken) {
      clearAuthTokens()
      return null
    }

    localStorage.setItem('access_token', nextAccessToken)

    if (nextRefreshToken) {
      localStorage.setItem('refresh_token', nextRefreshToken)
    }

    return nextAccessToken
  } catch {
    clearAuthTokens()
    return null
  }
}

function clearAuthTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

function extractErrorMessage(value: unknown): string {
  if (!value) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map(extractErrorMessage).filter(Boolean).join(' ')
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value)

    for (const [key, nestedValue] of entries) {
      const nestedMessage = extractErrorMessage(nestedValue)

      if (!nestedMessage) {
        continue
      }

      if (key === 'detail' || key === 'non_field_errors') {
        return nestedMessage
      }

      return `${humanizeErrorKey(key)}: ${nestedMessage}`
    }
  }

  return ''
}

function humanizeErrorKey(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}
