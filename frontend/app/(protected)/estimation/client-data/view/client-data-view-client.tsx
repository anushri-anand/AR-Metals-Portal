'use client'

import { useEffect, useMemo, useState } from 'react'
import { ClientData, getClientData } from '@/lib/estimation-storage'

function getContactKey(
  contact: { id?: string | number | null },
  index: number,
  field: string
) {
  return contact.id
    ? `client-contact-${field}-${contact.id}-${index}`
    : `client-contact-${field}-new-${index}`
}

export default function ClientDataViewClient() {
  const [clients, setClients] = useState<ClientData[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadClients() {
      try {
        setClients(await getClientData())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load clients.')
      }
    }

    loadClients()
  }, [])

  const filteredClients = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return clients
    }

    return clients.filter((client) =>
      client.clientName.toLowerCase().includes(normalizedQuery)
    )
  }, [clients, searchQuery])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Client Data View</h1>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="mb-2 block text-sm font-medium text-slate-800">
          Search Client Name
        </label>
        <input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
          placeholder="Type client name"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[70vh] w-full max-w-full overflow-auto">
          <table className="min-w-[1200px] divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Client Name</th>
                <th className="px-4 py-3 font-semibold">Customer ID</th>
                <th className="px-4 py-3 font-semibold">Client TRN No.</th>
                <th className="px-4 py-3 font-semibold">PO Box</th>
                <th className="px-4 py-3 font-semibold">Country</th>
                <th className="px-4 py-3 font-semibold">City</th>
                <th className="px-4 py-3 font-semibold">Contact Person</th>
                <th className="px-4 py-3 font-semibold">Mobile #</th>
                <th className="px-4 py-3 font-semibold">Company Tel #</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map((client) => (
                <tr key={client.id}>
                  <td className="px-4 py-3 text-slate-900">{client.clientName}</td>
                  <td className="px-4 py-3 text-slate-700">{client.customerId || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{client.supplierTrnNo || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{client.poBox || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{client.country || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{client.city || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {client.contacts.length > 0 ? (
                      <div className="space-y-1">
                        {client.contacts.map((contact, index) => (
                          <div key={getContactKey(contact, index, 'name')}>
                            {contact.name || '-'}
                          </div>
                        ))}
                      </div>
                    ) : (
                      client.contactPerson || '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {client.contacts.length > 0 ? (
                      <div className="space-y-1">
                        {client.contacts.map((contact, index) => (
                          <div key={getContactKey(contact, index, 'mobile')}>
                            {contact.mobileNumber || '-'}
                          </div>
                        ))}
                      </div>
                    ) : (
                      client.mobileNumber || '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{client.companyTelNumber || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {client.contacts.length > 0 ? (
                      <div className="space-y-1">
                        {client.contacts.map((contact, index) => (
                          <div key={getContactKey(contact, index, 'email')}>
                            {contact.email || '-'}
                          </div>
                        ))}
                      </div>
                    ) : (
                      client.email || '-'
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{client.remarks || '-'}</td>
                </tr>
              ))}

              {filteredClients.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={11}>
                    {clients.length === 0
                      ? 'No clients saved yet.'
                      : 'No clients match this search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
