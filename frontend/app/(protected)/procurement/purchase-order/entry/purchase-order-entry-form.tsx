'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type VendorOption = {
  id: number
  supplier_name: string
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
  itemDescription: string
  currency: string
  poAmount: string
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
  itemDescription: '',
  currency: '',
  poAmount: '',
  exchangeRate: '',
  vatAed: '',
  modeOfPayment: '',
  remarks: '',
}

export default function PurchaseOrderEntryForm() {
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loadingVendors, setLoadingVendors] = useState(true)
  const [saving, setSaving] = useState(false)

  const poAmountAed = useMemo(() => {
    const poAmount = Number(form.poAmount || 0)
    const exchangeRate = Number(form.exchangeRate || 0)
    return poAmount * exchangeRate
  }, [form.poAmount, form.exchangeRate])

  const poAmountIncVatAed = useMemo(() => {
    const vatAed = Number(form.vatAed || 0)
    return poAmountAed + vatAed
  }, [poAmountAed, form.vatAed])

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

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
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
          item_description: form.itemDescription,
          currency: form.currency,
          po_amount: form.poAmount,
          exchange_rate: form.exchangeRate,
          vat_aed: form.vatAed,
          mode_of_payment: form.modeOfPayment,
          remarks: form.remarks,
        }),
      })

      setForm(initialForm)
      setMessage('Purchase order saved successfully.')
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
          Purchase Order Entry
        </h1>
        <p className="mt-2 text-slate-700">
          Enter purchase order details for procurement tracking.
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

          <Field label="Item Description">
            <input
              name="itemDescription"
              value={form.itemDescription}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter item description"
              required
            />
          </Field>

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
              type="number"
              step="0.01"
              name="poAmount"
              value={form.poAmount}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter PO amount"
              required
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
              value={poAmountAed.toFixed(2)}
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
              value={poAmountIncVatAed.toFixed(2)}
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
