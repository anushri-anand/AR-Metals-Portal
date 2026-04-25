'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type AssociatedCostItem = {
  line_number: number
  employee_id?: string | null
  employee_name?: string | null
  cost_code?: string
  item_description: string
  quantity: string | number
  unit: string
  rate: string | number
  amount: string | number
  start_date: string
  end_date: string
}

type AssociatedCostEntryRecord = {
  id: number
  serial_number: string
  entry_type?: 'Labour' | 'Others'
  supplier_name: string
  date: string
  cost_code: string
  items: AssociatedCostItem[]
}

type TimeAllocationLine = {
  id: number
  date: string
  employee_id: string
  employee_name: string
  project_number: string
  project_name: string
  variation_number: string
  boq_sn: string
  item_name: string
  percentage: string | number
}

type ActualIncurredCostRow = {
  key: string
  date: string | null
  serialNumber: string
  supplierName: string
  costCode: string
  employeeName: string
  employeeId: string
  poNumber: string
  projectName: string
  projectNumber: string
  itemDescription: string
  unit: string
  quantity: number
  rate: number
  contribution: number
  amount: number
}

export default function AssociatedCostActualIncurredCostClient() {
  const [rows, setRows] = useState<ActualIncurredCostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [serialSupplierFilter, setSerialSupplierFilter] = useState('')
  const [costCodeFilter, setCostCodeFilter] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [entries, timeAllocations] = await Promise.all([
          fetchAPI('/employees/associated-cost/'),
          fetchAPI('/production/time-allocation/').catch(() => []),
        ])

        const actualIncurredRows = (Array.isArray(entries) ? entries : [])
          .flatMap((entry) =>
            buildActualIncurredRows(
              entry as AssociatedCostEntryRecord,
              Array.isArray(timeAllocations) ? (timeAllocations as TimeAllocationLine[]) : []
            )
          )
          .sort((left, right) => {
            const dateCompare = normalizeDateValue(left.date) - normalizeDateValue(right.date)
            if (dateCompare !== 0) {
              return dateCompare
            }

            const serialCompare = left.serialNumber.localeCompare(right.serialNumber)
            if (serialCompare !== 0) {
              return serialCompare
            }

            const projectCompare = left.projectNumber.localeCompare(right.projectNumber)
            if (projectCompare !== 0) {
              return projectCompare
            }

            return left.itemDescription.localeCompare(right.itemDescription)
          })

        setRows(actualIncurredRows)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load associated cost actual incurred cost.'
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

    const normalizedFilter = serialSupplierFilter.trim().toLowerCase()

    return rows.filter((row) => {
      const matchesFromDate = !fromDate || (row.date !== null && row.date >= fromDate)
      const matchesToDate = !toDate || (row.date !== null && row.date <= toDate)
      const matchesSerialSupplier =
        !normalizedFilter ||
        row.serialNumber.toLowerCase().includes(normalizedFilter) ||
        row.supplierName.toLowerCase().includes(normalizedFilter)
      const matchesCostCode = !costCodeFilter || row.costCode === costCodeFilter

      return matchesFromDate && matchesToDate && matchesSerialSupplier && matchesCostCode
    })
  }, [costCodeFilter, fromDate, hasInvalidDateRange, rows, serialSupplierFilter, toDate])

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
          View monthly actual incurred cost for associated cost items using amount without VAT.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          One row is created for each month-end between the start date and end date, and the
          final row uses the entered end date.
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
              setSerialSupplierFilter('')
              setCostCodeFilter('')
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
            <span>SN / Supplier</span>
            <input
              type="text"
              value={serialSupplierFilter}
              onChange={(event) => setSerialSupplierFilter(event.target.value)}
              placeholder="Search by SN or supplier"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Cost Code</span>
            <select
              value={costCodeFilter}
              onChange={(event) => setCostCodeFilter(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
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
          <table className="min-w-[2200px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
              <tr>
                <HeaderCell>Date</HeaderCell>
                <HeaderCell>SN</HeaderCell>
                <HeaderCell>Supplier Name</HeaderCell>
                <HeaderCell>Cost Code</HeaderCell>
                <HeaderCell>Name of Employee</HeaderCell>
                <HeaderCell>Employee ID</HeaderCell>
                <HeaderCell>PO #</HeaderCell>
                <HeaderCell>Project Name</HeaderCell>
                <HeaderCell>Project #</HeaderCell>
                <HeaderCell>Item Description</HeaderCell>
                <HeaderCell>Unit</HeaderCell>
                <HeaderCell>Quantity</HeaderCell>
                <HeaderCell>Rate</HeaderCell>
                <HeaderCell>% Contribution</HeaderCell>
                <HeaderCell>Amount</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <BodyCell colSpan={15}>Loading actual incurred cost...</BodyCell>
                </tr>
              ) : filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <tr key={row.key} className="border-b border-slate-200">
                    <BodyCell>{formatDate(row.date)}</BodyCell>
                    <BodyCell>{row.serialNumber || '-'}</BodyCell>
                    <BodyCell>{row.supplierName || '-'}</BodyCell>
                    <BodyCell>{row.costCode || '-'}</BodyCell>
                    <BodyCell>{row.employeeName || '-'}</BodyCell>
                    <BodyCell>{row.employeeId || '-'}</BodyCell>
                    <BodyCell>{row.poNumber || '-'}</BodyCell>
                    <BodyCell>{row.projectName || '-'}</BodyCell>
                    <BodyCell>{row.projectNumber || '-'}</BodyCell>
                    <BodyCell>{row.itemDescription || '-'}</BodyCell>
                    <BodyCell>{row.unit || '-'}</BodyCell>
                    <BodyCell>{formatQuantity(row.quantity)}</BodyCell>
                    <BodyCell className="text-right">{formatMoney(row.rate)}</BodyCell>
                    <BodyCell className="text-right">
                      {formatPercentage(row.contribution)}
                    </BodyCell>
                    <BodyCell className="text-right">{formatMoney(row.amount)}</BodyCell>
                  </tr>
                ))
              ) : (
                <tr>
                  <BodyCell colSpan={15}>
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
                  <BodyCell className="text-right text-slate-900" colSpan={14}>
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

function buildActualIncurredRows(
  entry: AssociatedCostEntryRecord,
  timeAllocationLines: TimeAllocationLine[]
) {
  return (entry.items || []).flatMap((item) => {
    const startDate = parseISODate(item.start_date || '')
    const endDate = parseISODate(item.end_date || '')

    if (!startDate || !endDate || compareDates(startDate, endDate) > 0) {
      return []
    }

    const totalDays = getInclusiveDayCount(startDate, endDate)
    if (totalDays <= 0) {
      return []
    }

    const totalAmount = toNumber(item.amount) || toNumber(item.quantity) * toNumber(item.rate)
    const dailyRate = totalAmount / totalDays
    const segments = buildMonthlySegments(startDate, endDate)

    return segments.flatMap((segment, segmentIndex) => {
      const matchingAllocations = timeAllocationLines.filter(
        (line) =>
          line.employee_id === item.employee_id &&
          line.date >= segment.startDate &&
          line.date <= segment.endDate
      )

      const groupedProjectPercentages = new Map<
        string,
        {
          projectName: string
          projectNumber: string
          totalPercentage: number
        }
      >()

      for (const allocation of matchingAllocations) {
        const groupKey = `${allocation.project_number}::${allocation.project_name}`
        const existingGroup = groupedProjectPercentages.get(groupKey)
        const nextPercentage = toNumber(allocation.percentage)

        if (existingGroup) {
          existingGroup.totalPercentage += nextPercentage
        } else {
          groupedProjectPercentages.set(groupKey, {
            projectName: allocation.project_name || '',
            projectNumber: allocation.project_number || '',
            totalPercentage: nextPercentage,
          })
        }
      }

      const totalAllocatedPercentage = Array.from(groupedProjectPercentages.values()).reduce(
        (sum, project) => sum + project.totalPercentage,
        0
      )

      if (totalAllocatedPercentage <= 0) {
        return [
          {
            key: `${entry.id}-${item.line_number}-${segment.date}-${segmentIndex}-unallocated`,
            date: segment.date,
            serialNumber: entry.serial_number || '',
            supplierName: entry.supplier_name || '',
            costCode: item.cost_code || entry.cost_code || '',
            employeeName: item.employee_name || '',
            employeeId: item.employee_id || '',
            poNumber: '-',
            projectName: 'Unallocated',
            projectNumber: '-',
            itemDescription: item.item_description || '',
            unit: 'Days',
            quantity: segment.days,
            rate: dailyRate,
            contribution: 100,
            amount: segment.days * dailyRate,
          },
        ]
      }

      return Array.from(groupedProjectPercentages.values()).map((project, projectIndex) => {
        const contribution = (project.totalPercentage / totalAllocatedPercentage) * 100

        return {
          key: `${entry.id}-${item.line_number}-${segment.date}-${segmentIndex}-${projectIndex}`,
          date: segment.date,
          serialNumber: entry.serial_number || '',
          supplierName: entry.supplier_name || '',
          costCode: item.cost_code || entry.cost_code || '',
          employeeName: item.employee_name || '',
          employeeId: item.employee_id || '',
          poNumber: '-',
          projectName: project.projectName || '-',
          projectNumber: project.projectNumber || '-',
          itemDescription: item.item_description || '',
          unit: 'Days',
          quantity: segment.days,
          rate: dailyRate,
          contribution,
          amount: segment.days * dailyRate * (contribution / 100),
        }
      })
    })
  })
}

function buildMonthlySegments(startDate: Date, endDate: Date) {
  const segments: Array<{ startDate: string; endDate: string; date: string; days: number }> = []
  let currentStart = startDate

  while (compareDates(currentStart, endDate) <= 0) {
    const monthEnd = getMonthEnd(currentStart)
    const segmentEnd = compareDates(monthEnd, endDate) < 0 ? monthEnd : endDate

    segments.push({
      startDate: formatISODate(currentStart),
      endDate: formatISODate(segmentEnd),
      date: formatISODate(segmentEnd),
      days: getInclusiveDayCount(currentStart, segmentEnd),
    })

    currentStart = addDays(segmentEnd, 1)
  }

  return segments
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

function formatISODate(date: Date) {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getMonthEnd(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0))
}

function addDays(date: Date, days: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days))
}

function compareDates(left: Date, right: Date) {
  return left.getTime() - right.getTime()
}

function getInclusiveDayCount(startDate: Date, endDate: Date) {
  const millisecondsPerDay = 24 * 60 * 60 * 1000
  return Math.floor((endDate.getTime() - startDate.getTime()) / millisecondsPerDay) + 1
}

function normalizeDateValue(value: string | null) {
  if (!value) {
    return Number.POSITIVE_INFINITY
  }

  const parsedDate = parseISODate(value)
  return parsedDate ? parsedDate.getTime() : Number.POSITIVE_INFINITY
}

function toNumber(value: string | number | undefined) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0
  }

  const parsedValue = Number(value || 0)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

function formatMoney(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatPercentage(value: number) {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`
}

function formatQuantity(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  })
}

function formatDate(value: string | null) {
  if (!value) {
    return '-'
  }

  const parsedDate = parseISODate(value)
  if (!parsedDate) {
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
