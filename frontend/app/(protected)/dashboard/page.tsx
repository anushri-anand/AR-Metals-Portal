'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type MeResponse = {
  id: number
  username: string
  role: string
}

type QuickLink = {
  title: string
  href: string
  description: string
}

export default function DashboardPage() {
  const [user, setUser] = useState<MeResponse | null>(null)

  useEffect(() => {
    async function loadUser() {
      try {
        const me = await fetchAPI('/accounts/me/') as MeResponse
        setUser(me)
      } catch {
        setUser(null)
      }
    }

    loadUser()
  }, [])

  const adminLinks: QuickLink[] = [
    {
      title: 'Master Data',
      href: '/master-data',
      description: 'Manage employees, projects, and project items.',
    },
    {
      title: 'View Labour Status',
      href: '/employees/view-labour-status',
      description: 'Review labour records and total hours.',
    },
    {
      title: 'View Production Status',
      href: '/production/view-production-status',
      description: 'Review production stage and delivery totals.',
    },
    {
      title: 'Analytics',
      href: '/reports/analytics',
      description: 'View project item analytics and actual MH.',
    },
    {
      title: 'MH Cost Allocation',
      href: '/reports/mh-cost-allocation',
      description: 'View employee-wise project allocation percentages.',
    },
  ]

  const userLinks: QuickLink[] = [
    {
      title: 'Add Work Entry',
      href: '/employees/add-work-entry',
      description: 'Create daily labour entries for employees.',
    },
    {
      title: 'Update Hours',
      href: '/employees/update-hours',
      description: 'Update work entries that were saved without hours.',
    },
    {
      title: 'Add Production Entry',
      href: '/production/add-production-entry',
      description: 'Record daily production quantities.',
    },
    {
      title: 'Delivery Entry',
      href: '/production/delivery-entry',
      description: 'Record delivery details and delivered quantity.',
    },
    {
      title: 'Analytics',
      href: '/reports/analytics',
      description: 'View project item analytics and actual MH.',
    },
  ]

  const quickLinks = user?.role === 'admin' ? adminLinks : userLinks

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold mb-2 text-slate-900">Dashboard</h1>
        <p className="text-slate-700">
          Welcome{user ? `, ${user.username}` : ''} to the AR Metals Production system.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {quickLinks.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition"
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h2>
            <p className="text-slate-700 text-sm">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
