'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type InventoryIssuanceRecord = {
  id: number
  po_number: string
  issuance_date: string
  project_name: string
  project_number: string
  cost_code: string
  item_description: string
  unit: string
  quantity_issued: string | number
  rate: string | number
  amount: string | number
}

type ActualIncurredCostRow = {
  key: string
  date: string
  poNumber: string
  projectName: string
  projectNumber: string
  costCode: string
  itemDescription: string
  unit: string
  quantity: number
  currency: string
  rate: number
  amount: number
}

export default function ActualIncurredCostClient() {
  const [rows, setRows] = useState<ActualIncurredCostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [costCodeFilter, setCostCodeFilter] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const issuanceData = await fetchAPI('/procurement/inventory-issuance/')
        const actualIncurredRows = (Array.isArray(issuanceData) ? issuanceData : [])
          .map((issuance) => buildActualIncurredCostRow(issuance as InventoryIssuanceRecord))
          .sort((left, right) => {
            const dateCompare = normalizeDateValue(left.date) - normalizeDateValue(right.date)
            if (dateCompare !== 0) {
              return dateCompare
            }

            const poCompare = left.poNumber.localeCompare(right.poNumber)
            if (poCompare !== 0) {
              return poCompare
            }

            return left.itemDescription.localeCompare(right.itemDescription)
          })

        setRows(actualIncurredRows)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load actual incurred cost.'
        )
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const costCodeOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map((row) => row.costCode).filter((value) => value.trim().length > 0))
      ).sort((left, right) => left.localeCompare(right)),
    [rows]
  )

  const hasInvalidDateRange = Boolean(fromDate && toDate && fromDate > toDate)

  const filteredRows = useMemo(() => {
    if (hasInvalidDateRange) {
      return []
    }

    const normalizedProjectFilter = projectFilter.trim().toLowerCase()

    return rows.filter((row) => {
      const matchesFromDate = !fromDate || row.date >= fromDate
      const matchesToDate = !toDate || row.date <= toDate
      const matchesProject =
        !normalizedProjectFilter ||
        row.projectName.toLowerCase().includes(normalizedProjectFilter) ||
        row.projectNumber.toLowerCase().includes(normalizedProjectFilter)
      const matchesCostCode = !costCodeFilter || row.costCode === costCodeFilter

      return matchesFromDate && matchesToDate && matchesProject && matchesCostCode
    })
  }, [costCodeFilter, fromDate, hasInvalidDateRange, projectFilter, rows, toDate])

  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (total, row) => {
          total.amount += row.amount
          return total
        },
        { amount: 0 }
      ),
    [filteredRows]
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Actual Incurred Cost</h1>
        <p className="mt-2 text-slate-700">
          View actual incurred cost for inventory issuances from saved issuance entries.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
          <button
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            onClick={() => {
              setFromDate('')
              setToDate('')
              setProjectFilter('')
              setCostCodeFilter('')
            }}
            type="button"
          >
            Clear Filters
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>From Date</span>
            <input
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
              onChange={(event) => setFromDate(event.target.value)}
              type="date"
              value={fromDate}
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>To Date</span>
            <input
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
              onChange={(event) => setToDate(event.target.value)}
              type="date"
              value={toDate}
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Project Name / #</span>
            <input
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
              onChange={(event) => setProjectFilter(event.target.value)}
              placeholder="Search by project name or number"
              type="text"
              value={projectFilter}
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Cost Code</span>
            <select
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
              onChange={(event) => setCostCodeFilter(event.target.value)}
              value={costCodeFilter}
            >
              <option value="">All Cost Codes</option>
              {costCodeOptions.map((costCode) => (
                <option key={costCode} value={costCode}>
                  {costCode}
                </option>
              ))}
            </select>
          </label>
        </div>

        {hasInvalidDateRange ? (
          <p className="mt-4 text-sm text-red-700">
            To Date should be the same as or later than From Date.
          </p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Actual Incurred Cost Table</h2>
          <p className="mt-2 text-sm text-slate-600">
            Showing {filteredRows.length} {filteredRows.length === 1 ? 'row' : 'rows'}
          </p>
        </div>

        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-[1560px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
              <tr>
                <HeaderCell>Date</HeaderCell>
                <HeaderCell>PO #</HeaderCell>
                <HeaderCell>Project Name</HeaderCell>
                <HeaderCell>Project #</HeaderCell>
                <HeaderCell>Cost Code</HeaderCell>
                <HeaderCell>Item Description</HeaderCell>
                <HeaderCell>Unit</HeaderCell>
                <HeaderCell>Quantity</HeaderCell>
                <HeaderCell>Currency</HeaderCell>
                <HeaderCell>Rate</HeaderCell>
                <HeaderCell>Amount</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <BodyCell colSpan={11}>Loading actual incurred cost...</BodyCell>
                </tr>
              ) : filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <tr key={row.key} className="border-b border-slate-200">
                    <BodyCell>{formatDate(row.date)}</BodyCell>
                    <BodyCell>{row.poNumber || '-'}</BodyCell>
                    <BodyCell>{row.projectName || '-'}</BodyCell>
                    <BodyCell>{row.projectNumber || '-'}</BodyCell>
                    <BodyCell>{row.costCode || '-'}</BodyCell>
                    <BodyCell>{row.itemDescription || '-'}</BodyCell>
                    <BodyCell>{row.unit || '-'}</BodyCell>
                    <BodyCell>{formatQuantity(row.quantity)}</BodyCell>
                    <BodyCell>{row.currency}</BodyCell>
                    <BodyCell className="text-right">{formatMoney(row.rate)}</BodyCell>
                    <BodyCell className="text-right">{formatMoney(row.amount)}</BodyCell>
                  </tr>
                ))
              ) : (
                <tr>
                  <BodyCell colSpan={11}>
                    {hasInvalidDateRange
                      ? 'Choose a valid date range to see actual incurred cost rows.'
                      : 'No actual incurred cost rows found for the selected filters.'}
                  </BodyCell>
                </tr>
              )}
            </tbody>
            {filteredRows.length > 0 ? (
              <tfoot className="sticky bottom-0 z-10 bg-slate-50 font-semibold">
                <tr>
                  <BodyCell className="text-right text-slate-900" colSpan={10}>
                    Total
                  </BodyCell>
                  <BodyCell className="text-right font-semibold text-slate-900">
                    {formatMoney(totals.amount)}
                  </BodyCell>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>
    </div>
  )
}

function buildActualIncurredCostRow(issuance: InventoryIssuanceRecord): ActualIncurredCostRow {
  return {
    key: String(issuance.id),
    date: issuance.issuance_date,
    poNumber: issuance.po_number || '',
    projectName: issuance.project_name || '',
    projectNumber: issuance.project_number || '',
    costCode: issuance.cost_code || '',
    itemDescription: issuance.item_description || '',
    unit: issuance.unit || '-',
    quantity: toNumber(issuance.quantity_issued),
    currency: 'AED',
    rate: toNumber(issuance.rate),
    amount: toNumber(issuance.amount),
  }
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-r border-slate-200 px-4 py-3 font-semibold">
      {children}
    </th>
  )
}

function BodyCell({
  children,
  className = '',
  colSpan,
}: {
  children: React.ReactNode
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

function formatQuantity(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  })
}

function normalizeDateValue(value: string | null | undefined) {
  if (!value) {
    return Number.MAX_SAFE_INTEGER
  }

  return new Date(`${value}T00:00:00`).getTime()
}

function formatDate(value: string | null) {
  if (!value) {
    return '-'
  }

  const parsed = new Date(`${value}T00:00:00`)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('en-GB')
}
