'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  VendorContact,
  VendorData,
  getVendorData,
  updateVendorData,
} from '@/lib/vendor-data'

function createEmptyContact(): VendorContact {
  return {
    name: '',
    mobile_number: '',
    email: '',
  }
}

function getVendorContacts(vendor: VendorData | null) {
  if (!vendor) {
    return []
  }

  if (vendor.contacts.length > 0) {
    return vendor.contacts.map((contact) => ({ ...contact }))
  }

  if (vendor.contact_person_name || vendor.mobile_number || vendor.email) {
    return [
      {
        name: vendor.contact_person_name || '',
        mobile_number: vendor.mobile_number || '',
        email: vendor.email || '',
      },
    ]
  }

  return [createEmptyContact()]
}

function getContactRowKey(contact: VendorContact, index: number) {
  return contact.id ? `vendor-contact-${contact.id}-${index}` : `vendor-contact-new-${index}`
}

export default function VendorDataUpdateClient() {
  const [vendors, setVendors] = useState<VendorData[]>([])
  const [selectedVendorId, setSelectedVendorId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [contacts, setContacts] = useState<VendorContact[]>([])
  const [trnNo, setTrnNo] = useState('')
  const [poBox, setPoBox] = useState('')
  const [productDetails, setProductDetails] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadVendors() {
      setLoading(true)
      setError('')

      try {
        const savedVendors = await getVendorData()
        setVendors(savedVendors)

        setSelectedVendorId('')
        setContacts([])
        setTrnNo('')
        setPoBox('')
        setProductDetails('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load vendor data.')
      } finally {
        setLoading(false)
      }
    }

    void loadVendors()
  }, [])

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => String(vendor.id) === selectedVendorId) || null,
    [vendors, selectedVendorId]
  )

  const filteredVendors = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return vendors
    }

    return vendors.filter((vendor) =>
      vendor.supplier_name.toLowerCase().includes(normalizedQuery)
    )
  }, [searchQuery, vendors])

  const dropdownVendors = useMemo(() => {
    if (!selectedVendor) {
      return filteredVendors
    }

    return filteredVendors.some((vendor) => String(vendor.id) === selectedVendorId)
      ? filteredVendors
      : [selectedVendor, ...filteredVendors]
  }, [filteredVendors, selectedVendor, selectedVendorId])

  function handleVendorChange(value: string) {
    setSelectedVendorId(value)
    setMessage('')
    setError('')

    const nextVendor = vendors.find((vendor) => String(vendor.id) === value) || null
    setContacts(getVendorContacts(nextVendor))
    setTrnNo(nextVendor?.trn_no || '')
    setPoBox(nextVendor?.po_box || '')
    setProductDetails(nextVendor?.product_details || '')
  }

  function handleContactChange(
    index: number,
    field: keyof VendorContact,
    value: string
  ) {
    setContacts((prev) =>
      prev.map((contact, contactIndex) =>
        contactIndex === index
          ? {
              ...contact,
              [field]: value,
            }
          : contact
      )
    )
  }

  function handleAddContact() {
    setContacts((prev) => [...prev, createEmptyContact()])
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!selectedVendor) {
      setError('Select a supplier before updating.')
      return
    }

    setSaving(true)
    setMessage('')
    setError('')

    try {
      const updatedVendor = await updateVendorData(selectedVendor.id, {
        trn_no: trnNo,
        po_box: poBox,
        product_details: productDetails,
        contacts: contacts.filter((contact) =>
          [contact.name, contact.mobile_number, contact.email].some((value) =>
            String(value || '').trim()
          )
        ),
      })

      setVendors((prev) =>
        prev.map((vendor) =>
          String(vendor.id) === String(updatedVendor.id) ? updatedVendor : vendor
        )
      )
      setContacts(getVendorContacts(updatedVendor))
      setTrnNo(updatedVendor.trn_no || '')
      setPoBox(updatedVendor.po_box || '')
      setProductDetails(updatedVendor.product_details || '')
      setMessage('Vendor details updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vendor data.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Vendor Data Update</h1>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Search Supplier Name">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Type supplier name"
            />
          </Field>

          <Field label="Supplier Name">
            <select
              value={selectedVendorId}
              onChange={(event) => handleVendorChange(event.target.value)}
              className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 ${
                selectedVendorId ? 'text-black' : 'text-neutral-400'
              }`}
              disabled={loading}
              required
            >
              <option value="">
                {loading ? 'Loading suppliers...' : 'Select supplier'}
              </option>
              {dropdownVendors.map((vendor) => (
                <option key={vendor.id} value={vendor.id}>
                  {vendor.supplier_name}
                </option>
              ))}
            </select>
          </Field>

          <ReadOnlyField label="Country" value={selectedVendor?.country} />
          <ReadOnlyField label="City" value={selectedVendor?.city} />
          <ReadOnlyField
            label="Vendor ID"
            value={selectedVendor?.vendor_id}
            skipIndianFormat
          />
          <EditableField
            label="TRN No."
            value={trnNo}
            onChange={setTrnNo}
            skipIndianFormat
          />
          <EditableField
            label="PO Box"
            value={poBox}
            onChange={setPoBox}
            skipIndianFormat
          />
          <ReadOnlyField
            label="Company Tel #"
            value={selectedVendor?.company_telephone}
          />
          <ReadOnlyField label="Review" value={selectedVendor?.review} />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-800">
            Product Details
          </label>
          <textarea
            value={productDetails}
            onChange={(event) => setProductDetails(event.target.value)}
            rows={4}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            placeholder="Enter product details"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
            <h2 className="text-lg font-semibold text-slate-900">Contact People</h2>
          </div>

          <div className="max-h-[50vh] overflow-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
                <tr>
                  <HeaderCell>Contact Person</HeaderCell>
                  <HeaderCell>Mobile #</HeaderCell>
                  <HeaderCell>Email</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {contacts.length > 0 ? (
                  contacts.map((contact, index) => (
                    <tr
                      key={getContactRowKey(contact, index)}
                      className="border-b border-slate-200"
                    >
                      <BodyCell>
                        <input
                          value={contact.name}
                          onChange={(event) =>
                            handleContactChange(index, 'name', event.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          placeholder="Enter contact person"
                        />
                      </BodyCell>
                      <BodyCell>
                        <input
                          value={contact.mobile_number}
                          onChange={(event) =>
                            handleContactChange(index, 'mobile_number', event.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          placeholder="Enter mobile number"
                        />
                      </BodyCell>
                      <BodyCell>
                        <input
                          type="email"
                          value={contact.email}
                          onChange={(event) =>
                            handleContactChange(index, 'email', event.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          placeholder="Enter email"
                        />
                      </BodyCell>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <BodyCell colSpan={3}>No contact people added yet.</BodyCell>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleAddContact}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Add Contact Person
          </button>
          <button
            type="submit"
            disabled={saving || !selectedVendor}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? 'Updating...' : 'Update Vendor'}
          </button>
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
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
      <label className="mb-1 block text-sm font-medium text-slate-800">{label}</label>
      {children}
    </div>
  )
}

function ReadOnlyField({
  label,
  value,
  skipIndianFormat = false,
}: {
  label: string
  value?: string | null
  skipIndianFormat?: boolean
}) {
  return (
    <Field label={label}>
      <input
        value={value || ''}
        readOnly
        type="text"
        inputMode={skipIndianFormat ? 'numeric' : undefined}
        data-skip-indian-format={skipIndianFormat ? 'true' : undefined}
        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
      />
    </Field>
  )
}

function EditableField({
  label,
  value,
  onChange,
  skipIndianFormat = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  skipIndianFormat?: boolean
}) {
  return (
    <Field label={label}>
      <input
        type="text"
        inputMode={skipIndianFormat ? 'numeric' : undefined}
        data-skip-indian-format={skipIndianFormat ? 'true' : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
      />
    </Field>
  )
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return <th className="border border-slate-200 px-4 py-3 font-semibold">{children}</th>
}

function BodyCell({
  children,
  colSpan,
}: {
  children: React.ReactNode
  colSpan?: number
}) {
  return (
    <td className="border border-slate-200 px-4 py-3" colSpan={colSpan}>
      {children}
    </td>
  )
}
