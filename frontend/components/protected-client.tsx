'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { fetchAPI } from '@/lib/api'
import { getStoredCompany, isCompanyScopedPath } from '@/lib/company'

export default function ProtectedClient({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      try {
        await fetchAPI('/accounts/me/')

        if (isCompanyScopedPath(pathname) && !getStoredCompany()) {
          router.replace('/dashboard')
          return
        }
      } catch {
        router.replace('/login')
        return
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [pathname, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-800">
        Checking session...
      </div>
    )
  }

  return <>{children}</>
}
