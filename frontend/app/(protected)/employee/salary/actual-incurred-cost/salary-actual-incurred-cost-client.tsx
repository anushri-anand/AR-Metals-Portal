'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type SalaryActualIncurredCostRow = {
  sn: number
  date: string
  employee_name: string
  employee_id: string
  project_name: string
  project_number: string
  contribution_percentage: string
  cost_code: string
  item_description: string
  basic: string
  allowance: string
  ot: string
  gross_salary: string
  leave_salary: string
  gratuity: string
  incentive: string
  amount: string
}

export default function SalaryActualIncurredCostClient() {
  const [rows, setRows] = useState<SalaryActualIncurredCostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')

  useEffect(() => {
    async function loadRows() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchAPI('/employees/salary/actual-incurred-cost/')
        setRows(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load salary actual incurred cost.'
        )
      } finally {
        setLoading(false)
      }
    }

    void loadRows()
  }, [])

  const hasInvalidDateRange = Boolean(fromDate && toDate && fromDate > toDate)

  const filteredRows = useMemo(() => {
    if (hasInvalidDateRange) {
      return []
    }

    const normalizedEmployeeFilter = employeeFilter.trim().toLowerCase()
    const normalizedProjectFilter = projectFilter.trim().toLowerCase()

    return rows.filter((row) => {
      const matchesFromDate = !fromDate || row.date >= fromDate
      const matchesToDate = !toDate || row.date <= toDate
      const matchesEmployee =
        !normalizedEmployeeFilter ||
        row.employee_name.toLowerCase().includes(normalizedEmployeeFilter) ||
        row.employee_id.toLowerCase().includes(normalizedEmployeeFilter)
      const matchesProject =
        !normalizedProjectFilter ||
        row.project_name.toLowerCase().includes(normalizedProjectFilter) ||
        row.project_number.toLowerCase().includes(normalizedProjectFilter)

      return matchesFromDate && matchesToDate && matchesEmployee && matchesProject
    })
  }, [employeeFilter, fromDate, hasInvalidDateRange, projectFilter, rows, toDate])

  const totalAmount = useMemo(
    () =>
      filteredRows.reduce(
        (sum, row) => sum + Number(row.amount || 0),
        0
      ),
    [filteredRows]
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Actual Incurred Cost</h1>
        <p className="mt-2 text-slate-700">
          View salary actual incurred cost rows created from generated payroll months.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
          <button
            type="button"
            onClick={() => {
              setFromDate('')
              setToDate('')
              setEmployeeFilter('')
              setProjectFilter('')
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Clear Filters
          </button>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>From Date</span>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>To Date</span>
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Employee Name / ID</span>
            <input
              type="text"
              value={employeeFilter}
              onChange={(event) => setEmployeeFilter(event.target.value)}
              placeholder="Search employee"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Project Name / #</span>
            <input
              type="text"
              value={projectFilter}
              onChange={(event) => setProjectFilter(event.target.value)}
              placeholder="Search project"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
            />
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
          <table className="min-w-[2400px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
              <tr>
                <HeaderCell>SN</HeaderCell>
                <HeaderCell>Date</HeaderCell>
                <HeaderCell>Employee Name</HeaderCell>
                <HeaderCell>Employee ID</HeaderCell>
                <HeaderCell>Project Name</HeaderCell>
                <HeaderCell>Project #</HeaderCell>
                <HeaderCell>% Contribution</HeaderCell>
                <HeaderCell>Cost Code</HeaderCell>
                <HeaderCell>Item Description</HeaderCell>
                <HeaderCell>Basic</HeaderCell>
                <HeaderCell>Allowance</HeaderCell>
                <HeaderCell>OT</HeaderCell>
                <HeaderCell>Gross Salary</HeaderCell>
                <HeaderCell>Leave Salary</HeaderCell>
                <HeaderCell>Gratuity</HeaderCell>
                <HeaderCell>Incentive</HeaderCell>
                <HeaderCell>Amount</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <BodyCell colSpan={17}>Loading salary actual incurred cost...</BodyCell>
                </tr>
              ) : filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <tr key={`${row.sn}-${row.employee_id}-${row.project_number}-${row.date}`} className="border-b border-slate-200">
                    <BodyCell>{row.sn}</BodyCell>
                    <BodyCell>{formatDate(row.date)}</BodyCell>
                    <BodyCell>{row.employee_name || '-'}</BodyCell>
                    <BodyCell>{row.employee_id || '-'}</BodyCell>
                    <BodyCell>{row.project_name || '-'}</BodyCell>
                    <BodyCell>{row.project_number || '-'}</BodyCell>
                    <BodyCell className="text-right">{formatPercentage(row.contribution_percentage)}</BodyCell>
                    <BodyCell>{row.cost_code || '-'}</BodyCell>
                    <BodyCell>{row.item_description || '-'}</BodyCell>
                    <BodyCell className="text-right">{formatMoney(row.basic)}</BodyCell>
                    <BodyCell className="text-right">{formatMoney(row.allowance)}</BodyCell>
                    <BodyCell className="text-right">{formatMoney(row.ot)}</BodyCell>
                    <BodyCell className="text-right">{formatMoney(row.gross_salary)}</BodyCell>
                    <BodyCell className="text-right">{formatMoney(row.leave_salary)}</BodyCell>
                    <BodyCell className="text-right">{formatMoney(row.gratuity)}</BodyCell>
                    <BodyCell className="text-right">{formatMoney(row.incentive)}</BodyCell>
                    <BodyCell className="text-right">{formatMoney(row.amount)}</BodyCell>
                  </tr>
                ))
              ) : (
                <tr>
                  <BodyCell colSpan={17}>
                    {hasInvalidDateRange
                      ? 'Choose a valid date range to see actual incurred cost rows.'
                      : 'No salary actual incurred cost rows found.'}
                  </BodyCell>
                </tr>
              )}
            </tbody>
            {filteredRows.length > 0 ? (
              <tfoot className="sticky bottom-0 z-10 bg-slate-50 font-semibold">
                <tr>
                  <BodyCell className="text-right text-slate-900" colSpan={16}>
                    Total
                  </BodyCell>
                  <BodyCell className="text-right font-semibold text-slate-900">
                    {formatMoney(totalAmount)}
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

function formatMoney(value: string | number) {
  return Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatPercentage(value: string | number) {
  return `${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`
}

function formatDate(value: string) {
  if (!value) {
    return '-'
  }

  const parsedDate = new Date(`${value}T00:00:00Z`)

  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return parsedDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
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
      className={`border-r border-slate-200 px-4 py-3 align-top text-slate-700 ${className}`.trim()}
      colSpan={colSpan}
    >
      {children}
    </td>
  )
}
