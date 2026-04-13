'use client'

import { useState } from 'react'
import { fetchAPI } from '@/lib/api'

type FormState = {
  supplierName: string
  country: string
  city: string
  contactPersonName: string
  mobileNumber: string
  companyTelephone: string
  productDetails: string
  review: string
}

const initialForm: FormState = {
  supplierName: '',
  country: '',
  city: '',
  contactPersonName: '',
  mobileNumber: '',
  companyTelephone: '',
  productDetails: '',
  review: '',
}

export default function VendorDataEntryForm() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
    setLoading(true)

    try {
      await fetchAPI('/procurement/vendor-data/entry/', {
        method: 'POST',
        body: JSON.stringify({
          supplier_name: form.supplierName,
          country: form.country,
          city: form.city,
          contact_person_name: form.contactPersonName,
          mobile_number: form.mobileNumber,
          company_telephone: form.companyTelephone,
          product_details: form.productDetails,
          review: form.review,
        }),
      })

      setForm(initialForm)
      setMessage('Vendor data saved successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vendor data.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Vendor Data Entry</h1>
        <p className="mt-2 text-slate-700">
          Enter supplier and contact information for procurement records.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Name of Supplier">
            <input
              name="supplierName"
              value={form.supplierName}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter supplier name"
              required
            />
          </Field>

          <Field label="Country">
            <input
              name="country"
              value={form.country}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter country"
              required
            />
          </Field>

          <Field label="City">
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter city"
              required
            />
          </Field>

          <Field label="Name of Contact Person">
            <input
              name="contactPersonName"
              value={form.contactPersonName}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter contact person name"
              required
            />
          </Field>

          <Field label="Mobile #">
            <input
              name="mobileNumber"
              value={form.mobileNumber}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter mobile number"
            />
          </Field>

          <Field label="Company Tel #">
            <input
              name="companyTelephone"
              value={form.companyTelephone}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter company telephone number"
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Product Details">
              <textarea
                name="productDetails"
                value={form.productDetails}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="Enter product details"
              />
            </Field>
          </div>

          <div className="md:col-span-2">
            <Field label="Review">
              <textarea
                name="review"
                value={form.review}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="Enter review"
              />
            </Field>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Save'}
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
