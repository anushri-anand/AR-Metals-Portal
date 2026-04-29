'use client'

import { useEffect, useState } from 'react'
import { findNextDocumentNumber } from '@/lib/document-numbering'
import { createVendorData, getVendorData } from '@/lib/vendor-data'

type FormState = {
  supplierName: string
  vendorId: string
  trnNo: string
  poBox: string
  country: string
  city: string
  contactPersonName: string
  mobileNumber: string
  email: string
  companyTelephone: string
  productDetails: string
  review: string
}

const initialForm: FormState = {
  supplierName: '',
  vendorId: '',
  trnNo: '',
  poBox: '',
  country: '',
  city: '',
  contactPersonName: '',
  mobileNumber: '',
  email: '',
  companyTelephone: '',
  productDetails: '',
  review: '',
}

export default function VendorDataEntryForm() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadDefaultVendorId() {
      try {
        const vendors = await getVendorData()
        const nextVendorId = findNextDocumentNumber(
          vendors.map((vendor) => vendor.vendor_id),
          'V'
        )

        setForm((prev) => ({
          ...prev,
          vendorId: prev.vendorId || nextVendorId,
        }))
      } catch {
        // Keep the form usable even if the default ID cannot be preloaded.
      }
    }

    loadDefaultVendorId()
  }, [])

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
      const createdVendor = await createVendorData({
        supplier_name: form.supplierName,
        vendor_id: form.vendorId,
        trn_no: form.trnNo,
        po_box: form.poBox,
        country: form.country,
        city: form.city,
        contact_person_name: form.contactPersonName,
        mobile_number: form.mobileNumber,
        email: form.email,
        company_telephone: form.companyTelephone,
        product_details: form.productDetails,
        review: form.review,
        contacts:
          form.contactPersonName || form.mobileNumber || form.email
            ? [
                {
                  name: form.contactPersonName,
                  mobile_number: form.mobileNumber,
                  email: form.email,
                },
              ]
            : [],
      })

      const vendors = await getVendorData()
      const nextVendorId = findNextDocumentNumber(
        [...vendors.map((vendor) => vendor.vendor_id), createdVendor.vendor_id],
        'V'
      )

      setForm({
        ...initialForm,
        vendorId: nextVendorId,
      })
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

          <Field label="Vendor ID">
            <input
              type="text"
              name="vendorId"
              value={form.vendorId}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter vendor ID"
              required
            />
          </Field>

          <Field label="TRN No.">
            <input
              type="text"
              inputMode="numeric"
              data-skip-indian-format="true"
              name="trnNo"
              value={form.trnNo}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter TRN number"
            />
          </Field>

          <Field label="PO Box">
            <input
              type="text"
              inputMode="numeric"
              data-skip-indian-format="true"
              name="poBox"
              value={form.poBox}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter PO Box"
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

          <Field label="Email">
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter email"
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
