'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type ApiPhase = {
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
}

type PaymentRecord = {
  id: number
  po_number: string
  project_name: string
  supplier_name: string
  advance: string
  recovery_advance: string
  delivery: string
  retention: string
  release_retention: string
  net_payable_amount: string
  phases: ApiPhase[]
}

type Phase = {
  id: number
  amount: string
  dueDate: string
  forecastDate: string
  paidIncVat: string
  vat: string
  paidDate: string
  invoiceNo: string
  invoiceDate: string
}

type FormState = {
  poNumber: string
  projectName: string
  supplierName: string
  advance: string
  recoveryAdvance: string
  delivery: string
  retention: string
  releaseRetention: string
  netPayableAmount: string
  phases: Phase[]
}

const initialForm: FormState = {
  poNumber: '',
  projectName: '',
  supplierName: '',
  advance: '',
  recoveryAdvance: '',
  delivery: '',
  retention: '',
  releaseRetention: '',
  netPayableAmount: '',
  phases: [],
}

export default function PaymentUpdateForm() {
  const [records, setRecords] = useState<PaymentRecord[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadPaymentRecords()
  }, [])

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

  function loadRecord(record: PaymentRecord | undefined) {
    setMessage('')

    if (!record) {
      setForm(initialForm)
      return
    }

    setForm({
      poNumber: record.po_number,
      projectName: record.project_name,
      supplierName: record.supplier_name,
      advance: record.advance,
      recoveryAdvance: record.recovery_advance,
      delivery: record.delivery,
      retention: record.retention,
      releaseRetention: record.release_retention,
      netPayableAmount: record.net_payable_amount,
      phases: record.phases.map((phase) => ({
        id: phase.id,
        amount: phase.amount,
        dueDate: phase.due_date,
        forecastDate: phase.forecast_date,
        paidIncVat: phase.paid_inc_vat,
        vat: phase.vat,
        paidDate: phase.paid_date || '',
        invoiceNo: phase.invoice_no || '',
        invoiceDate: phase.invoice_date || '',
      })),
    })
  }

  function handlePoChange(value: string) {
    const record = records.find((item) => item.po_number === value)
    loadRecord(record)
  }

  function handleProjectChange(value: string) {
    const record = records.find((item) => item.project_name === value)
    loadRecord(record)
  }

  function handleSupplierChange(value: string) {
    const record = records.find((item) => item.supplier_name === value)
    loadRecord(record)
  }

  function handlePhaseChange(
    index: number,
    field:
      | 'forecastDate'
      | 'paidIncVat'
      | 'vat'
      | 'paidDate'
      | 'invoiceNo'
      | 'invoiceDate',
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      phases: prev.phases.map((phase, phaseIndex) =>
        phaseIndex === index
          ? {
              ...phase,
              [field]: value,
            }
          : phase
      ),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)

    try {
      const updatedRecord = await fetchAPI('/procurement/payment/update/', {
        method: 'POST',
        body: JSON.stringify({
          po_number: form.poNumber,
          phases: form.phases.map((phase) => ({
            id: phase.id,
            forecast_date: phase.forecastDate,
            paid_inc_vat: phase.paidIncVat || '0',
            vat: phase.vat || '0',
            paid_date: phase.paidDate || null,
            invoice_no: phase.invoiceNo,
            invoice_date: phase.invoiceDate || null,
          })),
        }),
      })

      setRecords((prev) =>
        prev.map((record) =>
          record.po_number === updatedRecord.po_number ? updatedRecord : record
        )
      )
      loadRecord(updatedRecord)
      setMessage('Payment update saved successfully.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save payment update.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Payment Update</h1>
        <p className="mt-2 text-slate-700">
          Select a real payment record and update forecast date plus invoice
          payment details.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <Field label="PO #">
            <select
              value={form.poNumber}
              onChange={(e) => handlePoChange(e.target.value)}
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

          <Field label="Project Name">
            <select
              value={form.projectName}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              disabled={loading}
            >
              <option value="">Select project</option>
              {records.map((record) => (
                <option key={`${record.id}-project`} value={record.project_name}>
                  {record.project_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Supplier Name">
            <select
              value={form.supplierName}
              onChange={(e) => handleSupplierChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              disabled={loading}
            >
              <option value="">Select supplier</option>
              {records.map((record) => (
                <option
                  key={`${record.id}-supplier`}
                  value={record.supplier_name}
                >
                  {record.supplier_name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

        {!loading && records.length === 0 && (
          <p className="mt-8 text-slate-700">
            No payment entries found yet. Add one from Payment Entry first.
          </p>
        )}

        {!form.poNumber && records.length > 0 ? (
          <p className="mt-8 text-slate-700">
            Select a record to view payment details.
          </p>
        ) : form.poNumber ? (
          <>
            <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
              <ReadOnlyField label="Advance" value={form.advance} />
              <ReadOnlyField
                label="Recovery of Advance"
                value={form.recoveryAdvance}
              />
              <ReadOnlyField label="Against Delivery" value={form.delivery} />
              <ReadOnlyField label="Retention" value={form.retention} />
              <ReadOnlyField
                label="Release of Retention"
                value={form.releaseRetention}
              />
              <ReadOnlyField
                label="Net Payable Amount"
                value={form.netPayableAmount}
              />
            </div>

            <div className="mt-8 space-y-6">
              {form.phases.map((phase, index) => (
                <div
                  key={phase.id}
                  className="rounded-xl border border-slate-200 p-6"
                >
                  <h2 className="mb-4 text-lg font-semibold text-slate-900">
                    Phase {index + 1}
                  </h2>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                    <ReadOnlyField label="Amount" value={phase.amount} />
                    <ReadOnlyField label="Due Date" value={phase.dueDate} />

                    <Field label="Forecast Date">
                      <input
                        type="date"
                        value={phase.forecastDate}
                        onChange={(e) =>
                          handlePhaseChange(
                            index,
                            'forecastDate',
                            e.target.value
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      />
                    </Field>

                    <Field label="Paid Inc VAT">
                      <input
                        type="number"
                        step="0.01"
                        value={phase.paidIncVat}
                        onChange={(e) =>
                          handlePhaseChange(index, 'paidIncVat', e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                        placeholder="Enter paid amount inc VAT"
                      />
                    </Field>

                    <Field label="VAT">
                      <input
                        type="number"
                        step="0.01"
                        value={phase.vat}
                        onChange={(e) =>
                          handlePhaseChange(index, 'vat', e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                        placeholder="Enter VAT"
                      />
                    </Field>

                    <ReadOnlyField
                      label="Paid Exc VAT"
                      value={formatMoney(
                        Number(phase.paidIncVat || 0) - Number(phase.vat || 0)
                      )}
                    />

                    <Field label="Paid Date">
                      <input
                        type="date"
                        value={phase.paidDate}
                        onChange={(e) =>
                          handlePhaseChange(index, 'paidDate', e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      />
                    </Field>

                    <Field label="Invoice No.">
                      <input
                        value={phase.invoiceNo}
                        onChange={(e) =>
                          handlePhaseChange(index, 'invoiceNo', e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                        placeholder="Enter invoice number"
                      />
                    </Field>

                    <Field label="Invoice Date">
                      <input
                        type="date"
                        value={phase.invoiceDate}
                        onChange={(e) =>
                          handlePhaseChange(index, 'invoiceDate', e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
              >
                {saving ? 'Saving...' : 'Save Update'}
              </button>

              {message && <p className="text-sm text-green-700">{message}</p>}
            </div>
          </>
        ) : null}
      </form>
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <input
        value={value || '-'}
        readOnly
        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
      />
    </Field>
  )
}

function formatMoney(value: number) {
  return value.toFixed(2)
}
