const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL

export async function fetchAPI(path: string, options?: RequestInit) {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
  const isFormData =
    typeof FormData !== 'undefined' && options?.body instanceof FormData

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers || {}),
    },
    cache: 'no-store',
  })

  const contentType = response.headers.get('content-type')

  if (!response.ok) {
    const errorData =
      contentType && contentType.includes('application/json')
        ? await response.json()
        : null

    throw new Error(errorData?.detail || `API request failed: ${response.status}`)
  }

  if (contentType && contentType.includes('application/json')) {
    return response.json()
  }

  return null
}
