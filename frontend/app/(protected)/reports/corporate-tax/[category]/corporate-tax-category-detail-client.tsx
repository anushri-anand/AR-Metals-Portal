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
  CorporateTaxDetailCategory,
  type CorporateTaxInventoryIssuanceRecord,
  type CorporateTaxPaymentEntryRecord,
  type CorporateTaxPettyCashVoucher,
  type CorporateTaxProjectOption,
  type CorporateTaxPurchaseOrderRecord,
  type CorporateTaxPurchaseRow,
  type CorporateTaxRevenueRow,
  type CorporateTaxSalaryActualIncurredCostRow,
  type CorporateTaxTimeAllocationLine,
  formatCorporateTaxDateLabel,
  getCorporateTaxCompanyDisplayName,
} from '@/lib/corporate-tax'

type CorporateTaxDetailClientProps = {
  category: string
  fromDate: string
  toDate: string
}

type CorporateTaxDetailDataState = {
  contractPaymentLogs: ContractPaymentLog[]
  tenderLogs: TenderLog[]
  clientData: ClientData[]
  projectOptions: CorporateTaxProjectOption[]
  costData: CorporateTaxCostData
}

const emptyDataState: CorporateTaxDetailDataState = {
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

export default function CorporateTaxCategoryDetailClient({
  category,
  fromDate,
  toDate,
}: CorporateTaxDetailClientProps) {
  const searchParams = useSearchParams()
  const [data, setData] = useState<CorporateTaxDetailDataState>(emptyDataState)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const resolvedCategory = normalizeCategory(category)
  const selectedCompany = getStoredCompany()
  const companyDisplayName = getCorporateTaxCompanyDisplayName(selectedCompany)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        if (resolvedCategory === 'revenue') {
          const [contractPaymentLogs, tenderLogs, clientData, projectOptions] =
            await Promise.all([
              getContractPaymentLogs(),
              getTenderLogs(),
              getClientData(),
              fetchAPI('/production/project-details/options/'),
            ])

          setData({
            contractPaymentLogs,
            tenderLogs,
            clientData,
            projectOptions: Array.isArray(projectOptions) ? projectOptions : [],
            costData: emptyDataState.costData,
          })
          return
        }

        const [
          purchaseOrders,
          paymentEntries,
          inventoryIssuances,
          pettyCashVouchers,
          associatedCostEntries,
          timeAllocationLines,
          salaryActualIncurredRows,
        ] = await Promise.all([
          fetchAPI('/procurement/purchase-order/'),
          fetchAPI('/procurement/payment/'),
          fetchAPI('/procurement/inventory-issuance/').catch(() => []),
          fetchAPI('/procurement/petty-cash/').catch(() => []),
          fetchAPI('/employees/associated-cost/').catch(() => []),
          fetchAPI('/production/time-allocation/').catch(() => []),
          fetchAPI('/employees/salary/actual-incurred-cost/').catch(() => []),
        ])

        setData({
          ...emptyDataState,
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
          err instanceof Error ? err.message : 'Failed to load corporate tax detail.'
        )
      } finally {
        setLoading(false)
      }
    }

    if (!resolvedCategory) {
      setLoading(false)
      setError('Invalid corporate tax category.')
      return
    }

    void loadData()
  }, [resolvedCategory])

  const revenueRows = useMemo(
    () =>
      resolvedCategory === 'revenue' && fromDate && toDate
        ? buildCorporateTaxRevenueRegister({
            fromDate,
            toDate,
            contractPaymentLogs: data.contractPaymentLogs,
            tenderLogs: data.tenderLogs,
            clientData: data.clientData,
            projectOptions: data.projectOptions,
          })
        : [],
    [data, fromDate, resolvedCategory, toDate]
  )

  const directCostRows = useMemo(
    () =>
      resolvedCategory === 'direct-cost' && fromDate && toDate
        ? buildCorporateTaxDirectCostRegister({
            fromDate,
            toDate,
            costData: data.costData,
          })
        : [],
    [data.costData, fromDate, resolvedCategory, toDate]
  )

  const indirectCostRows = useMemo(
    () =>
      resolvedCategory === 'indirect-cost' && fromDate && toDate
        ? buildCorporateTaxIndirectCostRegister({
            fromDate,
            toDate,
            costData: data.costData,
          })
        : [],
    [data.costData, fromDate, resolvedCategory, toDate]
  )

  const groupedPurchaseRows = useMemo(() => {
    const sourceRows =
      resolvedCategory === 'direct-cost' ? directCostRows : indirectCostRows
    const grouped = new Map<string, CorporateTaxPurchaseRow[]>()

    for (const row of sourceRows) {
      const rows = grouped.get(row.groupLabel) || []
      rows.push(row)
      grouped.set(row.groupLabel, rows)
    }

    return Array.from(grouped.entries())
  }, [directCostRows, indirectCostRows, resolvedCategory])

  const revenueTotal = revenueRows.reduce(
    (total, row) => total + row.taxableAmount,
    0
  )
  const revenueVatTotal = revenueRows.reduce((total, row) => total + row.vatAmount, 0)
  const revenueIncVatTotal = revenueRows.reduce(
    (total, row) => total + row.amountIncVat,
    0
  )

  const purchaseTotals = (resolvedCategory === 'direct-cost'
    ? directCostRows
    : indirectCostRows
  ).reduce(
    (accumulator, row) => ({
      taxableAmount: accumulator.taxableAmount + row.taxableAmount,
      vatAmount: accumulator.vatAmount + row.vatAmount,
      amountIncVat: accumulator.amountIncVat + row.amountIncVat,
    }),
    { taxableAmount: 0, vatAmount: 0, amountIncVat: 0 }
  )

  const backHref = buildBackHref(fromDate, toDate, searchParams.get('otherRevenue') || '')

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {getPageHeading(resolvedCategory)}
            </h1>
            <p className="mt-2 text-slate-900">
              Review the selected corporate tax register for the chosen period.
            </p>
          </div>
          <Link
            href={backHref}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Back to Corporate Tax
          </Link>
        </div>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-8 py-6 text-center">
          <p className="text-lg font-bold uppercase text-slate-900">
            {companyDisplayName}
          </p>
          <h2 className="mt-1 text-xl font-bold uppercase tracking-wide text-slate-900">
            {getReportTitle(resolvedCategory)}
          </h2>
          {resolvedCategory !== 'revenue' ? (
            <p className="mt-1 text-sm font-semibold uppercase text-slate-900">
              {resolvedCategory === 'direct-cost' ? 'Direct Cost' : 'Indirect Cost'}
            </p>
          ) : null}
        </div>

        {loading ? (
          <div className="p-8 text-slate-900">Loading report...</div>
        ) : !resolvedCategory ? (
          <div className="p-8 text-red-700">Invalid corporate tax category.</div>
        ) : !fromDate || !toDate ? (
          <div className="p-8 text-slate-900">
            Select both from and to date on the Corporate Tax page first.
          </div>
        ) : (
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

            {resolvedCategory === 'revenue' ? (
              <RevenueTable
                rows={revenueRows}
                taxableAmount={revenueTotal}
                vatAmount={revenueVatTotal}
                amountIncVat={revenueIncVatTotal}
              />
            ) : (
              <PurchaseTable groups={groupedPurchaseRows} totals={purchaseTotals} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function RevenueTable({
  rows,
  taxableAmount,
  vatAmount,
  amountIncVat,
}: {
  rows: CorporateTaxRevenueRow[]
  taxableAmount: number
  vatAmount: number
  amountIncVat: number
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-300">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-sm">
          <thead className="bg-slate-100">
            <tr>
              <HeaderCell className="w-[70px]">SN</HeaderCell>
              <HeaderCell className="w-[140px]">Invoice Date</HeaderCell>
              <HeaderCell className="w-[340px] text-left">Customer Name</HeaderCell>
              <HeaderCell className="w-[140px]">Invoice #</HeaderCell>
              <HeaderCell className="w-[160px] text-right">Taxable Amount</HeaderCell>
              <HeaderCell className="w-[110px] text-right">VAT %</HeaderCell>
              <HeaderCell className="w-[150px] text-right">VAT Amount</HeaderCell>
              <HeaderCell className="w-[170px] text-right">Amount Inc. VAT</HeaderCell>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`revenue-row-${row.sn}`}>
                <BodyCell>{row.sn}</BodyCell>
                <BodyCell>{formatCorporateTaxDateLabel(row.invoiceDate)}</BodyCell>
                <BodyCell className="text-left">{row.customerName || '-'}</BodyCell>
                <BodyCell>{row.invoiceNumber || '-'}</BodyCell>
                <BodyCell className="text-right">{formatMoney(row.taxableAmount)}</BodyCell>
                <BodyCell className="text-right">{formatPercent(row.vatPercent)}</BodyCell>
                <BodyCell className="text-right">{formatMoney(row.vatAmount)}</BodyCell>
                <BodyCell className="text-right">{formatMoney(row.amountIncVat)}</BodyCell>
              </tr>
            ))}
            <tr className="bg-slate-100 font-bold text-slate-900">
              <td colSpan={4} className="border-t border-r border-slate-300 px-4 py-3 text-center">
                TOTAL AMOUNT IN AED
              </td>
              <td className="border-t border-r border-slate-300 px-4 py-3 text-right">
                {formatMoney(taxableAmount)}
              </td>
              <td className="border-t border-r border-slate-300 px-4 py-3 text-right">-</td>
              <td className="border-t border-r border-slate-300 px-4 py-3 text-right">
                {formatMoney(vatAmount)}
              </td>
              <td className="border-t border-slate-300 px-4 py-3 text-right">
                {formatMoney(amountIncVat)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PurchaseTable({
  groups,
  totals,
}: {
  groups: Array<[string, CorporateTaxPurchaseRow[]]>
  totals: {
    taxableAmount: number
    vatAmount: number
    amountIncVat: number
  }
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-300">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] border-collapse text-sm">
          <thead className="bg-slate-100">
            <tr>
              <HeaderCell className="w-[70px]">SN</HeaderCell>
              <HeaderCell className="w-[140px]">GL Date</HeaderCell>
              <HeaderCell className="w-[320px] text-left">Supplier Name</HeaderCell>
              <HeaderCell className="w-[140px]">Invoice Date</HeaderCell>
              <HeaderCell className="w-[160px] text-right">Taxable Amount</HeaderCell>
              <HeaderCell className="w-[110px] text-right">VAT %</HeaderCell>
              <HeaderCell className="w-[150px] text-right">VAT Amount</HeaderCell>
              <HeaderCell className="w-[170px] text-right">Amount Inc. VAT</HeaderCell>
            </tr>
          </thead>
          <tbody>
            {groups.map(([groupLabel, rows]) => (
              <FragmentSection key={groupLabel} label={groupLabel} rows={rows} />
            ))}
            <tr className="bg-slate-100 font-bold text-slate-900">
              <td colSpan={4} className="border-t border-r border-slate-300 px-4 py-3 text-center">
                TOTAL AMOUNT IN AED
              </td>
              <td className="border-t border-r border-slate-300 px-4 py-3 text-right">
                {formatMoney(totals.taxableAmount)}
              </td>
              <td className="border-t border-r border-slate-300 px-4 py-3 text-right">-</td>
              <td className="border-t border-r border-slate-300 px-4 py-3 text-right">
                {formatMoney(totals.vatAmount)}
              </td>
              <td className="border-t border-slate-300 px-4 py-3 text-right">
                {formatMoney(totals.amountIncVat)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FragmentSection({
  label,
  rows,
}: {
  label: string
  rows: CorporateTaxPurchaseRow[]
}) {
  return (
    <>
      <tr className="bg-slate-50 font-bold uppercase text-slate-900">
        <td colSpan={8} className="border-t border-b border-slate-300 px-4 py-2">
          {label}
        </td>
      </tr>
      {rows.map((row) => (
        <tr key={`${label}-${row.sn}-${row.invoiceNumber}`}>
          <BodyCell>{row.sn}</BodyCell>
          <BodyCell>{formatCorporateTaxDateLabel(row.glDate)}</BodyCell>
          <BodyCell className="text-left">{row.supplierName || '-'}</BodyCell>
          <BodyCell>{formatCorporateTaxDateLabel(row.invoiceDate)}</BodyCell>
          <BodyCell className="text-right">{formatMoney(row.taxableAmount)}</BodyCell>
          <BodyCell className="text-right">{formatPercent(row.vatPercent)}</BodyCell>
          <BodyCell className="text-right">{formatMoney(row.vatAmount)}</BodyCell>
          <BodyCell className="text-right">{formatMoney(row.amountIncVat)}</BodyCell>
        </tr>
      ))}
    </>
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

function BodyCell({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <td
      className={`border-b border-r border-slate-300 px-4 py-3 text-slate-900 ${className}`}
    >
      {children}
    </td>
  )
}

function normalizeCategory(value: string): CorporateTaxDetailCategory | null {
  if (value === 'revenue' || value === 'direct-cost' || value === 'indirect-cost') {
    return value
  }

  return null
}

function getPageHeading(category: CorporateTaxDetailCategory | null) {
  if (category === 'revenue') {
    return 'Corporate Tax Revenue'
  }

  if (category === 'direct-cost') {
    return 'Corporate Tax Direct Cost'
  }

  if (category === 'indirect-cost') {
    return 'Corporate Tax Indirect Cost'
  }

  return 'Corporate Tax Detail'
}

function getReportTitle(category: CorporateTaxDetailCategory | null) {
  if (category === 'revenue') {
    return 'Sales Register'
  }

  return 'Purchase Register'
}

function buildBackHref(fromDate: string, toDate: string, otherRevenue: string) {
  const params = new URLSearchParams()
  if (fromDate) params.set('from', fromDate)
  if (toDate) params.set('to', toDate)
  if (otherRevenue) params.set('otherRevenue', otherRevenue)
  const query = params.toString()

  return `/reports/corporate-tax${query ? `?${query}` : ''}`
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`
}
