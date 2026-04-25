'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchAPI } from '@/lib/api'
import { clearStoredCompany } from '@/lib/company'

type LoginResponse = {
  access: string
  refresh: string
}

export default function LoginForm() {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const data = await fetchAPI('/accounts/login/', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
        }),
      }) as LoginResponse

      localStorage.setItem('access_token', data.access)
      localStorage.setItem('refresh_token', data.refresh)
      clearStoredCompany()

      router.replace('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Login</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 text-white px-4 py-2 hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Signing in...' : 'Login'}
          </button>

          {error && <p className="text-red-700 text-sm">{error}</p>}
        </form>
      </div>
    </div>
  )
}
