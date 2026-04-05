'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import AnalyticsBarChart from '@/components/analytics-bar-chart'

type ProjectItem = {
  id: number
  project_name: string
  item_name: string
}

type AnalyticsResponse = {
  project_name?: string
  item_name?: string
  total_quantity?: number | null
  estimated_mh?: number | null
  actual_total_mh?: number
  totals?: Record<string, number>
  message?: string
  results?: null
}

export default function AnalyticsClient() {
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([])
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [projectName, setProjectName] = useState('')
  const [itemName, setItemName] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const projectNames = [...new Set(projectItems.map((item) => item.project_name))]

  const filteredItems = projectName
    ? projectItems.filter((item) => item.project_name === projectName)
    : []

  const chartData =
    data?.totals
      ? Object.entries(data.totals).map(([label, value]) => ({
          name: label,
          value,
        }))
      : []


  useEffect(() => {
    async function loadProjectItems() {
      try {
        const items = await fetchAPI('/master-data/project-items/')
        setProjectItems(items)
      } catch {
        setError('Failed to load project items.')
      }
    }

    loadProjectItems()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()

      if (projectName) params.append('project_name', projectName)
      if (itemName) params.append('item_name', itemName)
      if (fromDate) params.append('from_date', fromDate)
      if (toDate) params.append('to_date', toDate)

      const result = await fetchAPI(`/reports/analytics/?${params.toString()}`)
      setData(result)
    } catch {
      setError('Failed to load analytics.')
    } finally {
      setLoading(false)
    }
  }

  function handleProjectChange(value: string) {
    setProjectName(value)
    setItemName('')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold mb-2 text-slate-900">Analytics</h1>
        <p className="text-slate-700">
          View analytics for a selected project item.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Project</label>
            <select
              value={projectName}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
              required
            >
              <option value="">Select project</option>
              {projectNames.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Item</label>
            <select
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
              disabled={!projectName}
            >

              <option value="">Select item</option>
              {[...new Set(filteredItems.map((item) => item.item_name))].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

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

          <div className="md:col-span-2 xl:col-span-4">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 text-white px-4 py-2 hover:bg-slate-800"
            >
              Load Analytics
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {loading && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <p className="text-slate-700">Loading analytics...</p>
        </div>
      )}

      {data && !loading && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 space-y-6">
          {data.message && <p className="text-slate-700">{data.message}</p>}

          {!data.message && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SummaryCard label="Total Quantity" value={data.total_quantity ?? 0} />
                <SummaryCard label="Estimated MH" value={data.estimated_mh ?? 0} />
                <SummaryCard label="Actual Total MH" value={data.actual_total_mh ?? 0} />
              </div>

              <div>
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Stage Totals</h2>

                {!data.totals || Object.keys(data.totals).length === 0 ? (
                  <p className="text-slate-700">No analytics totals found.</p>
                ) : (
                  <>
                    <AnalyticsBarChart data={chartData} maxValue={data.total_quantity} />

                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mt-6">
                      {Object.entries(data.totals).map(([label, value]) => (
                        <SummaryCard key={label} label={label} value={value} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}
