import { fetchAPI } from '@/lib/api'

export type DividendInvestmentEntry = {
  id: string | number
  date: string
  client: string
  paid: number
  received: number
}

export type DividendInvestmentEntryInput = Omit<DividendInvestmentEntry, 'id'>

export async function getDividendInvestmentEntries(): Promise<DividendInvestmentEntry[]> {
  const entries = await fetchAPI('/procurement/dividend-investment/')

  return Array.isArray(entries) ? entries.map(normalizeDividendInvestmentEntry) : []
}

export async function createDividendInvestmentEntry(
  item: DividendInvestmentEntryInput
): Promise<DividendInvestmentEntry> {
  return normalizeDividendInvestmentEntry(
    await fetchAPI('/procurement/dividend-investment/entry/', {
      method: 'POST',
      body: JSON.stringify(item),
    })
  )
}

function normalizeDividendInvestmentEntry(
  item: DividendInvestmentEntry
): DividendInvestmentEntry {
  return {
    ...item,
    date: item.date ? item.date.slice(0, 10) : '',
    paid: toNumber(item.paid),
    received: toNumber(item.received),
  }
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
