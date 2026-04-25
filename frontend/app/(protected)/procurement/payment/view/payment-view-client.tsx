'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type DeliveryItem = {
  id: number
  line_number: number
  item_description: string
  quantity: string
  unit: string
  rate: string
  received_quantity: string
  actual_incurred_cost: string
}

type Phase = {
  id: number
  phase_number: number
  amount: string
  due_date: string
  forecast_date: string
  paid_inc_vat: string
  vat: string
  paid_exc_vat: string
  paid_date: string | null
  invoice_no: string
  invoice_date: string | null
  gl_no: string
  gl_date: string | null
}

type PaymentRecord = {
  id: number
  po_number: string
  project_number: string
  project_name: string
  po_amount: string
  supplier_name: string
  advance: string
  recovery_advance: string
  delivery: string
  retention: string
  release_retention: string
  net_payable_amount: string
  payment_status: string
  delivery_items: DeliveryItem[]
  phases: Phase[]
}

export default function PaymentViewClient() {
  const [records, setRecords] = useState<PaymentRecord[]>([])
  const [selectedPoNumber, setSelectedPoNumber] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadPaymentRecords() {
      try {
        const data = await fetchAPI('/procurement/payment/')
        setRecords(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load payment entries.'
        )
      } finally {
        setLoading(false)
      }
    }

    void loadPaymentRecords()
  }, [])

  const selectedRecord = useMemo(
    () => records.find((record) => record.po_number === selectedPoNumber) || null,
    [records, selectedPoNumber]
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Payment View</h1>
        <p className="mt-2 text-slate-700">
          Select a PO # to review the full saved payment entry.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Field label="PO #">
          <select
            value={selectedPoNumber}
            onChange={(e) => setSelectedPoNumber(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            disabled={loading}
          >
            <option value="">
              {loading ? 'Loading payment entries...' : 'Select PO #'}
            </option>
            {records.map((record) => (
              <option key={record.id} value={record.po_number}>
                {record.po_number}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Payment Summary
          </h2>
        </div>
        <div className="max-h-[60vh] overflow-auto">
          <table className="min-w-[1600px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
              <tr>
                <HeaderCell>PO #</HeaderCell>
                <HeaderCell>Project #</HeaderCell>
                <HeaderCell>Project Name</HeaderCell>
                <HeaderCell>Supplier Name</HeaderCell>
                <HeaderCell>PO Amount</HeaderCell>
                <HeaderCell>Advance</HeaderCell>
                <HeaderCell>Recovery of Advance</HeaderCell>
                <HeaderCell>Against Delivery</HeaderCell>
                <HeaderCell>Retention</HeaderCell>
                <HeaderCell>Release of Retention</HeaderCell>
                <HeaderCell>Net Payable Amount</HeaderCell>
                <HeaderCell>Open / Closed</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {selectedRecord ? (
                <tr className="border-b border-slate-200">
                  <BodyCell>{selectedRecord.po_number}</BodyCell>
                  <BodyCell>{selectedRecord.project_number || '-'}</BodyCell>
                  <BodyCell>{selectedRecord.project_name || '-'}</BodyCell>
                  <BodyCell>{selectedRecord.supplier_name}</BodyCell>
                  <BodyCell>{selectedRecord.po_amount}</BodyCell>
                  <BodyCell>{selectedRecord.advance}</BodyCell>
                  <BodyCell>{selectedRecord.recovery_advance}</BodyCell>
                  <BodyCell>{selectedRecord.delivery}</BodyCell>
                  <BodyCell>{selectedRecord.retention}</BodyCell>
                  <BodyCell>{selectedRecord.release_retention}</BodyCell>
                  <BodyCell>{selectedRecord.net_payable_amount}</BodyCell>
                  <BodyCell>{selectedRecord.payment_status}</BodyCell>
                </tr>
              ) : (
                <tr>
                  <BodyCell colSpan={12}>
                    {loading
                      ? 'Loading payment summary...'
                      : 'Select a PO # to view payment details.'}
                  </BodyCell>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRecord ? (
        <>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900">
                Delivery Items
              </h2>
            </div>
            <div className="max-h-[60vh] overflow-auto">
              <table className="min-w-[1220px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
                  <tr>
                    <HeaderCell>Line #</HeaderCell>
                    <HeaderCell>Item Description</HeaderCell>
                    <HeaderCell>Quantity</HeaderCell>
                    <HeaderCell>Unit</HeaderCell>
                    <HeaderCell>Rate</HeaderCell>
                    <HeaderCell>Received Quantity</HeaderCell>
                    <HeaderCell>Actual Incurred Cost</HeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecord.delivery_items.length > 0 ? (
                    selectedRecord.delivery_items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-200">
                        <BodyCell>{item.line_number}</BodyCell>
                        <BodyCell>{item.item_description || '-'}</BodyCell>
                        <BodyCell>{item.quantity}</BodyCell>
                        <BodyCell>{item.unit || '-'}</BodyCell>
                        <BodyCell>{item.rate}</BodyCell>
                        <BodyCell>{item.received_quantity}</BodyCell>
                        <BodyCell>{item.actual_incurred_cost}</BodyCell>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <BodyCell colSpan={7}>No delivery items found.</BodyCell>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900">Phases</h2>
            </div>
            <div className="max-h-[60vh] overflow-auto">
              <table className="min-w-[1500px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
                  <tr>
                    <HeaderCell>Phase</HeaderCell>
                    <HeaderCell>Payable Amount</HeaderCell>
                    <HeaderCell>Due Date</HeaderCell>
                    <HeaderCell>Forecast Date</HeaderCell>
                    <HeaderCell>Paid Inc VAT</HeaderCell>
                    <HeaderCell>VAT</HeaderCell>
                    <HeaderCell>Paid Exc VAT</HeaderCell>
                    <HeaderCell>Paid Date</HeaderCell>
                    <HeaderCell>Invoice No.</HeaderCell>
                    <HeaderCell>Invoice Date</HeaderCell>
                    <HeaderCell>GL No.</HeaderCell>
                    <HeaderCell>GL Date</HeaderCell>
                    <HeaderCell>Balance to be Paid</HeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {selectedRecord.phases.length > 0 ? (
                    selectedRecord.phases.map((phase) => (
                      <tr key={phase.id} className="border-b border-slate-200">
                        <BodyCell>{phase.phase_number}</BodyCell>
                        <BodyCell>{phase.amount}</BodyCell>
                        <BodyCell>{formatDate(phase.due_date)}</BodyCell>
                        <BodyCell>{formatDate(phase.forecast_date)}</BodyCell>
                        <BodyCell>{phase.paid_inc_vat}</BodyCell>
                        <BodyCell>{phase.vat}</BodyCell>
                        <BodyCell>{phase.paid_exc_vat}</BodyCell>
                        <BodyCell>{formatDate(phase.paid_date)}</BodyCell>
                        <BodyCell>{phase.invoice_no || '-'}</BodyCell>
                        <BodyCell>{formatDate(phase.invoice_date)}</BodyCell>
                        <BodyCell>{phase.gl_no || '-'}</BodyCell>
                        <BodyCell>{formatDate(phase.gl_date)}</BodyCell>
                        <BodyCell>
                          {formatMoney(
                            Number(phase.amount || 0) - Number(phase.paid_inc_vat || 0)
                          )}
                        </BodyCell>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <BodyCell colSpan={13}>No phases found.</BodyCell>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
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

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-r border-slate-200 px-4 py-3 font-semibold">
      {children}
    </th>
  )
}

function BodyCell({
  children,
  colSpan,
}: {
  children: React.ReactNode
  colSpan?: number
}) {
  return (
    <td
      className="border-r border-slate-200 px-4 py-3 align-top text-slate-700"
      colSpan={colSpan}
    >
      {children}
    </td>
  )
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB')
}

function formatMoney(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}
