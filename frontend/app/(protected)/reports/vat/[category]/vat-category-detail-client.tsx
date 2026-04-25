'use client'

import Link from 'next/link'
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
  buildDirectPayToFtaRegister,
  buildDomesticTaxablePurchaseRegister,
  buildDomesticTaxableSalesRegister,
  buildExportOutsideGccSalesRegister,
  buildIntraGccSalesRegister,
  buildUnregisteredPurchaseRegister,
  DirectPayToFtaRow,
  DomesticTaxablePurchaseRow,
  DomesticTaxableSalesRow,
  ExportOutsideGccSalesRow,
  formatVatDateLabel,
  getVatCompanyDisplayName,
  IntraGccSalesRow,
  UnregisteredPurchaseRow,
  VatAssociatedCostEntryRecord,
  VatAssociatedCostPaymentRecord,
  VatPaymentEntryRecord,
  VatProjectOption,
  VatPurchaseOrderRecord,
  vatSummaryClickableLabels,
  VatSummaryCategoryKey,
} from '@/lib/vat-summary'

type VatCategoryDetailClientProps = {
  category: VatSummaryCategoryKey
  fromDate: string
  toDate: string
}

type VatDetailDataState = {
  contractPaymentLogs: ContractPaymentLog[]
  tenderLogs: TenderLog[]
  clientData: ClientData[]
  projectOptions: VatProjectOption[]
  purchaseOrders: VatPurchaseOrderRecord[]
  paymentEntries: VatPaymentEntryRecord[]
  associatedCostEntries: VatAssociatedCostEntryRecord[]
  associatedCostPayments: VatAssociatedCostPaymentRecord[]
}

const emptyDataState: VatDetailDataState = {
  contractPaymentLogs: [],
  tenderLogs: [],
  clientData: [],
  projectOptions: [],
  purchaseOrders: [],
  paymentEntries: [],
  associatedCostEntries: [],
  associatedCostPayments: [],
}

export default function VatCategoryDetailClient({
  category,
  fromDate,
  toDate,
}: VatCategoryDetailClientProps) {
  const [data, setData] = useState<VatDetailDataState>(emptyDataState)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const title = vatSummaryClickableLabels[category] || 'VAT Detail'
  const selectedCompany = getStoredCompany()
  const companyDisplayName = getVatCompanyDisplayName(selectedCompany)

  const isDomesticTaxableSales = category === 'domestic-taxable-sales'
  const isIntraGccSales = category === 'intra-gcc-sales'
  const isExportOutsideGcc = category === 'export-outside-gcc'
  const isDomesticTaxablePurchase =
    category === 'domestic-taxable-purchase-with-vat'
  const isDirectPayToFta = category === 'direct-pay-to-fta'
  const isUnregisteredPurchase =
    category === 'unregistered-domestic-purchase'
  const needsSalesData =
    isDomesticTaxableSales || isIntraGccSales || isExportOutsideGcc
  const needsPurchaseData =
    isDomesticTaxablePurchase || isDirectPayToFta || isUnregisteredPurchase

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const nextState: VatDetailDataState = { ...emptyDataState }

        if (needsSalesData) {
          const [contractPaymentLogs, tenderLogs, clientData, projectOptions] =
            await Promise.all([
              getContractPaymentLogs(),
              getTenderLogs(),
              getClientData(),
              fetchAPI('/production/project-details/options/'),
            ])

          nextState.contractPaymentLogs = contractPaymentLogs
          nextState.tenderLogs = tenderLogs
          nextState.clientData = clientData
          nextState.projectOptions = Array.isArray(projectOptions)
            ? projectOptions
            : []
        }

        if (needsPurchaseData) {
          const [
            purchaseOrders,
            paymentEntries,
            associatedCostEntries,
            associatedCostPayments,
          ] = await Promise.all([
            fetchAPI('/procurement/purchase-order/'),
            fetchAPI('/procurement/payment/'),
            fetchAPI('/employees/associated-cost/'),
            fetchAPI('/employees/associated-cost/payment/'),
          ])

          nextState.purchaseOrders = Array.isArray(purchaseOrders)
            ? purchaseOrders
            : []
          nextState.paymentEntries = Array.isArray(paymentEntries)
            ? paymentEntries
            : []
          nextState.associatedCostEntries = Array.isArray(associatedCostEntries)
            ? associatedCostEntries
            : []
          nextState.associatedCostPayments = Array.isArray(associatedCostPayments)
            ? associatedCostPayments
            : []
        }

        setData(nextState)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load VAT detail data.'
        )
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [needsPurchaseData, needsSalesData])

  const domesticRows = useMemo(
    () =>
      isDomesticTaxableSales && fromDate && toDate
        ? buildDomesticTaxableSalesRegister({
            fromDate,
            toDate,
            contractPaymentLogs: data.contractPaymentLogs,
            tenderLogs: data.tenderLogs,
            clientData: data.clientData,
            projectOptions: data.projectOptions,
          })
        : [],
    [data, fromDate, isDomesticTaxableSales, toDate]
  )

  const intraGccRows = useMemo(
    () =>
      isIntraGccSales && fromDate && toDate
        ? buildIntraGccSalesRegister({
            fromDate,
            toDate,
            contractPaymentLogs: data.contractPaymentLogs,
            tenderLogs: data.tenderLogs,
            clientData: data.clientData,
            projectOptions: data.projectOptions,
          })
        : [],
    [data, fromDate, isIntraGccSales, toDate]
  )

  const exportRows = useMemo(
    () =>
      isExportOutsideGcc && fromDate && toDate
        ? buildExportOutsideGccSalesRegister({
            fromDate,
            toDate,
            contractPaymentLogs: data.contractPaymentLogs,
            tenderLogs: data.tenderLogs,
            clientData: data.clientData,
            projectOptions: data.projectOptions,
          })
        : [],
    [data, fromDate, isExportOutsideGcc, toDate]
  )

  const domesticPurchaseRows = useMemo(
    () =>
      isDomesticTaxablePurchase && fromDate && toDate
        ? buildDomesticTaxablePurchaseRegister({
            fromDate,
            toDate,
            paymentEntries: data.paymentEntries,
            purchaseOrders: data.purchaseOrders,
            associatedCostEntries: data.associatedCostEntries,
            associatedCostPayments: data.associatedCostPayments,
          })
        : [],
    [data, fromDate, isDomesticTaxablePurchase, toDate]
  )

  const directPayRows = useMemo(
    () =>
      isDirectPayToFta && fromDate && toDate
        ? buildDirectPayToFtaRegister({
            fromDate,
            toDate,
            paymentEntries: data.paymentEntries,
            purchaseOrders: data.purchaseOrders,
            associatedCostEntries: data.associatedCostEntries,
            associatedCostPayments: data.associatedCostPayments,
          })
        : [],
    [data, fromDate, isDirectPayToFta, toDate]
  )

  const unregisteredPurchaseRows = useMemo(
    () =>
      isUnregisteredPurchase && fromDate && toDate
        ? buildUnregisteredPurchaseRegister({
            fromDate,
            toDate,
            paymentEntries: data.paymentEntries,
            purchaseOrders: data.purchaseOrders,
            associatedCostEntries: data.associatedCostEntries,
            associatedCostPayments: data.associatedCostPayments,
          })
        : [],
    [data, fromDate, isUnregisteredPurchase, toDate]
  )

  const domesticTotals = domesticRows.reduce(
    (accumulator, row) => ({
      taxableAmount: accumulator.taxableAmount + row.taxableAmount,
      vatAmount: accumulator.vatAmount + row.vatAmount,
      amountIncVat: accumulator.amountIncVat + row.amountIncVat,
    }),
    { taxableAmount: 0, vatAmount: 0, amountIncVat: 0 }
  )
  const intraGccTotalAmount = intraGccRows.reduce(
    (total, row) => total + row.amount,
    0
  )
  const exportTotalAmount = exportRows.reduce((total, row) => total + row.amount, 0)
  const domesticPurchaseTotals = domesticPurchaseRows.reduce(
    (accumulator, row) => ({
      taxableAmount: accumulator.taxableAmount + row.taxableAmount,
      vatAmount: accumulator.vatAmount + row.vatAmount,
      amountIncVat: accumulator.amountIncVat + row.amountIncVat,
    }),
    { taxableAmount: 0, vatAmount: 0, amountIncVat: 0 }
  )
  const directPayTotalVat = directPayRows.reduce(
    (total, row) => total + row.vatAmount,
    0
  )
  const unregisteredTotals = unregisteredPurchaseRows.reduce(
    (accumulator, row) => ({
      taxableAmount: accumulator.taxableAmount + row.taxableAmount,
      vatAmount: accumulator.vatAmount + row.vatAmount,
      amountIncVat: accumulator.amountIncVat + row.amountIncVat,
    }),
    { taxableAmount: 0, vatAmount: 0, amountIncVat: 0 }
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">
          Period: {formatVatDateLabel(fromDate)} to {formatVatDateLabel(toDate)}
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      {isDomesticTaxableSales ? (
        <RegisterShell
          companyDisplayName={companyDisplayName}
          registerTitle="Domestic Taxable Sales Register"
          fromDate={fromDate}
          toDate={toDate}
          loading={loading}
          loadingText="Loading domestic taxable sales..."
        >
          <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-300">
            <table className="min-w-[1120px] w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100">
                <tr>
                  <HeaderCell className="w-16">SN</HeaderCell>
                  <HeaderCell className="w-32">Invoice Date</HeaderCell>
                  <HeaderCell className="min-w-[260px]">Customer Name</HeaderCell>
                  <HeaderCell className="w-40">Customer TRN #</HeaderCell>
                  <HeaderCell className="w-28">Invoice #</HeaderCell>
                  <HeaderCell className="w-32 text-right">Taxable Amount</HeaderCell>
                  <HeaderCell className="w-24 text-right">VAT %</HeaderCell>
                  <HeaderCell className="w-32 text-right">VAT Amount</HeaderCell>
                  <HeaderCell className="w-36 text-right">Amount Inc. VAT</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {domesticRows.length > 0 ? (
                  domesticRows.map((row, index) => (
                    <DomesticSalesRowView
                      key={`${row.invoiceNumber}-${index}`}
                      index={index}
                      row={row}
                    />
                  ))
                ) : (
                  <EmptyRow
                    colSpan={9}
                    message="No domestic taxable sales found for the selected period."
                  />
                )}
              </tbody>
              <tfoot className="sticky bottom-0 z-10 bg-slate-100">
                <tr>
                  <td className="border border-slate-300 px-4 py-3" />
                  <td className="border border-slate-300 px-4 py-3" />
                  <td
                    colSpan={3}
                    className="border border-slate-300 px-4 py-3 text-center font-semibold text-slate-900"
                  >
                    TOTAL AMOUNT IN AED
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(domesticTotals.taxableAmount)}
                  </td>
                  <td className="border border-slate-300 px-4 py-3" />
                  <td className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(domesticTotals.vatAmount)}
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(domesticTotals.amountIncVat)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </RegisterShell>
      ) : null}

      {isIntraGccSales ? (
        <RegisterShell
          companyDisplayName={companyDisplayName}
          registerTitle="Inter GCC Sales (Zero Rated) Register"
          fromDate={fromDate}
          toDate={toDate}
          loading={loading}
          loadingText="Loading intra GCC sales..."
        >
          <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-300">
            <table className="min-w-[900px] w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100">
                <tr>
                  <HeaderCell className="w-16">SN</HeaderCell>
                  <HeaderCell className="w-32">Invoice Date</HeaderCell>
                  <HeaderCell className="min-w-[260px]">Customer Name</HeaderCell>
                  <HeaderCell className="w-40">Customer TRN #</HeaderCell>
                  <HeaderCell className="w-28">Invoice #</HeaderCell>
                  <HeaderCell className="w-36 text-right">Amount</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {intraGccRows.length > 0 ? (
                  intraGccRows.map((row, index) => (
                    <IntraGccSalesRowView
                      key={`${row.invoiceNumber}-${index}`}
                      index={index}
                      row={row}
                    />
                  ))
                ) : (
                  <EmptyRow
                    colSpan={6}
                    message="No intra GCC sales found for the selected period."
                  />
                )}
              </tbody>
              <tfoot className="sticky bottom-0 z-10 bg-slate-100">
                <tr>
                  <td className="border border-slate-300 px-4 py-3" />
                  <td className="border border-slate-300 px-4 py-3" />
                  <td
                    colSpan={3}
                    className="border border-slate-300 px-4 py-3 text-center font-semibold text-slate-900"
                  >
                    TOTAL AMOUNT IN AED
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(intraGccTotalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </RegisterShell>
      ) : null}

      {isExportOutsideGcc ? (
        <RegisterShell
          companyDisplayName={companyDisplayName}
          registerTitle="Export Outside GCC (Zero Rated) Sales Register"
          fromDate={fromDate}
          toDate={toDate}
          loading={loading}
          loadingText="Loading export outside GCC sales..."
        >
          <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-300">
            <table className="min-w-[1040px] w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100">
                <tr>
                  <HeaderCell className="w-16">SN</HeaderCell>
                  <HeaderCell className="w-32">Invoice Date</HeaderCell>
                  <HeaderCell className="min-w-[220px]">Customer Name</HeaderCell>
                  <HeaderCell className="w-44">Customer Country</HeaderCell>
                  <HeaderCell className="w-40">Customer TRN #</HeaderCell>
                  <HeaderCell className="w-28">Invoice #</HeaderCell>
                  <HeaderCell className="w-36 text-right">Amount</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {exportRows.length > 0 ? (
                  exportRows.map((row, index) => (
                    <ExportOutsideGccRowView
                      key={`${row.invoiceNumber}-${index}`}
                      index={index}
                      row={row}
                    />
                  ))
                ) : (
                  <EmptyRow
                    colSpan={7}
                    message="No export outside GCC sales found for the selected period."
                  />
                )}
              </tbody>
              <tfoot className="sticky bottom-0 z-10 bg-slate-100">
                <tr>
                  <td className="border border-slate-300 px-4 py-3" />
                  <td className="border border-slate-300 px-4 py-3" />
                  <td
                    colSpan={4}
                    className="border border-slate-300 px-4 py-3 text-center font-semibold text-slate-900"
                  >
                    TOTAL AMOUNT IN AED
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(exportTotalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </RegisterShell>
      ) : null}

      {isDomesticTaxablePurchase ? (
        <RegisterShell
          companyDisplayName={companyDisplayName}
          registerTitle="Domestic Taxable Purchase Register"
          fromDate={fromDate}
          toDate={toDate}
          loading={loading}
          loadingText="Loading domestic taxable purchases..."
        >
          <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-300">
            <table className="min-w-[1120px] w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100">
                <tr>
                  <HeaderCell className="w-16">SN</HeaderCell>
                  <HeaderCell className="w-32">Invoice Date</HeaderCell>
                  <HeaderCell className="min-w-[260px]">Supplier Name</HeaderCell>
                  <HeaderCell className="w-40">Supplier TRN #</HeaderCell>
                  <HeaderCell className="w-32">Supplier Invoice #</HeaderCell>
                  <HeaderCell className="w-32 text-right">Taxable Amount</HeaderCell>
                  <HeaderCell className="w-24 text-right">VAT %</HeaderCell>
                  <HeaderCell className="w-32 text-right">VAT Amount</HeaderCell>
                  <HeaderCell className="w-36 text-right">Amount Inc. VAT</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {domesticPurchaseRows.length > 0 ? (
                  domesticPurchaseRows.map((row, index) => (
                    <DomesticTaxablePurchaseRowView
                      key={`${row.supplierInvoiceNumber}-${index}`}
                      index={index}
                      row={row}
                    />
                  ))
                ) : (
                  <EmptyRow
                    colSpan={9}
                    message="No domestic taxable purchases found for the selected period."
                  />
                )}
              </tbody>
              <tfoot className="sticky bottom-0 z-10 bg-slate-100">
                <tr>
                  <td className="border border-slate-300 px-4 py-3" />
                  <td className="border border-slate-300 px-4 py-3" />
                  <td
                    colSpan={3}
                    className="border border-slate-300 px-4 py-3 text-center font-semibold text-slate-900"
                  >
                    TOTAL AMOUNT IN AED
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(domesticPurchaseTotals.taxableAmount)}
                  </td>
                  <td className="border border-slate-300 px-4 py-3" />
                  <td className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(domesticPurchaseTotals.vatAmount)}
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(domesticPurchaseTotals.amountIncVat)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </RegisterShell>
      ) : null}

      {isDirectPayToFta ? (
        <RegisterShell
          companyDisplayName={companyDisplayName}
          registerTitle="Direct Paid to FTA Register"
          fromDate={fromDate}
          toDate={toDate}
          loading={loading}
          loadingText="Loading direct pay to FTA entries..."
        >
          <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-300">
            <table className="min-w-[980px] w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100">
                <tr>
                  <HeaderCell className="w-16">SN</HeaderCell>
                  <HeaderCell className="w-32">Invoice Date</HeaderCell>
                  <HeaderCell className="min-w-[240px]">Supplier Name</HeaderCell>
                  <HeaderCell className="w-40">Supplier TRN #</HeaderCell>
                  <HeaderCell className="w-36">Supplier Invoice / Ref #</HeaderCell>
                  <HeaderCell className="w-36">Remarks</HeaderCell>
                  <HeaderCell className="w-32 text-right">VAT Amount</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {directPayRows.length > 0 ? (
                  directPayRows.map((row, index) => (
                    <DirectPayToFtaRowView
                      key={`${row.supplierInvoiceRefNumber}-${index}`}
                      index={index}
                      row={row}
                    />
                  ))
                ) : (
                  <EmptyRow
                    colSpan={7}
                    message="No direct pay to FTA entries found for the selected period."
                  />
                )}
              </tbody>
              <tfoot className="sticky bottom-0 z-10 bg-slate-100">
                <tr>
                  <td className="border border-slate-300 px-4 py-3" />
                  <td className="border border-slate-300 px-4 py-3" />
                  <td
                    colSpan={4}
                    className="border border-slate-300 px-4 py-3 text-center font-semibold text-slate-900"
                  >
                    TOTAL AMOUNT IN AED
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(directPayTotalVat)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </RegisterShell>
      ) : null}

      {isUnregisteredPurchase ? (
        <RegisterShell
          companyDisplayName={companyDisplayName}
          registerTitle="Unregistered Purchase Register"
          fromDate={fromDate}
          toDate={toDate}
          loading={loading}
          loadingText="Loading unregistered purchases..."
        >
          <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-300">
            <table className="min-w-[1020px] w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100">
                <tr>
                  <HeaderCell className="w-16">SN</HeaderCell>
                  <HeaderCell className="w-32">Invoice Date</HeaderCell>
                  <HeaderCell className="min-w-[260px]">Supplier Name</HeaderCell>
                  <HeaderCell className="w-40">Supplier Inv/Other Ref #</HeaderCell>
                  <HeaderCell className="w-32 text-right">Taxable Amount</HeaderCell>
                  <HeaderCell className="w-24 text-right">VAT %</HeaderCell>
                  <HeaderCell className="w-32 text-right">VAT Amount</HeaderCell>
                  <HeaderCell className="w-36 text-right">Amount Inc. VAT</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {unregisteredPurchaseRows.length > 0 ? (
                  unregisteredPurchaseRows.map((row, index) => (
                    <UnregisteredPurchaseRowView
                      key={`${row.supplierInvoiceRefNumber}-${index}`}
                      index={index}
                      row={row}
                    />
                  ))
                ) : (
                  <EmptyRow
                    colSpan={8}
                    message="No unregistered purchases found for the selected period."
                  />
                )}
              </tbody>
              <tfoot className="sticky bottom-0 z-10 bg-slate-100">
                <tr>
                  <td className="border border-slate-300 px-4 py-3" />
                  <td className="border border-slate-300 px-4 py-3" />
                  <td
                    colSpan={2}
                    className="border border-slate-300 px-4 py-3 text-center font-semibold text-slate-900"
                  >
                    TOTAL AMOUNT IN AED
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(unregisteredTotals.taxableAmount)}
                  </td>
                  <td className="border border-slate-300 px-4 py-3" />
                  <td className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-900">
                    {formatMoneyOrDash(unregisteredTotals.vatAmount)}
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-right font-semibold text-slate-900">
                    {formatMoney(unregisteredTotals.amountIncVat)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </RegisterShell>
      ) : null}

      <div>
        <Link
          href={`/reports/vat?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(
            toDate
          )}`}
          className="inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
        >
          Back to VAT Summary
        </Link>
      </div>
    </div>
  )
}

function RegisterShell({
  companyDisplayName,
  registerTitle,
  fromDate,
  toDate,
  loading,
  loadingText,
  children,
}: {
  companyDisplayName: string
  registerTitle: string
  fromDate: string
  toDate: string
  loading: boolean
  loadingText: string
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-8 py-6 text-center">
        <p className="text-lg font-bold uppercase text-slate-900">
          {companyDisplayName}
        </p>
        <h2 className="mt-1 text-xl font-bold uppercase tracking-wide text-slate-900">
          {registerTitle}
        </h2>
      </div>

      {loading ? (
        <div className="p-8 text-slate-700">{loadingText}</div>
      ) : (
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

          {children}
        </div>
      )}
    </div>
  )
}

function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="border border-slate-300 px-4 py-6 text-center text-slate-600"
      >
        {message}
      </td>
    </tr>
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
      className={`border border-slate-300 px-4 py-3 text-center font-semibold uppercase tracking-wide text-slate-900 ${className}`}
    >
      {children}
    </th>
  )
}

function DomesticSalesRowView({
  index,
  row,
}: {
  index: number
  row: DomesticTaxableSalesRow
}) {
  return (
    <tr>
      <td className="border border-slate-300 px-4 py-2.5 text-center text-slate-800">
        {index + 1}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {formatVatDateLabel(row.invoiceDate)}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {row.customerName || '-'}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {row.customerTrn || '-'}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {row.invoiceNumber || '-'}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right text-slate-800">
        {formatMoney(row.taxableAmount)}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right text-slate-800">
        {formatPercent(row.vatPercent)}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right text-slate-800">
        {formatMoney(row.vatAmount)}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right text-slate-800">
        {formatMoney(row.amountIncVat)}
      </td>
    </tr>
  )
}

function IntraGccSalesRowView({
  index,
  row,
}: {
  index: number
  row: IntraGccSalesRow
}) {
  return (
    <tr>
      <td className="border border-slate-300 px-4 py-2.5 text-center text-slate-800">
        {index + 1}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {formatVatDateLabel(row.invoiceDate)}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {row.customerName || '-'}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {row.customerTrn || '-'}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {row.invoiceNumber || '-'}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right text-slate-800">
        {formatMoney(row.amount)}
      </td>
    </tr>
  )
}

function ExportOutsideGccRowView({
  index,
  row,
}: {
  index: number
  row: ExportOutsideGccSalesRow
}) {
  return (
    <tr>
      <td className="border border-slate-300 px-4 py-2.5 text-center text-slate-800">
        {index + 1}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {formatVatDateLabel(row.invoiceDate)}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {row.customerName || '-'}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {row.customerCountry || '-'}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {row.customerTrn || '-'}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {row.invoiceNumber || '-'}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right text-slate-800">
        {formatMoney(row.amount)}
      </td>
    </tr>
  )
}

function DomesticTaxablePurchaseRowView({
  index,
  row,
}: {
  index: number
  row: DomesticTaxablePurchaseRow
}) {
  return (
    <tr>
      <td className="border border-slate-300 px-4 py-2.5 text-center text-slate-800">
        {index + 1}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {formatVatDateLabel(row.invoiceDate)}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {row.supplierName || '-'}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {row.supplierTrn || '-'}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {row.supplierInvoiceNumber || '-'}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right text-slate-800">
        {formatMoney(row.taxableAmount)}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right text-slate-800">
        {formatPercent(row.vatPercent)}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right text-slate-800">
        {formatMoney(row.vatAmount)}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right text-slate-800">
        {formatMoney(row.amountIncVat)}
      </td>
    </tr>
  )
}

function DirectPayToFtaRowView({
  index,
  row,
}: {
  index: number
  row: DirectPayToFtaRow
}) {
  return (
    <tr>
      <td className="border border-slate-300 px-4 py-2.5 text-center text-slate-800">
        {index + 1}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {formatVatDateLabel(row.invoiceDate)}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {row.supplierName || '-'}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {row.supplierTrn || '-'}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {row.supplierInvoiceRefNumber || '-'}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {row.remarks || '-'}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right text-slate-800">
        {formatMoney(row.vatAmount)}
      </td>
    </tr>
  )
}

function UnregisteredPurchaseRowView({
  index,
  row,
}: {
  index: number
  row: UnregisteredPurchaseRow
}) {
  return (
    <tr>
      <td className="border border-slate-300 px-4 py-2.5 text-center text-slate-800">
        {index + 1}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {formatVatDateLabel(row.invoiceDate)}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {row.supplierName || '-'}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-slate-800">
        {row.supplierInvoiceRefNumber || '-'}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right text-slate-800">
        {formatMoney(row.taxableAmount)}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right text-slate-800">
        {formatPercent(row.vatPercent, false)}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right text-slate-800">
        {formatMoneyOrDash(row.vatAmount)}
      </td>
      <td className="border border-slate-300 px-4 py-2.5 text-right text-slate-800">
        {formatMoney(row.amountIncVat)}
      </td>
    </tr>
  )
}

function formatPercent(value: number, zeroAsDash = true) {
  if (!value) {
    return zeroAsDash ? '-' : '0%'
  }

  return `${Number(value.toFixed(2)).toString()}%`
}

function formatMoneyOrDash(value: number) {
  return value ? formatMoney(value) : '-'
}
