'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type PurchaseOrderItem = {
  line_number: number
  item_description: string
  quantity: string
  unit: string
  rate: string
}

type PurchaseOrderOption = {
  id: number
  po_number: string
  project_name: string
  supplier_name: string
  purchase_items: PurchaseOrderItem[]
}

type DeliveryItem = PurchaseOrderItem & {
  receivedQuantity: string
}

type Phase = {
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
  retention: string
  releaseRetention: string
  deliveryItems: DeliveryItem[]
  numberOfPhases: string
  phases: Phase[]
}

const initialForm: FormState = {
  poNumber: '',
  projectName: '',
  supplierName: '',
  advance: '',
  recoveryAdvance: '',
  retention: '',
  releaseRetention: '',
  deliveryItems: [],
  numberOfPhases: '',
  phases: [],
}

function createEmptyPhase(): Phase {
  return {
    amount: '',
    dueDate: '',
    forecastDate: '',
    paidIncVat: '',
    vat: '',
    paidDate: '',
    invoiceNo: '',
    invoiceDate: '',
  }
}

export default function PaymentEntryForm() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderOption[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loadingPurchaseOrders, setLoadingPurchaseOrders] = useState(true)
  const [saving, setSaving] = useState(false)

  const againstDeliveryTotal = form.deliveryItems.reduce(
    (total, item) =>
      total + Number(item.receivedQuantity || 0) * Number(item.rate || 0),
    0
  )
  const netPayableAmount =
    Number(form.advance || 0) -
    Number(form.recoveryAdvance || 0) +
    againstDeliveryTotal -
    Number(form.retention || 0) +
    Number(form.releaseRetention || 0)

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
      deliveryItems: (selectedPo?.purchase_items || []).map((item) => ({
        ...item,
        receivedQuantity: '',
      })),
    }))
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleDeliveryItemChange(index: number, value: string) {
    setForm((prev) => ({
      ...prev,
      deliveryItems: prev.deliveryItems.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              receivedQuantity: value,
            }
          : item
      ),
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
          recovery_advance: form.recoveryAdvance || '0',
          delivery: formatMoney(againstDeliveryTotal),
          retention: form.retention || '0',
          release_retention: form.releaseRetention || '0',
          delivery_items: form.deliveryItems.map((item) => ({
            line_number: item.line_number,
            received_quantity: item.receivedQuantity || '0',
          })),
          phases: form.phases.map((phase) => ({
            amount: phase.amount || '0',
            due_date: phase.dueDate,
            forecast_date: phase.forecastDate || phase.dueDate,
            paid_inc_vat: phase.paidIncVat || '0',
            vat: phase.vat || '0',
            paid_date: phase.paidDate || null,
            invoice_no: phase.invoiceNo,
            invoice_date: phase.invoiceDate || null,
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

          <Field label="Recovery of Advance">
            <input
              type="number"
              step="0.01"
              name="recoveryAdvance"
              value={form.recoveryAdvance}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter recovered advance"
            />
          </Field>

          <Field label="Against Delivery">
            <input
              value={formatMoney(againstDeliveryTotal)}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
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

          <Field label="Release of Retention">
            <input
              type="number"
              step="0.01"
              name="releaseRetention"
              value={form.releaseRetention}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter released retention"
            />
          </Field>

          <Field label="Net Payable Amount">
            <input
              value={formatMoney(netPayableAmount)}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-semibold text-slate-900"
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

        {form.poNumber && (
          <div className="mt-8 rounded-xl border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Against Delivery Items
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Received quantity is multiplied by the PO rate to calculate actual
              incurred cost.
            </p>

            {form.deliveryItems.length > 0 ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-[900px] divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-700">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Item</th>
                      <th className="px-4 py-3 font-semibold">Quantity</th>
                      <th className="px-4 py-3 font-semibold">Unit</th>
                      <th className="px-4 py-3 font-semibold">Received Quantity</th>
                      <th className="px-4 py-3 font-semibold">Actual Incurred Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {form.deliveryItems.map((item, index) => (
                      <tr key={item.line_number}>
                        <td className="px-4 py-3 text-slate-900">
                          {item.item_description || `Item ${item.line_number}`}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatNumber(item.quantity)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.unit || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            step="0.01"
                            value={item.receivedQuantity}
                            onChange={(e) =>
                              handleDeliveryItemChange(index, e.target.value)
                            }
                            className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {formatMoney(
                            Number(item.receivedQuantity || 0) *
                              Number(item.rate || 0)
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50">
                    <tr>
                      <td
                        className="px-4 py-3 text-right font-semibold text-slate-900"
                        colSpan={4}
                      >
                        Against Delivery Total
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {formatMoney(againstDeliveryTotal)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              <p className="mt-4 text-sm text-amber-700">
                No PO item rows found for this purchase order.
              </p>
            )}
          </div>
        )}

        {form.phases.length > 0 && (
          <div className="mt-8 space-y-6">
            {form.phases.map((phase, index) => (
              <div key={index} className="rounded-xl border border-slate-200 p-6">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">
                  Phase {index + 1}
                </h2>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
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

                  <Field label="Paid Exc VAT">
                    <input
                      value={formatMoney(
                        Number(phase.paidIncVat || 0) - Number(phase.vat || 0)
                      )}
                      readOnly
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
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

function formatMoney(value: number) {
  return value.toFixed(2)
}

function formatNumber(value: string) {
  return Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}
