'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type VendorRecord = {
  id: number
  supplier_name: string
  country: string
  city: string
  contact_person_name: string
  mobile_number: string
  company_telephone: string
  product_details: string
  review: string
}

export default function VendorDataViewClient() {
  const [vendors, setVendors] = useState<VendorRecord[]>([])
  const [selectedSupplier, setSelectedSupplier] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadVendors() {
      try {
        const data = await fetchAPI('/procurement/vendor-data/')
        setVendors(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load vendor data.'
        )
      } finally {
        setLoading(false)
      }
    }

    void loadVendors()
  }, [])

  const visibleVendors = useMemo(
    () =>
      selectedSupplier
        ? vendors.filter((vendor) => vendor.supplier_name === selectedSupplier)
        : vendors,
    [selectedSupplier, vendors]
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Vendor Data View</h1>
        <p className="mt-2 text-slate-700">
          Review all saved vendor details, or pick a supplier name to narrow the table.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Field label="Supplier Name">
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            disabled={loading}
          >
            <option value="">
              {loading ? 'Loading vendors...' : 'All suppliers'}
            </option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.supplier_name}>
                {vendor.supplier_name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Vendor Details</h2>
        </div>
        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-[1080px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
              <tr>
                <HeaderCell>Name of Supplier</HeaderCell>
                <HeaderCell>Country</HeaderCell>
                <HeaderCell>City</HeaderCell>
                <HeaderCell>Name of Contact Person</HeaderCell>
                <HeaderCell>Mobile #</HeaderCell>
                <HeaderCell>Company Tel #</HeaderCell>
                <HeaderCell>Product Details</HeaderCell>
                <HeaderCell>Review</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {visibleVendors.length > 0 ? (
                visibleVendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-slate-200">
                    <BodyCell>{vendor.supplier_name}</BodyCell>
                    <BodyCell>{vendor.country}</BodyCell>
                    <BodyCell>{vendor.city}</BodyCell>
                    <BodyCell>{vendor.contact_person_name}</BodyCell>
                    <BodyCell>{vendor.mobile_number || '-'}</BodyCell>
                    <BodyCell>{vendor.company_telephone || '-'}</BodyCell>
                    <BodyCell>{vendor.product_details || '-'}</BodyCell>
                    <BodyCell>{vendor.review || '-'}</BodyCell>
                  </tr>
                ))
              ) : (
                <tr>
                  <BodyCell colSpan={8}>
                    {loading
                      ? 'Loading vendor details...'
                      : 'No vendor details found for the selected supplier.'}
                  </BodyCell>
                </tr>
              )}
            </tbody>
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
