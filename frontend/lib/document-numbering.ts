import { getStoredCompany, type CompanyName } from '@/lib/company'

export type DocumentSeries = 'PO' | 'TEN' | 'QT' | 'PR' | 'INV' | 'GL' | 'ID'

function getSelectedCompanyOrDefault() {
  return getStoredCompany() || 'ARM'
}

export function getCurrentYearSuffix(referenceDate = new Date()) {
  return String(referenceDate.getFullYear()).slice(-2)
}

export function buildDocumentNumber(
  series: DocumentSeries,
  sequence: number,
  company: CompanyName = getSelectedCompanyOrDefault(),
  yearSuffix = getCurrentYearSuffix()
) {
  if (series === 'ID') {
    return `${company}-${series}-${String(sequence).padStart(3, '0')}`
  }

  return `${company}-${series}-${yearSuffix}-${String(sequence).padStart(3, '0')}`
}

export function findNextDocumentNumber(
  existingValues: Array<string | null | undefined>,
  series: DocumentSeries,
  options?: {
    company?: CompanyName
    yearSuffix?: string
  }
) {
  const company = options?.company || getSelectedCompanyOrDefault()
  const yearSuffix = options?.yearSuffix || getCurrentYearSuffix()
  const usedNumbers = new Set<number>()
  const matcher =
    series === 'ID'
      ? new RegExp(`^${company}-${series}-(\\d+)$`, 'i')
      : new RegExp(`^${company}-${series}-${yearSuffix}-(\\d+)$`, 'i')

  for (const rawValue of existingValues) {
    const value = String(rawValue || '').trim()
    const match = matcher.exec(value)

    if (!match) {
      continue
    }

    const sequence = Number(match[1])

    if (Number.isInteger(sequence) && sequence > 0) {
      usedNumbers.add(sequence)
    }
  }

  let nextSequence = 1
  while (usedNumbers.has(nextSequence)) {
    nextSequence += 1
  }

  return buildDocumentNumber(series, nextSequence, company, yearSuffix)
}

export function reserveNextDocumentNumbers(
  existingValues: Array<string | null | undefined>,
  series: DocumentSeries,
  count: number,
  options?: {
    company?: CompanyName
    yearSuffix?: string
  }
) {
  const company = options?.company || getSelectedCompanyOrDefault()
  const yearSuffix = options?.yearSuffix || getCurrentYearSuffix()
  const results: string[] = []
  const reserved = [...existingValues]

  for (let index = 0; index < count; index += 1) {
    const nextValue = findNextDocumentNumber(reserved, series, {
      company,
      yearSuffix,
    })

    results.push(nextValue)
    reserved.push(nextValue)
  }

  return results
}
