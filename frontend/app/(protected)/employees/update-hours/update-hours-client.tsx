'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type PendingWorkEntry = {
  id: number
  employee_name: string
  designation: string
  project_name: string
  item_name: string
  date: string
  hours_worked: number | null
}

export default function UpdateHoursClient() {
  const [entries, setEntries] = useState<PendingWorkEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadEntries() {
    try {
      setLoading(true)
      const data = await fetchAPI('/employees/pending-hours/')
      setEntries(data)
      setError('')
    } catch {
      setError('Failed to load pending entries.')
    } finally {
      setLoading(false)
    }
  }
  

  useEffect(() => {
    loadEntries()
  }, [])

  async function updateHours(id: number, hoursWorked: string) {
    if (!hoursWorked) {
      return
    }
  
    try {
      await fetchAPI(`/employees/pending-hours/${id}/update/`, {
        method: 'PATCH',
        body: JSON.stringify({
          hours_worked: Number(hoursWorked),
        }),
      })
  
      await loadEntries()
    } catch {
      setError('Failed to update hours.')
    }
  }
  
  if (loading) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <p className="text-slate-700">Loading pending work entries...</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
      <h1 className="text-2xl font-bold mb-2 text-slate-900">Update Hours</h1>
      <p className="text-slate-700 mb-6">
        Fill in hours for entries that were saved without hours.
      </p>

      {error && <p className="text-red-700 mb-4">{error}</p>}

      {entries.length === 0 ? (
        <p className="text-slate-700">No pending work entries found.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-300 text-left text-slate-900">
                <th className="py-3 font-semibold">Date</th>
                <th className="py-3 font-semibold">Employee</th>
                <th className="py-3 font-semibold">Project</th>
                <th className="py-3 font-semibold">Item</th>
                <th className="py-3 font-semibold">Hours</th>
                <th className="py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <UpdateHoursRow key={entry.id} entry={entry} onUpdate={updateHours} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function UpdateHoursRow({
  entry,
  onUpdate,
}: {
  entry: PendingWorkEntry
  onUpdate: (id: number, hoursWorked: string) => void
}) {
  const [hoursWorked, setHoursWorked] = useState('')

  return (
    <tr className="border-b border-slate-100">
      <td className="py-3 text-slate-800">{entry.date}</td>
      <td className="py-3 text-slate-800">
        {entry.employee_name} - {entry.designation}
      </td>
      <td className="py-3 text-slate-800">{entry.project_name}</td>
      <td className="py-3 text-slate-800">{entry.item_name}</td>
      <td className="py-3">
        <input
          type="number"
          min="0"
          max="20"
          value={hoursWorked}
          onChange={(e) => setHoursWorked(e.target.value)}
          className="w-24 rounded-lg border border-slate-300 px-3 py-2"
        />
      </td>
      <td className="py-3">
        <button
          onClick={() => onUpdate(entry.id, hoursWorked)}
          className="rounded-lg bg-slate-900 text-white px-4 py-2 hover:bg-slate-800"
        >
          Update
        </button>
      </td>
    </tr>
  )
}
