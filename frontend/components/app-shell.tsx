'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { fetchAPI } from '@/lib/api'
import {
  COMPANY_CHANGE_EVENT,
  companyOptions,
  getStoredCompany,
  isCompanyScopedPath,
  setStoredCompany,
  type CompanyName,
} from '@/lib/company'
import {
  companyModuleNavigation,
  sharedNavigation,
  type AppRole,
  type NavigationSection,
} from '@/lib/navigation'
import HeaderUser from '@/components/header-user'
import BackButton from '@/components/back-button'
import {
  formatIndianInputValue,
  isCompleteNumericValue,
  stripIndianNumberFormatting,
} from '@/lib/number-format'

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
  const router = useRouter()
  const [user, setUser] = useState<MeResponse | null>(null)
  const [selectedCompany, setSelectedCompany] = useState<CompanyName | null>(null)

  useEffect(() => {
    async function loadUser() {
      try {
        const me = await fetchAPI('/accounts/me/')
        setUser(me)
      } catch {
        setUser(null)
      }
    }

    function syncCompany() {
      setSelectedCompany(getStoredCompany())
    }

    loadUser()
    syncCompany()

    window.addEventListener('storage', syncCompany)
    window.addEventListener(COMPANY_CHANGE_EVENT, syncCompany)

    return () => {
      window.removeEventListener('storage', syncCompany)
      window.removeEventListener(COMPANY_CHANGE_EVENT, syncCompany)
    }
  }, [])

  useEffect(() => {
    if (isCompanyScopedPath(pathname) && !selectedCompany) {
      router.replace('/dashboard')
    }
  }, [pathname, router, selectedCompany])

  useEffect(() => {
    function preventNumberInputWheelChange(event: WheelEvent) {
      const target = event.target

      if (!(target instanceof HTMLElement)) {
        return
      }

      const numberInput = target.closest('input[type="number"]')

      if (!(numberInput instanceof HTMLInputElement)) {
        return
      }

      if (document.activeElement !== numberInput) {
        return
      }

      event.preventDefault()
    }

    window.addEventListener('wheel', preventNumberInputWheelChange, {
      passive: false,
      capture: true,
    })

    function formatNumberInputDisplay(input: HTMLInputElement) {
      if (input.dataset.skipIndianFormat === 'true') {
        return
      }

      const rawValue = stripIndianNumberFormatting(input.value)

      if (!isCompleteNumericValue(rawValue)) {
        return
      }

      input.dataset.indianNumberInput = 'true'

      if (input.type !== 'text') {
        input.type = 'text'
      }

      input.value = formatIndianInputValue(rawValue)
    }

    function restoreNumberInputForEditing(input: HTMLInputElement) {
      if (
        input.dataset.skipIndianFormat === 'true' ||
        (input.type !== 'number' && input.dataset.indianNumberInput !== 'true')
      ) {
        return
      }

      const rawValue = stripIndianNumberFormatting(input.value)
      input.dataset.indianNumberInput = 'true'

      if (input.type !== 'number') {
        input.type = 'number'
      }

      input.value = rawValue
    }

    function formatVisibleNumberInputs(root: ParentNode = document) {
      root
        .querySelectorAll<HTMLInputElement>(
          'input[type="number"], input[data-indian-number-input="true"]'
        )
        .forEach((input) => {
          if (document.activeElement === input) {
            return
          }

          formatNumberInputDisplay(input)
        })
    }

    function handleFocusIn(event: FocusEvent) {
      const target = event.target

      if (!(target instanceof HTMLInputElement)) {
        return
      }

      restoreNumberInputForEditing(target)
    }

    function handleFocusOut(event: FocusEvent) {
      const target = event.target

      if (!(target instanceof HTMLInputElement)) {
        return
      }

      window.setTimeout(() => {
        if (document.activeElement !== target) {
          formatNumberInputDisplay(target)
        }
      }, 0)
    }

    function handleInputEvent() {
      scheduleFormat()
    }

    let frameId = 0

    function scheduleFormat() {
      if (frameId) {
        return
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0
        formatVisibleNumberInputs()
      })
    }

    const observer =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => {
            scheduleFormat()
          })
        : null

    window.addEventListener('focusin', handleFocusIn, true)
    window.addEventListener('focusout', handleFocusOut, true)
    window.addEventListener('input', handleInputEvent, true)
    window.addEventListener('change', handleInputEvent, true)
    formatVisibleNumberInputs()
    observer?.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'type'],
    })

    return () => {
      window.removeEventListener('wheel', preventNumberInputWheelChange, true)
      window.removeEventListener('focusin', handleFocusIn, true)
      window.removeEventListener('focusout', handleFocusOut, true)
      window.removeEventListener('input', handleInputEvent, true)
      window.removeEventListener('change', handleInputEvent, true)
      observer?.disconnect()

      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [])

  const filteredNavigation = useMemo<NavigationSection[]>(() => {
    const sharedSections = sharedNavigation
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          user ? item.roles.includes(user.role) : false
        ),
      }))
      .filter((section) => section.items.length > 0)

    const companySections = companyOptions
      .map((company) => ({
        title: company,
        items: companyModuleNavigation
          .filter((item) => (user ? item.roles.includes(user.role) : false))
          .map((item) => ({
            ...item,
            company,
          })),
      }))
      .filter((section) => section.items.length > 0)

    return [...sharedSections, ...companySections]
  }, [user])

  function handleCompanyClick(company: CompanyName) {
    setStoredCompany(company)
    setSelectedCompany(company)
  }

  function isItemActive(item: { href: string; company?: CompanyName }) {
    const pathMatches =
      pathname === item.href ||
      (pathname.startsWith(`${item.href}/`) &&
        !(item.href === '/estimation' && pathname.startsWith('/estimation/contract')))

    return pathMatches && (!item.company || item.company === selectedCompany)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <aside className="h-screen w-80 shrink-0 overflow-y-auto bg-slate-900 p-6 text-white">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">AR Metals</h1>
          <p className="mt-1 text-sm text-slate-300">Operations Portal</p>
          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
              Active Company
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {selectedCompany || 'Not Selected'}
            </p>
          </div>
        </div>

        <nav className="space-y-6">
          {filteredNavigation.map((section) => (
            <div key={section.title}>
              <h2 className="mb-3 text-xs uppercase tracking-[0.2em] text-slate-400">
                {section.title}
              </h2>

              <ul className="space-y-2">
                {section.items.map((item) => {
                  const isActive = isItemActive(item)

                  return (
                    <li key={`${section.title}-${item.label}`}>
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (item.company) {
                            handleCompanyClick(item.company)
                          }
                        }}
                        className={`block rounded-lg px-3 py-2 text-sm transition ${
                          isActive
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>{item.label}</span>
                          {item.company && (
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                selectedCompany === item.company
                                  ? 'bg-white text-slate-900'
                                  : 'bg-slate-700 text-slate-200'
                              }`}
                            >
                              {item.company}
                            </span>
                          )}
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <main className="app-shell-content min-w-0 flex-1 overflow-y-auto">
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white px-8 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">AR Metals</h2>
              <p className="text-sm text-slate-600">
                {selectedCompany
                  ? `${selectedCompany} workspace selected`
                  : 'Select AKR or ARM on the dashboard to work on company data'}
              </p>
            </div>
            <HeaderUser />
          </div>
        </header>

        <div className="min-w-0 overflow-x-hidden p-8">
          <BackButton />
          <div
            key={
              isCompanyScopedPath(pathname)
                ? `${pathname}:${selectedCompany || 'none'}`
                : pathname
            }
          >
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
