'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchAPI } from '@/lib/api'

type MeResponse = {
  id: number
  username: string
  role: string
}

export default function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: string[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    async function checkRole() {
      try {
        const user = await fetchAPI('/accounts/me/') as MeResponse

        if (allowedRoles.includes(user.role)) {
          setAuthorized(true)
        } else {
          router.replace('/dashboard')
        }
      } catch {
        router.replace('/login')
      } finally {
        setLoading(false)
      }
    }

    checkRole()
  }, [allowedRoles, router])

  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <p className="text-slate-700">Checking permissions...</p>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return <>{children}</>
}
