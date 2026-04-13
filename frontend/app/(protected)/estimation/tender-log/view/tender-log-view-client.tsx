'use client'

import { useEffect, useState } from 'react'
import { TenderLog, getTenderLogs } from '@/lib/estimation-storage'

export default function TenderLogViewClient() {
  const [tenders, setTenders] = useState<TenderLog[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadTenders() {
      try {
        setTenders(await getTenderLogs())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tenders.')
      }
    }

    loadTenders()
  }, [])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Tender Log View</h1>
        <p className="mt-2 text-slate-700">View saved tender logs.</p>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="max-h-[70vh] w-full max-w-full overflow-auto">
          <table className="min-w-[1200px] divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Tender Number</th>
                <th className="px-4 py-3 font-semibold">Tender Name</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Project Name</th>
                <th className="px-4 py-3 font-semibold">Tender Date</th>
                <th className="px-4 py-3 font-semibold">Submission Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tenders.map((tender) => (
                <tr key={tender.id}>
                  <td className="px-4 py-3 text-slate-900">{tender.tenderNumber}</td>
                  <td className="px-4 py-3 text-slate-700">{tender.tenderName || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{tender.clientName || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{tender.projectName || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{formatDate(tender.tenderDate)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatDate(tender.submissionDate)}</td>
                  <td className="px-4 py-3 text-slate-700">{tender.status || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{tender.remarks || '-'}</td>
                </tr>
              ))}

              {tenders.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={8}>
                    No tender logs saved yet.
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

function formatDate(value: string | null) {
  if (!value) return '-'

  return new Date(`${value}T00:00:00`).toLocaleDateString()
}
