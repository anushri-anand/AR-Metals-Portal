'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { fetchAPI } from '@/lib/api'
import { navigation, type AppRole } from '@/lib/navigation'
import HeaderUser from '@/components/header-user'
import BackButton from '@/components/back-button'

type MeResponse = {
  id: number
  username: string
  role: AppRole
}

export default function AppShell({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
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

  const filteredNavigation = navigation
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        user ? item.roles.includes(user.role) : false
      ),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="w-80 shrink-0 bg-slate-900 p-6 text-white">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">AR Metals</h1>
          <p className="text-sm text-slate-300 mt-1">Operations Portal</p>
        </div>

        <nav className="space-y-6">
          {filteredNavigation.map((section) => (
            <div key={section.title}>
              <h2 className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-3">
                {section.title}
              </h2>

              <ul className="space-y-2">
                {section.items.map((item) => {
                  const isActive = pathname === item.href

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={`block rounded-lg px-3 py-2 text-sm transition ${
                          isActive
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden">
        <header className="border-b border-slate-200 bg-white px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">AR Metals</h2>
              <p className="text-sm text-slate-600">New application structure</p>
            </div>
            <HeaderUser />
          </div>
        </header>

        <div className="min-w-0 p-8">
          <BackButton />
          {children}
        </div>
      </main>
    </div>
  )
}
