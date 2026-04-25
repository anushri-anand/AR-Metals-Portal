'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import { ContractPaymentLog, getContractPaymentLogs } from '@/lib/estimation-storage'
import {
  DividendInvestmentEntry,
  getDividendInvestmentEntries,
} from '@/lib/reports-storage'

type PurchaseOrderRecord = {
  po_number: string
  mode_of_payment: string
}

type ProcurementPhase = {
  id: number
  phase_number: number
  amount: string
  due_date: string
  forecast_date: string
  paid_inc_vat: string
  paid_date: string | null
}

type ProcurementPaymentRecord = {
  id: number
  po_number: string
  supplier_name: string
  phases: ProcurementPhase[]
}

type PettyCashVoucherItem = {
  id: number
  item: string
  paid_amount_inc_vat: string | number
  balance: string | number
  forecast_date: string
  supplier_name: string
}

type PettyCashVoucher = {
  id: number
  voucher_number: string
  items: PettyCashVoucherItem[]
}

type CashflowRow = {
  key: string
  date: string
  clientSupplier: string
  mode: string
  drPaid: number
  drBalanceToBePaid: number
  crReceived: number
  crBalanceToBeReceived: number
}

type ReportRow = CashflowRow & {
  runningBalance: number
}

type Filters = {
  fromDate: string
  toDate: string
}

const initialFilters: Filters = {
  fromDate: '',
  toDate: '',
}

export default function CashflowViewClient() {
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderRecord[]>([])
  const [paymentEntries, setPaymentEntries] = useState<ProcurementPaymentRecord[]>([])
  const [pettyCashVouchers, setPettyCashVouchers] = useState<PettyCashVoucher[]>([])
  const [contractPaymentLogs, setContractPaymentLogs] = useState<ContractPaymentLog[]>([])
  const [dividendEntries, setDividendEntries] = useState<DividendInvestmentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [
          purchaseOrderData,
          paymentEntryData,
          pettyCashData,
          contractData,
          dividendInvestmentData,
        ] = await Promise.all([
          fetchAPI('/procurement/purchase-order/'),
          fetchAPI('/procurement/payment/'),
          fetchAPI('/procurement/petty-cash/'),
          getContractPaymentLogs(),
          getDividendInvestmentEntries(),
        ])

        setPurchaseOrders(Array.isArray(purchaseOrderData) ? purchaseOrderData : [])
        setPaymentEntries(Array.isArray(paymentEntryData) ? paymentEntryData : [])
        setPettyCashVouchers(Array.isArray(pettyCashData) ? pettyCashData : [])
        setContractPaymentLogs(Array.isArray(contractData) ? contractData : [])
        setDividendEntries(
          Array.isArray(dividendInvestmentData) ? dividendInvestmentData : []
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load cashflow data.')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const allRows = useMemo(() => {
    const poModeMap = new Map(
      purchaseOrders.map((purchaseOrder) => [
        purchaseOrder.po_number,
        purchaseOrder.mode_of_payment,
      ])
    )
    const rows = new Map<string, CashflowRow>()

    function upsertRow(
      key: string,
      row: Omit<
        CashflowRow,
        'drPaid' | 'drBalanceToBePaid' | 'crReceived' | 'crBalanceToBeReceived'
      >,
      amounts: Partial<
        Pick<
          CashflowRow,
          'drPaid' | 'drBalanceToBePaid' | 'crReceived' | 'crBalanceToBeReceived'
        >
      >
    ) {
      const existing = rows.get(key)

      if (existing) {
        existing.drPaid += amounts.drPaid || 0
        existing.drBalanceToBePaid += amounts.drBalanceToBePaid || 0
        existing.crReceived += amounts.crReceived || 0
        existing.crBalanceToBeReceived += amounts.crBalanceToBeReceived || 0
        return
      }

      rows.set(key, {
        ...row,
        drPaid: amounts.drPaid || 0,
        drBalanceToBePaid: amounts.drBalanceToBePaid || 0,
        crReceived: amounts.crReceived || 0,
        crBalanceToBeReceived: amounts.crBalanceToBeReceived || 0,
      })
    }

    paymentEntries.forEach((entry) => {
      const mode = poModeMap.get(entry.po_number) || '-'

      entry.phases.forEach((phase) => {
        const paidAmount = toNumber(phase.paid_inc_vat)
        const balanceToBePaid = Math.max(0, toNumber(phase.amount) - paidAmount)
        const paidDate = normalizeDateString(
          phase.paid_date || phase.forecast_date || phase.due_date
        )
        const balanceDate = normalizeDateString(
          phase.forecast_date || phase.due_date || phase.paid_date
        )
        const baseRow = {
          clientSupplier: `${entry.supplier_name || '-'} / ${entry.po_number}`,
          mode,
        }

        if (paidAmount > 0 && paidDate) {
          upsertRow(
            `po-${entry.id}-phase-${phase.id}-${paidDate}`,
            {
              key: `po-${entry.id}-phase-${phase.id}-${paidDate}`,
              date: paidDate,
              ...baseRow,
            },
            { drPaid: paidAmount }
          )
        }

        if (balanceToBePaid > 0 && balanceDate) {
          upsertRow(
            `po-${entry.id}-phase-${phase.id}-${balanceDate}`,
            {
              key: `po-${entry.id}-phase-${phase.id}-${balanceDate}`,
              date: balanceDate,
              ...baseRow,
            },
            { drBalanceToBePaid: balanceToBePaid }
          )
        }
      })
    })

    pettyCashVouchers.forEach((voucher) => {
      voucher.items.forEach((item) => {
        const date = normalizeDateString(item.forecast_date)
        if (!date) {
          return
        }

        upsertRow(
          `petty-${voucher.id}-item-${item.id}-${date}`,
          {
            key: `petty-${voucher.id}-item-${item.id}-${date}`,
            date,
            clientSupplier: `${item.supplier_name || '-'} / ${voucher.voucher_number}`,
            mode: '-',
          },
          {
            drPaid: toNumber(item.paid_amount_inc_vat),
            drBalanceToBePaid: toNumber(item.balance),
          }
        )
      })
    })

    contractPaymentLogs.forEach((log) => {
      const receivedAmount = toNumber(log.paidAmount)
      const balanceToBeReceived = Math.max(
        0,
        toNumber(log.netApprovedIncVat) - receivedAmount
      )
      const receivedDate = normalizeDateString(
        log.paidDate || log.forecastDate || log.dueDate
      )
      const balanceDate = normalizeDateString(
        log.forecastDate || log.dueDate || log.paidDate
      )
      const baseRow = {
        clientSupplier: `${log.projectName || log.projectNumber || '-'} / SN ${log.sn}`,
        mode: '-',
      }

      if (receivedAmount > 0 && receivedDate) {
        upsertRow(
          `contract-${log.id}-${receivedDate}`,
          {
            key: `contract-${log.id}-${receivedDate}`,
            date: receivedDate,
            ...baseRow,
          },
          { crReceived: receivedAmount }
        )
      }

      if (balanceToBeReceived > 0 && balanceDate) {
        upsertRow(
          `contract-${log.id}-${balanceDate}`,
          {
            key: `contract-${log.id}-${balanceDate}`,
            date: balanceDate,
            ...baseRow,
          },
          { crBalanceToBeReceived: balanceToBeReceived }
        )
      }
    })

    dividendEntries.forEach((entry) => {
      const date = normalizeDateString(entry.date)

      if (!date) {
        return
      }

      upsertRow(
        `dividend-${entry.id}-${date}`,
        {
          key: `dividend-${entry.id}-${date}`,
          date,
          clientSupplier: entry.client || '-',
          mode: 'Dividend / Investment',
        },
        {
          drPaid: toNumber(entry.paid),
          crReceived: toNumber(entry.received),
        }
      )
    })

    return Array.from(rows.values()).sort((left, right) => {
      const dateCompare = normalizeDateValue(left.date) - normalizeDateValue(right.date)

      if (dateCompare !== 0) {
        return dateCompare
      }

      const clientCompare = left.clientSupplier.localeCompare(right.clientSupplier)
      if (clientCompare !== 0) {
        return clientCompare
      }

      return left.mode.localeCompare(right.mode)
    })
  }, [
    contractPaymentLogs,
    dividendEntries,
    paymentEntries,
    pettyCashVouchers,
    purchaseOrders,
  ])

  const report = useMemo(() => {
    const fromTime = normalizeDateValue(filters.fromDate)
    const toTime = normalizeDateValue(filters.toDate)

    if (
      !filters.fromDate ||
      !filters.toDate ||
      !Number.isFinite(fromTime) ||
      !Number.isFinite(toTime)
    ) {
      return {
        openingBalance: 0,
        openingAsOfDate: '',
        rows: [] as ReportRow[],
        totals: {
          dr: 0,
          cr: 0,
          closingBalance: 0,
        },
      }
    }

    const sortedRows = [...allRows].sort(
      (left, right) => normalizeDateValue(left.date) - normalizeDateValue(right.date)
    )

    const openingBalance = sortedRows
      .filter((row) => normalizeDateValue(row.date) < fromTime)
      .reduce(
        (total, row) =>
          total +
          row.crReceived +
          row.crBalanceToBeReceived -
          row.drPaid -
          row.drBalanceToBePaid,
        0
      )

    let runningBalance = openingBalance

    const rows = sortedRows
      .filter((row) => {
        const rowTime = normalizeDateValue(row.date)
        return rowTime >= fromTime && rowTime <= toTime
      })
      .map((row) => {
        runningBalance +=
          row.crReceived +
          row.crBalanceToBeReceived -
          row.drPaid -
          row.drBalanceToBePaid

        return {
          ...row,
          runningBalance,
        }
      })

    const totals = rows.reduce(
      (total, row) => {
        total.dr += row.drPaid + row.drBalanceToBePaid
        total.cr += row.crReceived + row.crBalanceToBeReceived
        total.closingBalance = row.runningBalance
        return total
      },
      {
        dr: 0,
        cr: 0,
        closingBalance: openingBalance,
      }
    )

    return {
      openingBalance,
      openingAsOfDate: getPreviousDate(filters.fromDate),
      rows,
      totals,
    }
  }, [allRows, filters.fromDate, filters.toDate])

  const hasDateRange = Boolean(filters.fromDate && filters.toDate)
  const isInvalidRange =
    hasDateRange &&
    normalizeDateValue(filters.fromDate) > normalizeDateValue(filters.toDate)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Cashflow Report</h1>
        <p className="mt-2 text-slate-700">
          Generate the cash flow report by selecting a date range.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="From Date">
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  fromDate: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="To Date">
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  toDate: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>
        </div>

        {loading ? <p className="mt-4 text-sm text-slate-600">Loading cashflow data...</p> : null}
        {isInvalidRange ? (
          <p className="mt-4 text-sm text-red-700">`From Date` cannot be after `To Date`.</p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">CASH FLOW REPORT</h2>
          <p className="mt-2 text-sm text-slate-700">
            From : {filters.fromDate ? formatReportDate(filters.fromDate) : '-'}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            To : {filters.toDate ? formatReportDate(filters.toDate) : '-'}
          </p>
        </div>

        <div className="max-h-[75vh] overflow-auto">
          <table className="min-w-[1400px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
              <tr>
                <HeaderCell rowSpan={2}>Date</HeaderCell>
                <HeaderCell rowSpan={2}>Client / Supplier</HeaderCell>
                <HeaderCell rowSpan={2}>Mode</HeaderCell>
                <HeaderCell colSpan={2} className="text-center">
                  Dr Amount
                </HeaderCell>
                <HeaderCell colSpan={2} className="text-center">
                  Cr Amount
                </HeaderCell>
                <HeaderCell rowSpan={2}>Balance</HeaderCell>
              </tr>
              <tr>
                <HeaderCell>Paid</HeaderCell>
                <HeaderCell>Balance to be Paid</HeaderCell>
                <HeaderCell>Received</HeaderCell>
                <HeaderCell>Balance to be Received</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {hasDateRange && !isInvalidRange ? (
                <>
                  <tr className="bg-slate-50 font-semibold">
                    <BodyCell colSpan={7} className="text-right text-slate-900">
                      As of {report.openingAsOfDate ? formatReportDate(report.openingAsOfDate) : '-'}
                    </BodyCell>
                    <BodyCell className="font-semibold text-slate-900">
                      {formatMoney(report.openingBalance)}
                    </BodyCell>
                  </tr>

                  {report.rows.length > 0 ? (
                    report.rows.map((row) => (
                      <tr key={row.key} className="border-b border-slate-200">
                        <BodyCell>{formatReportDate(row.date)}</BodyCell>
                        <BodyCell>{row.clientSupplier}</BodyCell>
                        <BodyCell>{row.mode}</BodyCell>
                        <MoneyCell value={row.drPaid} />
                        <MoneyCell value={row.drBalanceToBePaid} />
                        <MoneyCell value={row.crReceived} />
                        <MoneyCell value={row.crBalanceToBeReceived} />
                        <MoneyCell value={row.runningBalance} bold />
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <BodyCell colSpan={8}>
                        No cashflow rows found in the selected date range.
                      </BodyCell>
                    </tr>
                  )}

                </>
              ) : (
                <tr>
                  <BodyCell colSpan={8}>
                    Select `From Date` and `To Date` to generate the cash flow report.
                  </BodyCell>
                </tr>
              )}
            </tbody>
            {report ? (
              <tfoot className="sticky bottom-0 z-10 bg-slate-50 font-semibold">
                <tr>
                  <BodyCell colSpan={3} className="text-right text-slate-900">
                    Totals
                  </BodyCell>
                  <BodyCell colSpan={2} className="text-right font-semibold text-slate-900">
                    {formatMoney(report.totals.dr)}
                  </BodyCell>
                  <BodyCell colSpan={2} className="text-right font-semibold text-slate-900">
                    {formatMoney(report.totals.cr)}
                  </BodyCell>
                  <MoneyCell value={report.totals.closingBalance} bold />
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-800">{label}</span>
      {children}
    </label>
  )
}

function HeaderCell({
  children,
  rowSpan,
  colSpan,
  className = '',
}: {
  children: React.ReactNode
  rowSpan?: number
  colSpan?: number
  className?: string
}) {
  return (
    <th
      className={`border-b border-r border-slate-200 px-4 py-3 font-semibold ${className}`}
      rowSpan={rowSpan}
      colSpan={colSpan}
    >
      {children}
    </th>
  )
}

function BodyCell({
  children,
  colSpan,
  className = '',
}: {
  children?: React.ReactNode
  colSpan?: number
  className?: string
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

function MoneyCell({ value, bold = false }: { value: number; bold?: boolean }) {
  return (
    <BodyCell className={`text-right ${bold ? 'font-semibold text-slate-900' : ''}`}>
      {value === 0 ? '-' : formatMoney(value)}
    </BodyCell>
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

function normalizeDateString(value: string | null | undefined) {
  if (!value) {
    return ''
  }

  return value.slice(0, 10)
}

function normalizeDateValue(value: string | null | undefined) {
  if (!value) {
    return Number.NaN
  }

  return new Date(`${value}T00:00:00`).getTime()
}

function getPreviousDate(value: string) {
  const time = normalizeDateValue(value)

  if (!Number.isFinite(time)) {
    return ''
  }

  const date = new Date(time)
  date.setDate(date.getDate() - 1)
  return formatDateInputValue(date)
}

function formatReportDate(value: string) {
  const time = normalizeDateValue(value)

  if (!Number.isFinite(time)) {
    return '-'
  }

  const date = new Date(time)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = String(date.getDate()).padStart(2, '0')
  const month = months[date.getMonth()]
  const year = String(date.getFullYear()).slice(-2)

  return `${day}.${month}.${year}`
}

function formatDateInputValue(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
