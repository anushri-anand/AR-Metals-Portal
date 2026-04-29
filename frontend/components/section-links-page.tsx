'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import { hasRoleAccess, type AppRole } from '@/lib/access'

type SectionLink = {
  label: string
  href: string
  roles?: AppRole[]
}

export default function SectionLinksPage({
  title,
  description,
  links,
}: {
  title: string
  description?: string
  links: SectionLink[]
}) {
  const [role, setRole] = useState<string>('')

  useEffect(() => {
    async function loadRole() {
      try {
        const me = await fetchAPI('/accounts/me/')
        setRole(typeof me?.role === 'string' ? me.role : '')
      } catch {
        setRole('')
      }
    }

    void loadRole()
  }, [])

  const visibleLinks = useMemo(
    () => links.filter((link) => !link.roles || hasRoleAccess(role, link.roles)),
    [links, role]
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description ? (
          <p className="mt-2 text-slate-700">{description}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {visibleLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition"
          >
            <h2 className="text-lg font-semibold text-slate-900">{link.label}</h2>
          </Link>
        ))}
      </div>
    </div>
  )
}
