'use client'

import { useState } from 'react'
import { createClientData } from '@/lib/estimation-storage'

const initialForm = {
  clientName: '',
  supplierTrnNo: '',
  country: '',
  city: '',
  contactPerson: '',
  mobileNumber: '',
  companyTelNumber: '',
  email: '',
  remarks: '',
}

export default function ClientDataEntryClient() {
  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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
    setError('')
    setMessage('')

    try {
      await createClientData({
        clientName: form.clientName.trim(),
        supplierTrnNo: form.supplierTrnNo.trim(),
        country: form.country.trim(),
        city: form.city.trim(),
        contactPerson: form.contactPerson.trim(),
        mobileNumber: form.mobileNumber.trim(),
        companyTelNumber: form.companyTelNumber.trim(),
        email: form.email.trim(),
        remarks: form.remarks.trim(),
      })

      setForm(initialForm)
      setMessage('Client data saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save client data.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Client Data Entry</h1>
        <p className="mt-2 text-slate-700">
          Save client information for tender tracking.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Client Name">
            <input
              name="clientName"
              value={form.clientName}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter client name"
              required
            />
          </Field>

          <Field label="Supplier TRN No.">
            <input
              name="supplierTrnNo"
              value={form.supplierTrnNo}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter supplier TRN number"
            />
          </Field>

          <Field label="Country">
            <input
              name="country"
              value={form.country}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter country"
            />
          </Field>

          <Field label="City">
            <input
              name="city"
              value={form.city}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter city"
            />
          </Field>

          <Field label="Contact Person">
            <input
              name="contactPerson"
              value={form.contactPerson}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter contact person"
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
              name="companyTelNumber"
              value={form.companyTelNumber}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter company telephone"
            />
          </Field>

          <Field label="Email">
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter email"
            />
          </Field>
        </div>

        <div className="mt-6">
          <Field label="Remarks">
            <textarea
              name="remarks"
              value={form.remarks}
              onChange={handleChange}
              className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter remarks"
            />
          </Field>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            Save Client
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
