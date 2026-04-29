'use client'

import { useEffect, useMemo, useState } from 'react'
import { VendorData, getVendorData } from '@/lib/vendor-data'

function getContactKey(
  contact: { id?: string | number | null },
  index: number,
  field: string
) {
  return contact.id
    ? `vendor-contact-${field}-${contact.id}-${index}`
    : `vendor-contact-${field}-new-${index}`
}

export default function VendorDataViewClient() {
  const [vendors, setVendors] = useState<VendorData[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadVendors() {
      try {
        setVendors(await getVendorData())
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
    () => {
      const normalizedQuery = searchQuery.trim().toLowerCase()

      if (!normalizedQuery) {
        return vendors
      }

      return vendors.filter((vendor) =>
        vendor.supplier_name.toLowerCase().includes(normalizedQuery)
      )
    },
    [searchQuery, vendors]
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Vendor Data View</h1>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <Field label="Search Supplier Name">
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            placeholder="Type supplier name"
            disabled={loading}
          />
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
                <HeaderCell>Vendor ID</HeaderCell>
                <HeaderCell>TRN No.</HeaderCell>
                <HeaderCell>PO Box</HeaderCell>
                <HeaderCell>Country</HeaderCell>
                <HeaderCell>City</HeaderCell>
                <HeaderCell>Name of Contact Person</HeaderCell>
                <HeaderCell>Mobile #</HeaderCell>
                <HeaderCell>Company Tel #</HeaderCell>
                <HeaderCell>Email</HeaderCell>
                <HeaderCell>Product Details</HeaderCell>
                <HeaderCell>Review</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {visibleVendors.length > 0 ? (
                visibleVendors.map((vendor) => (
                  <tr key={vendor.id} className="border-b border-slate-200">
                    <BodyCell>{vendor.supplier_name}</BodyCell>
                    <BodyCell>{vendor.vendor_id || '-'}</BodyCell>
                    <BodyCell>{vendor.trn_no || '-'}</BodyCell>
                    <BodyCell>{vendor.po_box || '-'}</BodyCell>
                    <BodyCell>{vendor.country}</BodyCell>
                    <BodyCell>{vendor.city}</BodyCell>
                    <BodyCell>
                      {vendor.contacts.length > 0 ? (
                        <div className="space-y-1">
                          {vendor.contacts.map((contact, index) => (
                            <div key={getContactKey(contact, index, 'name')}>
                              {contact.name || '-'}
                            </div>
                          ))}
                        </div>
                      ) : (
                        vendor.contact_person_name || '-'
                      )}
                    </BodyCell>
                    <BodyCell>
                      {vendor.contacts.length > 0 ? (
                        <div className="space-y-1">
                          {vendor.contacts.map((contact, index) => (
                            <div key={getContactKey(contact, index, 'mobile')}>
                              {contact.mobile_number || '-'}
                            </div>
                          ))}
                        </div>
                      ) : (
                        vendor.mobile_number || '-'
                      )}
                    </BodyCell>
                    <BodyCell>{vendor.company_telephone || '-'}</BodyCell>
                    <BodyCell>
                      {vendor.contacts.length > 0 ? (
                        <div className="space-y-1">
                          {vendor.contacts.map((contact, index) => (
                            <div key={getContactKey(contact, index, 'email')}>
                              {contact.email || '-'}
                            </div>
                          ))}
                        </div>
                      ) : (
                        vendor.email || '-'
                      )}
                    </BodyCell>
                    <BodyCell>{vendor.product_details || '-'}</BodyCell>
                    <BodyCell>{vendor.review || '-'}</BodyCell>
                  </tr>
                ))
              ) : (
                <tr>
                  <BodyCell colSpan={12}>
                    {loading
                      ? 'Loading vendor details...'
                      : vendors.length === 0
                        ? 'No vendor details saved yet.'
                        : 'No vendor details found for this search.'}
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
