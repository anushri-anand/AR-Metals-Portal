'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type AllocationRow = {
  employee_name: string
  percentages: Record<string, string>
}

type MHCostAllocationResponse = {
  projects: string[]
  allocation_rows: AllocationRow[]
}

export default function MHCostAllocationClient() {
  const [data, setData] = useState<MHCostAllocationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  async function loadData() {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams()

      if (fromDate) params.append('from_date', fromDate)
      if (toDate) params.append('to_date', toDate)

      const result = await fetchAPI(
        `/reports/mh-cost-allocation/?${params.toString()}`
      )

      setData(result)
    } catch {
      setError('Failed to load MH cost allocation.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    loadData()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold mb-2 text-slate-900">MH Cost Allocation</h1>
        <p className="text-slate-700">
          View employee-wise man-hour cost allocation across projects.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 text-white px-4 py-2 hover:bg-slate-800"
            >
              Apply Filter
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        {error && <p className="text-red-700 mb-4">{error}</p>}

        {loading ? (
          <p className="text-slate-700">Loading MH cost allocation...</p>
        ) : !data || data.allocation_rows.length === 0 ? (
          <p className="text-slate-700">No allocation data found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-left text-slate-900">
                  <th className="py-3 font-semibold">Employee</th>
                  {data.projects.map((project) => (
                    <th key={project} className="py-3 font-semibold">
                      {project}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.allocation_rows.map((row) => (
                  <tr key={row.employee_name} className="border-b border-slate-100">
                    <td className="py-3 text-slate-800 font-medium">{row.employee_name}</td>
                    {data.projects.map((project) => (
                      <td key={project} className="py-3 text-slate-800">
                        {row.percentages[project] || '0.00%'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
