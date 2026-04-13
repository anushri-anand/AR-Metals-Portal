'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type VendorOption = {
  id: number
  supplier_name: string
}

type PurchaseOrderItem = {
  item: string
  quantity: string
  unit: string
  rate: string
}

type FormState = {
  poNumber: string
  projectNumber: string
  projectName: string
  costCode: string
  poDateOriginal: string
  poDateRevised: string
  poRevNumber: string
  supplierName: string
  numberOfItems: string
  currency: string
  exchangeRate: string
  vatAed: string
  modeOfPayment: string
  remarks: string
}

const initialForm: FormState = {
  poNumber: '',
  projectNumber: '',
  projectName: '',
  costCode: '',
  poDateOriginal: '',
  poDateRevised: '',
  poRevNumber: '',
  supplierName: '',
  numberOfItems: '',
  currency: '',
  exchangeRate: '',
  vatAed: '',
  modeOfPayment: '',
  remarks: '',
}

function createEmptyItem(): PurchaseOrderItem {
  return {
    item: '',
    quantity: '',
    unit: '',
    rate: '',
  }
}

export default function ProjectPurchaseOrderEntryForm() {
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [items, setItems] = useState<PurchaseOrderItem[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loadingVendors, setLoadingVendors] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadVendors() {
      try {
        const data = await fetchAPI('/procurement/vendor-data/')
        setVendors(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load suppliers.')
      } finally {
        setLoadingVendors(false)
      }
    }

    loadVendors()
  }, [])

  const poAmount = useMemo(() => {
    return items.reduce((total, item) => {
      const quantity = Number(item.quantity || 0)
      const rate = Number(item.rate || 0)
      return total + quantity * rate
    }, 0)
  }, [items])

  const poAmountAed = useMemo(() => {
    const exchangeRate = Number(form.exchangeRate || 0)
    return poAmount * exchangeRate
  }, [poAmount, form.exchangeRate])

  const poAmountIncVatAed = useMemo(() => {
    const vatAed = Number(form.vatAed || 0)
    return poAmountAed + vatAed
  }, [poAmountAed, form.vatAed])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleNumberOfItemsChange(value: string) {
    const itemCount = Number(value || 0)

    setForm((prev) => ({
      ...prev,
      numberOfItems: value,
    }))

    setItems((prev) =>
      itemCount > 0
        ? Array.from({ length: itemCount }, (_, index) => prev[index] || createEmptyItem())
        : []
    )
  }

  function handleItemChange(
    index: number,
    field: keyof PurchaseOrderItem,
    value: string
  ) {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    )
  }

  function getItemAmount(item: PurchaseOrderItem) {
    const quantity = Number(item.quantity || 0)
    const rate = Number(item.rate || 0)
    return quantity * rate
  }

  function buildItemDescription() {
    return items
      .map((item, index) => {
        const amount = getItemAmount(item).toFixed(2)
        return `${index + 1}. ${item.item} | Qty: ${item.quantity} | Unit: ${item.unit} | Rate: ${item.rate} | Amount: ${amount}`
      })
      .join('\n')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)

    try {
      await fetchAPI('/procurement/purchase-order/entry/', {
        method: 'POST',
        body: JSON.stringify({
          po_number: form.poNumber,
          project_number: form.projectNumber,
          project_name: form.projectName,
          cost_code: form.costCode,
          po_date_original: form.poDateOriginal,
          po_date_revised: form.poDateRevised || null,
          po_rev_number: form.poRevNumber,
          supplier_name: form.supplierName,
          item_description: buildItemDescription(),
          currency: form.currency,
          po_amount: poAmount.toFixed(2),
          exchange_rate: form.exchangeRate,
          vat_aed: form.vatAed,
          mode_of_payment: form.modeOfPayment,
          remarks: form.remarks,
        }),
      })

      setForm(initialForm)
      setItems([])
      setMessage('Project purchase order saved successfully.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save purchase order.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Project Purchase Order Entry
        </h1>
        <p className="mt-2 text-slate-700">
          Enter project purchase order details and item-wise amounts.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="PO #">
            <input
              name="poNumber"
              value={form.poNumber}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter PO number"
              required
            />
          </Field>

          <Field label="Project #">
            <input
              name="projectNumber"
              value={form.projectNumber}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter project number"
              required
            />
          </Field>

          <Field label="Project Name">
            <input
              name="projectName"
              value={form.projectName}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter project name"
              required
            />
          </Field>

          <Field label="Cost Code">
            <select
              name="costCode"
              value={form.costCode}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            >
              <option value="">Select cost code</option>
              <option value="MAT">MAT</option>
              <option value="CON">CON</option>
              <option value="LAB">LAB</option>
              <option value="FOH">FOH</option>
              <option value="SHP">SHP</option>
              <option value="CUS">CUS</option>
            </select>
          </Field>

          <Field label="PO Date - Original">
            <input
              type="date"
              name="poDateOriginal"
              value={form.poDateOriginal}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            />
          </Field>

          <Field label="PO Date - Revised">
            <input
              type="date"
              name="poDateRevised"
              value={form.poDateRevised}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="PO Rev #">
            <input
              name="poRevNumber"
              value={form.poRevNumber}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter PO revision number"
            />
          </Field>

          <Field label="Supplier Name">
            <select
              name="supplierName"
              value={form.supplierName}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
              disabled={loadingVendors}
            >
              <option value="">
                {loadingVendors ? 'Loading suppliers...' : 'Select supplier'}
              </option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.supplier_name}>
                  {vendor.supplier_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Number of Items">
            <input
              type="number"
              min="1"
              value={form.numberOfItems}
              onChange={(e) => handleNumberOfItemsChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter number of items"
              required
            />
          </Field>
        </div>

        {items.length > 0 && (
          <div className="mt-8 space-y-6">
            {items.map((item, index) => (
              <div key={index} className="rounded-xl border border-slate-200 p-6">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">
                  Item {index + 1}
                </h2>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
                  <Field label="Item">
                    <input
                      value={item.item}
                      onChange={(e) =>
                        handleItemChange(index, 'item', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="Enter item"
                      required
                    />
                  </Field>

                  <Field label="Quantity">
                    <input
                      type="number"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, 'quantity', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="Enter quantity"
                      required
                    />
                  </Field>

                  <Field label="Unit">
                    <input
                      value={item.unit}
                      onChange={(e) =>
                        handleItemChange(index, 'unit', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="Enter unit"
                      required
                    />
                  </Field>

                  <Field label="Rate">
                    <input
                      type="number"
                      step="0.01"
                      value={item.rate}
                      onChange={(e) =>
                        handleItemChange(index, 'rate', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="Enter rate"
                      required
                    />
                  </Field>

                  <Field label="Amount">
                    <input
                      value={formatMoney(getItemAmount(item))}
                      readOnly
                      className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Currency">
            <input
              name="currency"
              value={form.currency}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter currency"
              required
            />
          </Field>

          <Field label="PO Amount">
            <input
              value={formatMoney(poAmount)}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <Field label="Exc. Rate">
            <input
              type="number"
              step="0.0001"
              name="exchangeRate"
              value={form.exchangeRate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter exchange rate"
              required
            />
          </Field>

          <Field label="PO Amount - AED">
            <input
              value={formatMoney(poAmountAed)}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <Field label="VAT - AED">
            <input
              type="number"
              step="0.01"
              name="vatAed"
              value={form.vatAed}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter VAT amount in AED"
              required
            />
          </Field>

          <Field label="PO Amount Inc VAT - AED">
            <input
              value={formatMoney(poAmountIncVatAed)}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <Field label="Mode of Payment">
            <select
              name="modeOfPayment"
              value={form.modeOfPayment}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            >
              <option value="">Select mode of payment</option>
              <option value="Cheque">Cheque</option>
              <option value="Cash">Cash</option>
              <option value="Transfer">Transfer</option>
              <option value="Card">Card</option>
            </select>
          </Field>

          <div className="md:col-span-2">
            <Field label="Remarks">
              <textarea
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="Enter remarks"
              />
            </Field>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <button
            type="submit"
            disabled={saving || loadingVendors}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
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
