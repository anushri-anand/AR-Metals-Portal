'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ClientContact,
  ClientData,
  getClientData,
  updateClientData,
} from '@/lib/estimation-storage'

function createEmptyContact(): ClientContact {
  return {
    name: '',
    mobileNumber: '',
    email: '',
  }
}

function getClientContacts(client: ClientData | null) {
  if (!client) {
    return []
  }

  if (client.contacts.length > 0) {
    return client.contacts.map((contact) => ({ ...contact }))
  }

  if (client.contactPerson || client.mobileNumber || client.email) {
    return [
      {
        name: client.contactPerson || '',
        mobileNumber: client.mobileNumber || '',
        email: client.email || '',
      },
    ]
  }

  return [createEmptyContact()]
}

function getContactRowKey(contact: ClientContact, index: number) {
  return contact.id ? `client-contact-${contact.id}-${index}` : `client-contact-new-${index}`
}

export default function ClientDataUpdateClient() {
  const [clients, setClients] = useState<ClientData[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [contacts, setContacts] = useState<ClientContact[]>([])
  const [poBox, setPoBox] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadClients() {
      setLoading(true)
      setError('')

      try {
        const savedClients = await getClientData()
        setClients(savedClients)
        setSelectedClientId('')
        setContacts([])
        setPoBox('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load client data.')
      } finally {
        setLoading(false)
      }
    }

    void loadClients()
  }, [])

  const selectedClient = useMemo(
    () => clients.find((client) => String(client.id) === selectedClientId) || null,
    [clients, selectedClientId]
  )

  const filteredClients = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return clients
    }

    return clients.filter((client) =>
      client.clientName.toLowerCase().includes(normalizedQuery)
    )
  }, [clients, searchQuery])

  const dropdownClients = useMemo(() => {
    if (!selectedClient) {
      return filteredClients
    }

    return filteredClients.some((client) => String(client.id) === selectedClientId)
      ? filteredClients
      : [selectedClient, ...filteredClients]
  }, [filteredClients, selectedClient, selectedClientId])

  function handleClientChange(value: string) {
    setSelectedClientId(value)
    setMessage('')
    setError('')

    const nextClient = clients.find((client) => String(client.id) === value) || null
    setContacts(getClientContacts(nextClient))
    setPoBox(nextClient?.poBox || '')
  }

  function handleContactChange(
    index: number,
    field: keyof ClientContact,
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

    if (!selectedClient) {
      setError('Select a client before updating.')
      return
    }

    setSaving(true)
    setMessage('')
    setError('')

    try {
      const updatedClient = await updateClientData(selectedClient.id, {
        poBox,
        contacts: contacts.filter((contact) =>
          [contact.name, contact.mobileNumber, contact.email].some((value) =>
            String(value || '').trim()
          )
        ),
      })

      setClients((prev) =>
        prev.map((client) =>
          String(client.id) === String(updatedClient.id) ? updatedClient : client
        )
      )
      setContacts(getClientContacts(updatedClient))
      setPoBox(updatedClient.poBox || '')
      setMessage('Client details updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update client data.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Client Data Update</h1>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Search Client Name">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Type client name"
            />
          </Field>

          <Field label="Client Name">
            <select
              value={selectedClientId}
              onChange={(event) => handleClientChange(event.target.value)}
              className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 ${
                selectedClientId ? 'text-black' : 'text-neutral-400'
              }`}
              disabled={loading}
              required
            >
              <option value="">
                {loading ? 'Loading clients...' : 'Select client'}
              </option>
              {dropdownClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.clientName}
                </option>
              ))}
            </select>
          </Field>

          <ReadOnlyField label="Client TRN No." value={selectedClient?.supplierTrnNo} />
          <ReadOnlyField
            label="Customer ID"
            value={selectedClient?.customerId}
            skipIndianFormat
          />
          <EditableField
            label="PO Box"
            value={poBox}
            onChange={setPoBox}
            skipIndianFormat
          />
          <ReadOnlyField label="Country" value={selectedClient?.country} />
          <ReadOnlyField label="City" value={selectedClient?.city} />
          <ReadOnlyField label="Company Tel #" value={selectedClient?.companyTelNumber} />
          <ReadOnlyField label="Remarks" value={selectedClient?.remarks} />
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
                          value={contact.mobileNumber}
                          onChange={(event) =>
                            handleContactChange(index, 'mobileNumber', event.target.value)
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
            disabled={saving || !selectedClient}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? 'Updating...' : 'Update Client'}
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
