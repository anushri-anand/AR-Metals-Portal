'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { fetchAPI } from '@/lib/api'
import { canAccessPath, getDefaultPathForRole } from '@/lib/access'
import {
  getCompanySectionRoot,
  getStoredCompany,
  requiresSelectedCompany,
} from '@/lib/company'

type MeResponse = {
  role: string
}

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
        const me = (await fetchAPI('/accounts/me/')) as MeResponse

        if (!canAccessPath(me?.role, pathname)) {
          router.replace(getDefaultPathForRole(me?.role))
          return
        }

        if (requiresSelectedCompany(pathname) && !getStoredCompany()) {
          router.replace(getCompanySectionRoot(pathname) || getDefaultPathForRole(me?.role))
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
