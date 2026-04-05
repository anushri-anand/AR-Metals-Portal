'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchAPI } from '@/lib/api'

type MeResponse = {
  id: number
  username: string
  role: string
}

export default function HeaderUser() {
  const router = useRouter()
  const [user, setUser] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadUser() {
      try {
        const me = await fetchAPI('/accounts/me/')
        setUser(me)
      } catch {
        setError('Unable to load user')
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  function handleLogout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    router.replace('/login')
    router.refresh()
  }

  if (loading) {
    return <div className="text-sm text-slate-600">Loading user...</div>
  }

  if (!user) {
    return <div className="text-sm text-red-700">{error || 'No user found'}</div>
  }

  return (
    <div className="flex items-center gap-4">
      <div className="text-right">
        <div className="text-sm font-medium text-slate-900">{user.username}</div>
        <div className="text-xs uppercase tracking-wide text-slate-500">{user.role}</div>
      </div>

      <button
        onClick={handleLogout}
        className="rounded-lg bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
      >
        Logout
      </button>
    </div>
  )
}
