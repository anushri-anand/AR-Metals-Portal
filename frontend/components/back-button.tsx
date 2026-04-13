'use client'

import { usePathname, useRouter } from 'next/navigation'

export default function BackButton() {
  const pathname = usePathname()
  const router = useRouter()

  const parentPath = getParentPath(pathname)

  if (!parentPath) {
    return null
  }

  return (
    <button
      type="button"
      onClick={() => router.push(parentPath)}
      className="mb-6 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm hover:bg-slate-50"
    >
      Back
    </button>
  )
}

function getParentPath(pathname: string) {
  if (pathname === '/dashboard') {
    return ''
  }

  const parts = pathname.split('/').filter(Boolean)

  if (parts.length <= 1) {
    return '/dashboard'
  }

  return `/${parts.slice(0, -1).join('/')}`
}
