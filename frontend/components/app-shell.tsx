'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { navigation } from '@/lib/navigation'
import HeaderUser from '@/components/header-user'
import { fetchAPI } from '@/lib/api'

type MeResponse = {
  id: number
  username: string
  role: string
}

export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<MeResponse | null>(null)

  useEffect(() => {
    async function loadUser() {
      try {
        const me = await fetchAPI('/accounts/me/')
        setUser(me)
      } catch {
        setUser(null)
      }
    }

    loadUser()
  }, [])

  const role = user?.role

  return (
    <div className="flex min-h-screen">
      <aside className="w-72 bg-slate-900 text-white p-6">
        <h1 className="text-2xl font-bold mb-8 text-white">AR Metals</h1>

        <nav className="space-y-6">
          {navigation.map((section) => {
            const visibleItems = section.items.filter((item) =>
              role ? item.roles.includes(role) : false
            )

            if (visibleItems.length === 0) {
              return null
            }

            return (
              <div key={section.title}>
                <h2 className="text-sm uppercase tracking-widest text-slate-400 mb-2">
                  {section.title}
                </h2>
                <ul className="space-y-2 text-sm">
                  {visibleItems.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-slate-300 hover:text-white"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </nav>
      </aside>

      <main className="flex-1 bg-slate-100 text-slate-900">
        <header className="bg-white border-b border-slate-200 px-8 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              AR Metals Portal
            </h2>
            <HeaderUser />
          </div>
        </header>

        <div className="p-8">{children}</div>
      </main>
    </div>
  )
}
