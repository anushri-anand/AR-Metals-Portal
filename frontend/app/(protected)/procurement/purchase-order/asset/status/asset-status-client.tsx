'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type PurchaseItem = {
  line_number: number
  item_description: string
  quantity: string | number
  unit: string
  rate?: string | number
  amount?: string | number
  depreciation_start_date?: string
  depreciation_end_date?: string
}

type PurchaseOrderRecord = {
  id: number
  order_type: 'project' | 'asset' | 'inventory'
  po_number: string
  supplier_name: string
  purchase_items: PurchaseItem[]
}

type AssetStatusRow = {
  key: string
  poNumber: string
  supplierName: string
  itemDescription: string
  depreciationStartDate: string | null
  depreciationEndDate: string | null
  procuredAmount: number
  depreciatedValue: number
  remainingAssetAmount: number
  remainingPeriodText: string
}

export default function AssetStatusClient() {
  const [rows, setRows] = useState<AssetStatusRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [asOfDate, setAsOfDate] = useState(getTodayISODate())

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const purchaseOrders = await fetchAPI('/procurement/purchase-order/?order_type=asset')

        setRows(
          (Array.isArray(purchaseOrders) ? purchaseOrders : [])
            .flatMap((order) => buildAssetStatusRows(order as PurchaseOrderRecord, asOfDate))
            .sort((left, right) => {
              const poCompare = left.poNumber.localeCompare(right.poNumber)
              if (poCompare !== 0) {
                return poCompare
              }

              return left.itemDescription.localeCompare(right.itemDescription)
            })
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load asset status.')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [asOfDate])

  const totals = useMemo(
    () =>
      rows.reduce(
        (total, row) => {
          total.procuredAmount += row.procuredAmount
          total.depreciatedValue += row.depreciatedValue
          total.remainingAssetAmount += row.remainingAssetAmount
          return total
        },
        {
          procuredAmount: 0,
          depreciatedValue: 0,
          remainingAssetAmount: 0,
        }
      ),
    [rows]
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Asset Status</h1>
        <p className="mt-2 text-slate-700">
          Review each asset purchase-order line item as of a selected date, including the
          depreciated value, remaining asset amount, and remaining depreciation period.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">As Of</h2>
        <div className="mt-4 max-w-sm">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>As Of Date</span>
            <input
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
              onChange={(event) => setAsOfDate(event.target.value)}
              type="date"
              value={asOfDate}
            />
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Asset Status Table</h2>
          <p className="mt-2 text-sm text-slate-600">
            Showing {rows.length} {rows.length === 1 ? 'row' : 'rows'} as of{' '}
            {formatDisplayDate(asOfDate)}
          </p>
        </div>

        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-[1520px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
              <tr>
                <HeaderCell>PO #</HeaderCell>
                <HeaderCell>Supplier Name</HeaderCell>
                <HeaderCell>Item Description</HeaderCell>
                <HeaderCell>Dep Start Date</HeaderCell>
                <HeaderCell>Dep End Date</HeaderCell>
                <HeaderCell>Procured Amount</HeaderCell>
                <HeaderCell>Depreciated Value</HeaderCell>
                <HeaderCell>Remaining Asset Amount</HeaderCell>
                <HeaderCell>Remaining Period</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <BodyCell colSpan={9}>Loading asset status...</BodyCell>
                </tr>
              ) : rows.length > 0 ? (
                rows.map((row) => (
                  <tr key={row.key} className="border-b border-slate-200">
                    <BodyCell>{row.poNumber || '-'}</BodyCell>
                    <BodyCell>{row.supplierName || '-'}</BodyCell>
                    <BodyCell>{row.itemDescription || '-'}</BodyCell>
                    <BodyCell>{formatDisplayDate(row.depreciationStartDate)}</BodyCell>
                    <BodyCell>{formatDisplayDate(row.depreciationEndDate)}</BodyCell>
                    <BodyCell className="text-right">{formatMoney(row.procuredAmount)}</BodyCell>
                    <BodyCell className="text-right">
                      {formatMoney(row.depreciatedValue)}
                    </BodyCell>
                    <BodyCell className="text-right">
                      {formatMoney(row.remainingAssetAmount)}
                    </BodyCell>
                    <BodyCell>{row.remainingPeriodText}</BodyCell>
                  </tr>
                ))
              ) : (
                <tr>
                  <BodyCell colSpan={9}>
                    No asset purchase-order rows found with depreciation details.
                  </BodyCell>
                </tr>
              )}
            </tbody>
            {rows.length > 0 ? (
              <tfoot className="sticky bottom-0 z-10 bg-slate-50 font-semibold">
                <tr>
                  <BodyCell className="text-right text-slate-900" colSpan={5}>
                    Total
                  </BodyCell>
                  <BodyCell className="text-right font-semibold text-slate-900">
                    {formatMoney(totals.procuredAmount)}
                  </BodyCell>
                  <BodyCell className="text-right font-semibold text-slate-900">
                    {formatMoney(totals.depreciatedValue)}
                  </BodyCell>
                  <BodyCell className="text-right font-semibold text-slate-900">
                    {formatMoney(totals.remainingAssetAmount)}
                  </BodyCell>
                  <BodyCell />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>
    </div>
  )
}

function buildAssetStatusRows(order: PurchaseOrderRecord, asOfDateValue: string) {
  if (order.order_type !== 'asset') {
    return []
  }

  const asOfDate = parseISODate(asOfDateValue)
  if (!asOfDate) {
    return []
  }

  return (order.purchase_items || []).flatMap((item) => {
    const startDate = parseISODate(item.depreciation_start_date || '')
    const endDate = parseISODate(item.depreciation_end_date || '')

    if (!startDate || !endDate || compareDates(startDate, endDate) > 0) {
      return []
    }

    const totalDays = getInclusiveDayCount(startDate, endDate)
    if (totalDays <= 0) {
      return []
    }

    const procuredAmount = toNumber(item.amount) || toNumber(item.quantity) * toNumber(item.rate)
    const dailyRate = procuredAmount / totalDays

    let elapsedDays = 0
    if (compareDates(asOfDate, startDate) >= 0) {
      const effectiveEnd = compareDates(asOfDate, endDate) < 0 ? asOfDate : endDate
      elapsedDays = getInclusiveDayCount(startDate, effectiveEnd)
    }

    const depreciatedValue = clampCurrency(elapsedDays * dailyRate, 0, procuredAmount)
    const remainingAssetAmount = clampCurrency(procuredAmount - depreciatedValue, 0, procuredAmount)

    return [
      {
        key: `${order.id}-${item.line_number}-${asOfDateValue}`,
        poNumber: order.po_number || '',
        supplierName: order.supplier_name || '',
        itemDescription: item.item_description || '',
        depreciationStartDate: item.depreciation_start_date || null,
        depreciationEndDate: item.depreciation_end_date || null,
        procuredAmount,
        depreciatedValue,
        remainingAssetAmount,
        remainingPeriodText: formatRemainingPeriod(asOfDate, endDate),
      },
    ]
  })
}

function formatRemainingPeriod(asOfDate: Date, endDate: Date) {
  if (compareDates(asOfDate, endDate) >= 0) {
    return '0 months and 0 days'
  }

  let cursor = addDays(asOfDate, 1)
  let months = 0

  while (true) {
    const nextMonth = addMonths(cursor, 1)
    if (compareDates(nextMonth, endDate) <= 0) {
      months += 1
      cursor = nextMonth
      continue
    }
    break
  }

  const days = Math.max(0, getInclusiveDayCount(cursor, endDate) - 1)
  return `${months} month${months === 1 ? '' : 's'} and ${days} day${days === 1 ? '' : 's'}`
}

function parseISODate(value: string) {
  if (!value) {
    return null
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return null
  }

  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const monthIndex = Number(monthText) - 1
  const day = Number(dayText)
  const date = new Date(Date.UTC(year, monthIndex, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== monthIndex ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return date
}

function addDays(date: Date, days: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days))
}

function addMonths(date: Date, months: number) {
  const year = date.getUTCFullYear()
  const monthIndex = date.getUTCMonth() + months
  const day = date.getUTCDate()

  const firstOfTargetMonth = new Date(Date.UTC(year, monthIndex, 1))
  const targetYear = firstOfTargetMonth.getUTCFullYear()
  const targetMonth = firstOfTargetMonth.getUTCMonth()
  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()

  return new Date(Date.UTC(targetYear, targetMonth, Math.min(day, lastDayOfTargetMonth)))
}

function compareDates(left: Date, right: Date) {
  return left.getTime() - right.getTime()
}

function getInclusiveDayCount(startDate: Date, endDate: Date) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  return Math.floor((endDate.getTime() - startDate.getTime()) / millisecondsPerDay) + 1
}

function clampCurrency(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Number(value.toFixed(2))))
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return <th className="border-b border-r border-slate-200 px-4 py-3 font-semibold">{children}</th>
}

function BodyCell({
  children,
  className = '',
  colSpan,
}: {
  children?: React.ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <td
      className={`border-r border-slate-200 px-4 py-3 align-top text-slate-700 ${className}`}
      colSpan={colSpan}
    >
      {children}
    </td>
  )
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMoney(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatDisplayDate(value: string | null) {
  if (!value) {
    return '-'
  }

  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('en-GB')
}

function getTodayISODate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
