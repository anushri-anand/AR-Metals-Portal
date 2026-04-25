'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import {
  buildSupplierSoaRows,
  formatSoaDate,
  formatSoaMoney,
  getTodayIsoDate,
  getVendorLocation,
  SoaAssociatedCostPaymentRecord,
  SoaProcurementPaymentRecord,
  SoaVendorRecord,
} from '@/lib/soa'

export default function SupplierSoaClient() {
  const [vendors, setVendors] = useState<SoaVendorRecord[]>([])
  const [procurementPayments, setProcurementPayments] = useState<SoaProcurementPaymentRecord[]>([])
  const [associatedCostPayments, setAssociatedCostPayments] = useState<
    SoaAssociatedCostPaymentRecord[]
  >([])
  const [selectedSupplierName, setSelectedSupplierName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [vendorData, paymentData, associatedPayments] = await Promise.all([
          fetchAPI('/procurement/vendor-data/'),
          fetchAPI('/procurement/payment/'),
          fetchAPI('/employees/associated-cost/payment/'),
        ])

        setVendors(Array.isArray(vendorData) ? (vendorData as SoaVendorRecord[]) : [])
        setProcurementPayments(
          Array.isArray(paymentData) ? (paymentData as SoaProcurementPaymentRecord[]) : []
        )
        setAssociatedCostPayments(
          Array.isArray(associatedPayments)
            ? (associatedPayments as SoaAssociatedCostPaymentRecord[])
            : []
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load supplier SOA.')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const supplierOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...vendors.map((item) => item.supplier_name),
            ...procurementPayments.map((item) => item.supplier_name || ''),
            ...associatedCostPayments.map((item) => item.supplier_name || ''),
          ].filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right)),
    [associatedCostPayments, procurementPayments, vendors]
  )

  const today = getTodayIsoDate()
  const selectedVendor =
    vendors.find((item) => item.supplier_name === selectedSupplierName) || null
  const rows = useMemo(
    () =>
      selectedSupplierName
        ? buildSupplierSoaRows({
            supplierName: selectedSupplierName,
            procurementPayments,
            associatedCostPayments,
            today,
          })
        : [],
    [associatedCostPayments, procurementPayments, selectedSupplierName, today]
  )

  const totals = useMemo(
    () =>
      rows.reduce(
        (total, row) => {
          total.invoiceAmount += row.invoiceAmount
          total.paid += row.paid
          total.balancePayable += row.balancePayable
          return total
        },
        { invoiceAmount: 0, paid: 0, balancePayable: 0 }
      ),
    [rows]
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">SOA - Supplier</h1>
        <p className="mt-2 text-slate-700">
          Select a supplier to view open payables as of today.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="Supplier Name">
            <select
              value={selectedSupplierName}
              onChange={(event) => setSelectedSupplierName(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              disabled={loading}
            >
              <option value="">
                {loading ? 'Loading suppliers...' : 'Select supplier name'}
              </option>
              {supplierOptions.map((supplierName) => (
                <option key={supplierName} value={supplierName}>
                  {supplierName}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-8 py-6 text-center">
          <p className="text-xl font-bold text-slate-900">
            {selectedSupplierName || 'Supplier'}
          </p>
          {selectedVendor ? (
            <p className="mt-1 text-sm text-slate-700">{getVendorLocation(selectedVendor)}</p>
          ) : null}
          <p className="mt-3 text-sm font-semibold text-slate-900">
            As Of: {formatSoaDate(today)}
          </p>
        </div>

        <div className="max-h-[72vh] overflow-auto">
          <table className="min-w-[1180px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-900">
              <tr>
                <HeaderCell>SN</HeaderCell>
                <HeaderCell>Invoice Date</HeaderCell>
                <HeaderCell>Invoice #</HeaderCell>
                <HeaderCell>PO #</HeaderCell>
                <HeaderCell className="text-right">Invoice Amount</HeaderCell>
                <HeaderCell className="text-right">Paid</HeaderCell>
                <HeaderCell className="text-right">Balance Payable</HeaderCell>
                <HeaderCell>Due Date</HeaderCell>
                <HeaderCell className="text-right">Over Due</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {!selectedSupplierName ? (
                <tr>
                  <BodyCell colSpan={9}>Select a supplier name to view the SOA.</BodyCell>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <BodyCell colSpan={9}>No open payables found for this supplier.</BodyCell>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={`${row.poNumber}-${row.invoiceNumber}-${row.sn}`} className="border-b border-slate-200">
                    <BodyCell>{row.sn}</BodyCell>
                    <BodyCell>{formatSoaDate(row.invoiceDate)}</BodyCell>
                    <BodyCell>{row.invoiceNumber || '-'}</BodyCell>
                    <BodyCell>{row.poNumber || '-'}</BodyCell>
                    <BodyCell className="text-right">{formatSoaMoney(row.invoiceAmount)}</BodyCell>
                    <BodyCell className="text-right">{formatSoaMoney(row.paid)}</BodyCell>
                    <BodyCell className="text-right">{formatSoaMoney(row.balancePayable)}</BodyCell>
                    <BodyCell>{formatSoaDate(row.dueDate)}</BodyCell>
                    <BodyCell className="text-right">{row.overDue}</BodyCell>
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 ? (
              <tfoot className="sticky bottom-0 z-10 bg-slate-50 font-semibold">
                <tr>
                  <BodyCell colSpan={4}>TOTAL AMOUNT IN AED</BodyCell>
                  <BodyCell className="text-right">{formatSoaMoney(totals.invoiceAmount)}</BodyCell>
                  <BodyCell className="text-right">{formatSoaMoney(totals.paid)}</BodyCell>
                  <BodyCell className="text-right">{formatSoaMoney(totals.balancePayable)}</BodyCell>
                  <BodyCell />
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

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-800">{label}</label>
      {children}
    </div>
  )
}

function HeaderCell({
  children,
  className = '',
}: {
  children?: React.ReactNode
  className?: string
}) {
  return <th className={`border border-slate-300 px-3 py-3 font-semibold ${className}`}>{children}</th>
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
    <td className={`border border-slate-200 px-3 py-3 text-slate-800 ${className}`} colSpan={colSpan}>
      {children}
    </td>
  )
}
