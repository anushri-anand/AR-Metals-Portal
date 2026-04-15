'use client'

import { useEffect, useState } from 'react'
import { ClientData, getClientData } from '@/lib/estimation-storage'

export default function ClientDataViewClient() {
  const [clients, setClients] = useState<ClientData[]>([])
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Client Data View</h1>
        <p className="mt-2 text-slate-700">View saved client information.</p>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[70vh] w-full max-w-full overflow-auto">
          <table className="min-w-[1200px] divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Client Name</th>
                <th className="px-4 py-3 font-semibold">Supplier TRN No.</th>
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
              {clients.map((client) => (
                <tr key={client.id}>
                  <td className="px-4 py-3 text-slate-900">{client.clientName}</td>
                  <td className="px-4 py-3 text-slate-700">{client.supplierTrnNo || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{client.country || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{client.city || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{client.contactPerson || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{client.mobileNumber || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{client.companyTelNumber || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{client.email || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{client.remarks || '-'}</td>
                </tr>
              ))}

              {clients.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={9}>
                    No clients saved yet.
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
