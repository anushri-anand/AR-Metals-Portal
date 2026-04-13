'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type PurchaseOrderOption = {
  id: number
  po_number: string
  project_name: string
  supplier_name: string
}

type Phase = {
  amount: string
  dueDate: string
  forecastDate: string
  paid: string
  paidDate: string
}

type FormState = {
  poNumber: string
  projectName: string
  supplierName: string
  advance: string
  delivery: string
  retention: string
  numberOfPhases: string
  phases: Phase[]
}

const initialForm: FormState = {
  poNumber: '',
  projectName: '',
  supplierName: '',
  advance: '',
  delivery: '',
  retention: '',
  numberOfPhases: '',
  phases: [],
}

function createEmptyPhase(): Phase {
  return {
    amount: '',
    dueDate: '',
    forecastDate: '',
    paid: '',
    paidDate: '',
  }
}

export default function PaymentEntryForm() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderOption[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loadingPurchaseOrders, setLoadingPurchaseOrders] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadPurchaseOrders() {
      try {
        const data = await fetchAPI('/procurement/purchase-order/')
        setPurchaseOrders(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load purchase orders.'
        )
      } finally {
        setLoadingPurchaseOrders(false)
      }
    }

    loadPurchaseOrders()
  }, [])

  function handlePoChange(value: string) {
    const selectedPo = purchaseOrders.find((po) => po.po_number === value)

    setForm((prev) => ({
      ...prev,
      poNumber: value,
      projectName: selectedPo ? selectedPo.project_name : '',
      supplierName: selectedPo ? selectedPo.supplier_name : '',
    }))
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleNumberOfPhasesChange(value: string) {
    const phaseCount = Number(value || 0)

    setForm((prev) => {
      const nextPhases =
        phaseCount > 0
          ? Array.from(
              { length: phaseCount },
              (_, index) => prev.phases[index] || createEmptyPhase()
            )
          : []

      return {
        ...prev,
        numberOfPhases: value,
        phases: nextPhases,
      }
    })
  }

  function handlePhaseChange(index: number, field: keyof Phase, value: string) {
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

  function handlePhaseDueDateChange(index: number, value: string) {
    setForm((prev) => ({
      ...prev,
      phases: prev.phases.map((phase, phaseIndex) =>
        phaseIndex === index
          ? {
              ...phase,
              dueDate: value,
              forecastDate: value,
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
      await fetchAPI('/procurement/payment/entry/', {
        method: 'POST',
        body: JSON.stringify({
          po_number: form.poNumber,
          advance: form.advance || '0',
          delivery: form.delivery || '0',
          retention: form.retention || '0',
          phases: form.phases.map((phase) => ({
            amount: phase.amount || '0',
            due_date: phase.dueDate,
            forecast_date: phase.forecastDate || phase.dueDate,
            paid: phase.paid || '0',
            paid_date: phase.paidDate || null,
          })),
        }),
      })

      setForm(initialForm)
      setMessage('Payment entry saved successfully.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save payment entry.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Payment Entry</h1>
        <p className="mt-2 text-slate-700">
          Enter payment details against a purchase order.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="PO #">
            <select
              value={form.poNumber}
              onChange={(e) => handlePoChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
              disabled={loadingPurchaseOrders}
            >
              <option value="">
                {loadingPurchaseOrders ? 'Loading PO #' : 'Select PO #'}
              </option>
              {purchaseOrders.map((po) => (
                <option key={po.id} value={po.po_number}>
                  {po.po_number}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Project Name">
            <input
              value={form.projectName}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <Field label="Supplier Name">
            <input
              value={form.supplierName}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <Field label="Advance">
            <input
              type="number"
              step="0.01"
              name="advance"
              value={form.advance}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter advance amount"
            />
          </Field>

          <Field label="Delivery">
            <input
              type="number"
              step="0.01"
              name="delivery"
              value={form.delivery}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter delivery amount"
            />
          </Field>

          <Field label="Retention">
            <input
              type="number"
              step="0.01"
              name="retention"
              value={form.retention}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter retention amount"
            />
          </Field>

          <Field label="No. of Phases">
            <input
              type="number"
              min="0"
              name="numberOfPhases"
              value={form.numberOfPhases}
              onChange={(e) => handleNumberOfPhasesChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter number of phases"
            />
          </Field>
        </div>

        {form.phases.length > 0 && (
          <div className="mt-8 space-y-6">
            {form.phases.map((phase, index) => (
              <div key={index} className="rounded-xl border border-slate-200 p-6">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">
                  Phase {index + 1}
                </h2>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
                  <Field label="Amount">
                    <input
                      type="number"
                      step="0.01"
                      value={phase.amount}
                      onChange={(e) =>
                        handlePhaseChange(index, 'amount', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="Enter amount"
                    />
                  </Field>

                  <Field label="Due Date">
                    <input
                      type="date"
                      value={phase.dueDate}
                      onChange={(e) =>
                        handlePhaseDueDateChange(index, e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                    />
                  </Field>

                  <Field label="Forecast Date">
                    <input
                      type="date"
                      value={phase.forecastDate}
                      readOnly
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
                    />
                  </Field>

                  <Field label="Paid">
                    <input
                      type="number"
                      step="0.01"
                      value={phase.paid}
                      onChange={(e) =>
                        handlePhaseChange(index, 'paid', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="Enter paid amount"
                    />
                  </Field>

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
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>

          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
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
