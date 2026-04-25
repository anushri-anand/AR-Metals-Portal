'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import { getStoredCompany } from '@/lib/company'
import {
  ClientData,
  ContractPaymentLog,
  formatMoney,
  getClientData,
  getContractPaymentLogs,
  getTenderLogs,
  TenderLog,
} from '@/lib/estimation-storage'
import {
  buildCorporateTaxDirectCostRegister,
  buildCorporateTaxIndirectCostRegister,
  buildCorporateTaxRevenueRegister,
  type CorporateTaxAssociatedCostEntryRecord,
  type CorporateTaxCostData,
  type CorporateTaxInventoryIssuanceRecord,
  type CorporateTaxPettyCashVoucher,
  type CorporateTaxSalaryActualIncurredCostRow,
  buildCorporateTaxSummary,
  type CorporateTaxPaymentEntryRecord,
  type CorporateTaxProjectOption,
  type CorporateTaxPurchaseOrderRecord,
  type CorporateTaxTimeAllocationLine,
  directCostCategoryOrder,
  formatCorporateTaxDateLabel,
  getCorporateTaxCompanyDisplayName,
  indirectCostCategoryOrder,
} from '@/lib/corporate-tax'

type CorporateTaxDataState = {
  contractPaymentLogs: ContractPaymentLog[]
  tenderLogs: TenderLog[]
  clientData: ClientData[]
  projectOptions: CorporateTaxProjectOption[]
  costData: CorporateTaxCostData
}

const emptyDataState: CorporateTaxDataState = {
  contractPaymentLogs: [],
  tenderLogs: [],
  clientData: [],
  projectOptions: [],
  costData: {
    purchaseOrders: [],
    paymentEntries: [],
    inventoryIssuances: [],
    pettyCashVouchers: [],
    associatedCostEntries: [],
    timeAllocationLines: [],
    salaryActualIncurredRows: [],
  },
}

export default function CorporateTaxClient() {
  const searchParams = useSearchParams()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [otherRevenueInput, setOtherRevenueInput] = useState('')
  const [data, setData] = useState<CorporateTaxDataState>(emptyDataState)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const queryFromDate = searchParams.get('from') || ''
    const queryToDate = searchParams.get('to') || ''
    const queryOtherRevenue = searchParams.get('otherRevenue') || ''

    if (queryFromDate) {
      setFromDate((prev) => prev || queryFromDate)
    }

    if (queryToDate) {
      setToDate((prev) => prev || queryToDate)
    }

    if (queryOtherRevenue) {
      setOtherRevenueInput((prev) => prev || queryOtherRevenue)
    }
  }, [searchParams])

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [
          contractPaymentLogs,
          tenderLogs,
          clientData,
          projectOptions,
          purchaseOrders,
          paymentEntries,
          inventoryIssuances,
          pettyCashVouchers,
          associatedCostEntries,
          timeAllocationLines,
          salaryActualIncurredRows,
        ] = await Promise.all([
          getContractPaymentLogs(),
          getTenderLogs(),
          getClientData(),
          fetchAPI('/production/project-details/options/'),
          fetchAPI('/procurement/purchase-order/'),
          fetchAPI('/procurement/payment/'),
          fetchAPI('/procurement/inventory-issuance/').catch(() => []),
          fetchAPI('/procurement/petty-cash/').catch(() => []),
          fetchAPI('/employees/associated-cost/').catch(() => []),
          fetchAPI('/production/time-allocation/').catch(() => []),
          fetchAPI('/employees/salary/actual-incurred-cost/').catch(() => []),
        ])

        setData({
          contractPaymentLogs,
          tenderLogs,
          clientData,
          projectOptions: Array.isArray(projectOptions) ? projectOptions : [],
          costData: {
            purchaseOrders: Array.isArray(purchaseOrders)
              ? (purchaseOrders as CorporateTaxPurchaseOrderRecord[])
              : [],
            paymentEntries: Array.isArray(paymentEntries)
              ? (paymentEntries as CorporateTaxPaymentEntryRecord[])
              : [],
            inventoryIssuances: Array.isArray(inventoryIssuances)
              ? (inventoryIssuances as CorporateTaxInventoryIssuanceRecord[])
              : [],
            pettyCashVouchers: Array.isArray(pettyCashVouchers)
              ? (pettyCashVouchers as CorporateTaxPettyCashVoucher[])
              : [],
            associatedCostEntries: Array.isArray(associatedCostEntries)
              ? (associatedCostEntries as CorporateTaxAssociatedCostEntryRecord[])
              : [],
            timeAllocationLines: Array.isArray(timeAllocationLines)
              ? (timeAllocationLines as CorporateTaxTimeAllocationLine[])
              : [],
            salaryActualIncurredRows: Array.isArray(salaryActualIncurredRows)
              ? (salaryActualIncurredRows as CorporateTaxSalaryActualIncurredCostRow[])
              : [],
          },
        })
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load corporate tax summary.'
        )
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const selectedCompany = getStoredCompany()
  const companyDisplayName = getCorporateTaxCompanyDisplayName(selectedCompany)
  const otherRevenueValue = toNumber(otherRevenueInput)
  const dateRangeError =
    fromDate && toDate && fromDate > toDate
      ? 'To date must be on or after from date.'
      : ''

  const revenueRows = useMemo(
    () =>
      fromDate && toDate && !dateRangeError
        ? buildCorporateTaxRevenueRegister({
            fromDate,
            toDate,
            contractPaymentLogs: data.contractPaymentLogs,
            tenderLogs: data.tenderLogs,
            clientData: data.clientData,
            projectOptions: data.projectOptions,
          })
        : [],
    [data, dateRangeError, fromDate, toDate]
  )

  const directCostRows = useMemo(
    () =>
      fromDate && toDate && !dateRangeError
        ? buildCorporateTaxDirectCostRegister({
            fromDate,
            toDate,
            costData: data.costData,
          })
        : [],
    [data.costData, dateRangeError, fromDate, toDate]
  )

  const indirectCostRows = useMemo(
    () =>
      fromDate && toDate && !dateRangeError
        ? buildCorporateTaxIndirectCostRegister({
            fromDate,
            toDate,
            costData: data.costData,
          })
        : [],
    [data.costData, dateRangeError, fromDate, toDate]
  )

  const summary = useMemo(
    () =>
      fromDate && toDate && !dateRangeError
        ? buildCorporateTaxSummary({
            revenueRows,
            directCostRows,
            indirectCostRows,
          })
        : null,
    [dateRangeError, directCostRows, fromDate, indirectCostRows, revenueRows, toDate]
  )
  const summaryWithOtherRevenue = useMemo(() => {
    if (!summary) {
      return null
    }

    const revenueTotal = summary.projectsRevenue + otherRevenueValue

    return {
      ...summary,
      otherRevenue: otherRevenueValue,
      revenueTotal,
      netProfitOrLoss: revenueTotal - summary.totalCost,
    }
  }, [otherRevenueValue, summary])

  function buildDetailHref(category: 'revenue' | 'direct-cost' | 'indirect-cost') {
    const params = new URLSearchParams()
    if (fromDate) params.set('from', fromDate)
    if (toDate) params.set('to', toDate)
    if (otherRevenueInput.trim()) params.set('otherRevenue', otherRevenueInput.trim())
    const query = params.toString()

    return `/reports/corporate-tax/${category}${query ? `?${query}` : ''}`
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Corporate Tax</h1>
        <p className="mt-2 text-slate-900">
          Select the reporting period to review the profit and loss summary.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Field label="From Date">
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="To Date">
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="Other Revenue">
            <input
              type="number"
              step="0.01"
              min="0"
              value={otherRevenueInput}
              onChange={(event) => setOtherRevenueInput(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter other revenue"
            />
          </Field>
        </div>

        {dateRangeError ? (
          <p className="mt-4 text-sm text-red-700">{dateRangeError}</p>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-8 py-6 text-center">
          <p className="text-lg font-bold uppercase text-slate-900">
            {companyDisplayName}
          </p>
          <h2 className="mt-1 text-xl font-bold uppercase tracking-wide text-slate-900">
            Profit and Loss
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-slate-900">Loading corporate tax summary...</div>
        ) : !fromDate || !toDate ? (
          <div className="p-8 text-slate-900">
            Select both from and to date to generate the corporate tax summary.
          </div>
        ) : dateRangeError ? (
          <div className="p-8 text-red-700">{dateRangeError}</div>
        ) : summaryWithOtherRevenue ? (
          <div className="space-y-6 p-6">
            <div className="grid gap-6 lg:grid-cols-[1.1fr,0.8fr]">
              <div className="rounded-xl border border-slate-300" />
              <div className="overflow-hidden rounded-xl border border-slate-300">
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    <InfoRow label="FROM" value={formatCorporateTaxDateLabel(fromDate)} />
                    <InfoRow label="TO" value={formatCorporateTaxDateLabel(toDate)} />
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-300">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <HeaderCell className="text-left">Description</HeaderCell>
                    <HeaderCell className="text-right">Amount</HeaderCell>
                  </tr>
                </thead>
                <tbody>
                  <ClickableSectionRow
                    href={buildDetailHref('revenue')}
                    label="REVENUE"
                    amount={summaryWithOtherRevenue.revenueTotal}
                  />
                  <AmountRow
                    label="Project Revenue"
                    amount={summaryWithOtherRevenue.projectsRevenue}
                  />
                  <AmountRow
                    label="Other Revenue"
                    amount={summaryWithOtherRevenue.otherRevenue}
                  />

                  <SectionTotalRow
                    label="COST"
                    amount={summaryWithOtherRevenue.totalCost}
                  />
                  <ClickableSectionRow
                    href={buildDetailHref('direct-cost')}
                    label="DIRECT COST"
                    amount={summaryWithOtherRevenue.directCostTotal}
                  />
                  {directCostCategoryOrder.map((label) => (
                    <AmountRow
                      key={label}
                      label={label}
                      amount={summaryWithOtherRevenue.directCostTotals[label] || 0}
                      indent
                    />
                  ))}

                  <ClickableSectionRow
                    href={buildDetailHref('indirect-cost')}
                    label="INDIRECT COST"
                    amount={summaryWithOtherRevenue.indirectCostTotal}
                  />
                  {indirectCostCategoryOrder.map((label) => (
                    <AmountRow
                      key={label}
                      label={label}
                      amount={summaryWithOtherRevenue.indirectCostTotals[label] || 0}
                      indent
                    />
                  ))}

                  <NetProfitRow
                    label="NET PROFIT / LOSS"
                    amount={summaryWithOtherRevenue.netProfitOrLoss}
                  />
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
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
      <span className="mb-1 block text-sm font-medium text-slate-900">{label}</span>
      {children}
    </label>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <th className="border-b border-r border-slate-300 bg-slate-100 px-4 py-3 text-left font-semibold text-slate-900">
        {label}
      </th>
      <td className="border-b border-slate-300 px-4 py-3 font-semibold text-slate-900">
        {value}
      </td>
    </tr>
  )
}

function HeaderCell({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <th
      className={`border-b border-r border-slate-300 px-4 py-3 font-semibold text-slate-900 ${className}`}
    >
      {children}
    </th>
  )
}

function ClickableSectionRow({
  href,
  label,
  amount,
}: {
  href: string
  label: string
  amount: number
}) {
  return (
    <tr className="bg-slate-50 font-bold text-slate-900">
      <td className="border-b border-r border-slate-300 px-4 py-3">
        <Link href={href} className="hover:text-blue-700 hover:underline">
          {label}
        </Link>
      </td>
      <td className="border-b border-slate-300 px-4 py-3 text-right">
        {formatMoney(amount)}
      </td>
    </tr>
  )
}

function SectionTotalRow({
  label,
  amount,
}: {
  label: string
  amount: number
}) {
  return (
    <tr className="bg-slate-50 font-bold text-slate-900">
      <td className="border-b border-r border-slate-300 px-4 py-3">{label}</td>
      <td className="border-b border-slate-300 px-4 py-3 text-right">
        {formatMoney(amount)}
      </td>
    </tr>
  )
}

function AmountRow({
  label,
  amount,
  indent = false,
}: {
  label: string
  amount: number
  indent?: boolean
}) {
  return (
    <tr>
      <td className="border-b border-r border-slate-300 px-4 py-3 text-slate-900">
        <span className={indent ? 'pl-6' : ''}>{label}</span>
      </td>
      <td className="border-b border-slate-300 px-4 py-3 text-right text-slate-900">
        {formatMoney(amount)}
      </td>
    </tr>
  )
}

function NetProfitRow({
  label,
  amount,
}: {
  label: string
  amount: number
}) {
  return (
    <tr className="bg-slate-100 font-bold text-slate-900">
      <td className="border-r border-t border-slate-400 px-4 py-3">{label}</td>
      <td className="border-t border-slate-400 px-4 py-3 text-right">
        {formatMoney(amount)}
      </td>
    </tr>
  )
}

function toNumber(value: string | number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
