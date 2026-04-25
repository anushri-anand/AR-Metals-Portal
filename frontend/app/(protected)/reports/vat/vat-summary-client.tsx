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
  buildVatSummary,
  formatVatDateLabel,
  getVatCompanyDisplayName,
  VatAssociatedCostEntryRecord,
  VatAssociatedCostPaymentRecord,
  VatPaymentEntryRecord,
  VatProjectOption,
  VatPurchaseOrderRecord,
  vatPurchaseCategoryOrder,
  vatSalesCategoryOrder,
  vatSummaryClickableLabels,
  VatSummaryCategoryKey,
} from '@/lib/vat-summary'

type VatDataState = {
  contractPaymentLogs: ContractPaymentLog[]
  tenderLogs: TenderLog[]
  clientData: ClientData[]
  projectOptions: VatProjectOption[]
  purchaseOrders: VatPurchaseOrderRecord[]
  paymentEntries: VatPaymentEntryRecord[]
  associatedCostEntries: VatAssociatedCostEntryRecord[]
  associatedCostPayments: VatAssociatedCostPaymentRecord[]
}

const emptyDataState: VatDataState = {
  contractPaymentLogs: [],
  tenderLogs: [],
  clientData: [],
  projectOptions: [],
  purchaseOrders: [],
  paymentEntries: [],
  associatedCostEntries: [],
  associatedCostPayments: [],
}

export default function VatSummaryClient() {
  const searchParams = useSearchParams()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [data, setData] = useState<VatDataState>(emptyDataState)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const queryFromDate = searchParams.get('from') || ''
    const queryToDate = searchParams.get('to') || ''

    if (queryFromDate) {
      setFromDate((prev) => prev || queryFromDate)
    }

    if (queryToDate) {
      setToDate((prev) => prev || queryToDate)
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
          associatedCostEntries,
          associatedCostPayments,
        ] = await Promise.all([
          getContractPaymentLogs(),
          getTenderLogs(),
          getClientData(),
          fetchAPI('/production/project-details/options/'),
          fetchAPI('/procurement/purchase-order/'),
          fetchAPI('/procurement/payment/'),
          fetchAPI('/employees/associated-cost/'),
          fetchAPI('/employees/associated-cost/payment/'),
        ])

        setData({
          contractPaymentLogs,
          tenderLogs,
          clientData,
          projectOptions: Array.isArray(projectOptions) ? projectOptions : [],
          purchaseOrders: Array.isArray(purchaseOrders) ? purchaseOrders : [],
          paymentEntries: Array.isArray(paymentEntries) ? paymentEntries : [],
          associatedCostEntries: Array.isArray(associatedCostEntries)
            ? associatedCostEntries
            : [],
          associatedCostPayments: Array.isArray(associatedCostPayments)
            ? associatedCostPayments
            : [],
        })
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load VAT summary data.'
        )
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const selectedCompany = getStoredCompany()
  const companyDisplayName = getVatCompanyDisplayName(selectedCompany)
  const dateRangeError =
    fromDate && toDate && fromDate > toDate
      ? 'To date must be on or after from date.'
      : ''
  const summary = useMemo(
    () =>
      fromDate && toDate && !dateRangeError
        ? buildVatSummary({
            fromDate,
            toDate,
            ...data,
          })
        : null,
    [data, dateRangeError, fromDate, toDate]
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">VAT Summary</h1>
        <p className="mt-2 text-slate-700">
          Select the reporting period to review VAT on sales and purchases.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Category links are ready now. We can plug in the detailed tables on those
          pages once you send them.
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
            VAT Return Summary
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-slate-700">Loading VAT summary...</div>
        ) : !fromDate || !toDate ? (
          <div className="p-8 text-slate-700">
            Select both from and to date to generate the VAT summary.
          </div>
        ) : dateRangeError ? (
          <div className="p-8 text-red-700">{dateRangeError}</div>
        ) : summary ? (
          <div className="space-y-6 p-6">
            <div className="grid gap-6 lg:grid-cols-[1.1fr,0.8fr]">
              <div className="rounded-xl border border-slate-300" />
              <div className="overflow-hidden rounded-xl border border-slate-300">
                <table className="w-full border-collapse text-sm">
                  <tbody>
                    <InfoRow label="FROM" value={formatVatDateLabel(fromDate)} />
                    <InfoRow label="TO" value={formatVatDateLabel(toDate)} />
                  </tbody>
                </table>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-300">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <HeaderCell className="text-left">Description</HeaderCell>
                    <HeaderCell className="text-right">Taxable Amount</HeaderCell>
                    <HeaderCell className="text-right">VAT Amount</HeaderCell>
                  </tr>
                </thead>
                <tbody>
                  <SectionRow title="VAT ON SALE" />
                  {vatSalesCategoryOrder.map((categoryKey) => (
                    <CategoryRow
                      key={categoryKey}
                      categoryKey={categoryKey}
                      fromDate={fromDate}
                      toDate={toDate}
                      taxableAmount={summary.sales[categoryKey].taxableAmount}
                      vatAmount={summary.sales[categoryKey].vatAmount}
                    />
                  ))}
                  <TotalRow
                    label="Total"
                    taxableAmount={summary.totalSalesTaxableAmount}
                    vatAmount={summary.totalSalesVatAmount}
                  />

                  <SectionRow title="VAT ON PURCHASE" />
                  {vatPurchaseCategoryOrder.map((categoryKey) => (
                    <CategoryRow
                      key={categoryKey}
                      categoryKey={categoryKey}
                      fromDate={fromDate}
                      toDate={toDate}
                      taxableAmount={summary.purchases[categoryKey].taxableAmount}
                      vatAmount={summary.purchases[categoryKey].vatAmount}
                    />
                  ))}
                  <TotalRow
                    label="Total"
                    taxableAmount={summary.totalPurchasesTaxableAmount}
                    vatAmount={summary.totalPurchasesVatAmount}
                  />

                  <tr className="bg-slate-100">
                    <td className="border border-slate-300 px-4 py-3 font-bold text-slate-900">
                      VAT Payable / VAT Refundable
                    </td>
                    <td className="border border-slate-300 px-4 py-3 text-right text-slate-900">
                      -
                    </td>
                    <td className="border border-slate-300 px-4 py-3 text-right font-bold text-slate-900">
                      {formatValue(summary.vatPayableOrRefundable)}
                    </td>
                  </tr>
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
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td className="border border-slate-300 px-4 py-2.5 font-semibold text-slate-900">
        {label}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right font-semibold text-slate-900">
        {value}
      </td>
    </tr>
  )
}

function HeaderCell({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <th
      className={`border border-slate-300 px-4 py-3 font-semibold uppercase tracking-wide text-slate-900 ${className}`}
    >
      {children}
    </th>
  )
}

function SectionRow({ title }: { title: string }) {
  return (
    <tr className="bg-slate-50">
      <td className="border border-slate-300 px-4 py-3 font-bold uppercase text-slate-900">
        {title}
      </td>
      <td className="border border-slate-300 px-4 py-3" />
      <td className="border border-slate-300 px-4 py-3" />
    </tr>
  )
}

function CategoryRow({
  categoryKey,
  fromDate,
  toDate,
  taxableAmount,
  vatAmount,
}: {
  categoryKey: VatSummaryCategoryKey
  fromDate: string
  toDate: string
  taxableAmount: number
  vatAmount: number
}) {
  const query = new URLSearchParams({
    from: fromDate,
    to: toDate,
  }).toString()

  return (
    <tr>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        <Link
          href={`/reports/vat/${categoryKey}?${query}`}
          className="underline decoration-slate-300 underline-offset-4 hover:text-slate-950"
        >
          {vatSummaryClickableLabels[categoryKey]}
        </Link>
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right text-slate-800">
        {formatValue(taxableAmount)}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right text-slate-800">
        {formatValue(vatAmount)}
      </td>
    </tr>
  )
}

function TotalRow({
  label,
  taxableAmount,
  vatAmount,
}: {
  label: string
  taxableAmount: number
  vatAmount: number
}) {
  return (
    <tr className="bg-slate-50">
      <td className="border border-slate-300 px-4 py-2.5 text-right font-semibold text-slate-900">
        {label}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right font-semibold text-slate-900">
        {formatValue(taxableAmount)}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right font-semibold text-slate-900">
        {formatValue(vatAmount)}
      </td>
    </tr>
  )
}

function formatValue(value: number) {
  return value ? formatMoney(value) : '-'
}
