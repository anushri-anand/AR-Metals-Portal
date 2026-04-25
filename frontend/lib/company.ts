export const companyOptions = ['ARM', 'AKR'] as const

export type CompanyName = (typeof companyOptions)[number]

const COMPANY_STORAGE_KEY = 'selected_company'
export const COMPANY_CHANGE_EVENT = 'companychange'

export function isCompanyName(value: string | null | undefined): value is CompanyName {
  return companyOptions.includes((value || '').toUpperCase() as CompanyName)
}

export function getStoredCompany(): CompanyName | null {
  if (typeof window === 'undefined') return null

  const value = localStorage.getItem(COMPANY_STORAGE_KEY)

  return isCompanyName(value) ? value : null
}

export function setStoredCompany(company: CompanyName) {
  if (typeof window === 'undefined') return

  localStorage.setItem(COMPANY_STORAGE_KEY, company)
  window.dispatchEvent(new Event(COMPANY_CHANGE_EVENT))
}

export function clearStoredCompany() {
  if (typeof window === 'undefined') return

  localStorage.removeItem(COMPANY_STORAGE_KEY)
  window.dispatchEvent(new Event(COMPANY_CHANGE_EVENT))
}

export function isCompanyScopedPath(pathname: string) {
  return !pathname.startsWith('/dashboard') && !pathname.startsWith('/employee')
}
