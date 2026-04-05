'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type ProjectItem = {
  id: number
  project_name: string
  item_name: string
}

type ProductionStatusRow = {
  project_name: string
  item_name: string
  quantity: number | null
  unit: string | null
  cutting: number
  grooving: number
  bending: number
  fabrication: number
  welding: number
  finishing: number
  coating: number
  assembly: number
  delivery_total: number
  installation: number
}

type ProductionStatusResponse = {
  count: number
  totals: {
    cutting: number
    grooving: number
    bending: number
    fabrication: number
    welding: number
    finishing: number
    coating: number
    assembly: number
    delivery: number
    installation: number
  }
  results: ProductionStatusRow[]
}

export default function ProductionStatusClient() {
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([])
  const [rows, setRows] = useState<ProductionStatusRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [projectName, setProjectName] = useState('')
  const [itemName, setItemName] = useState('')

  const [totals, setTotals] = useState({
    cutting: 0,
    grooving: 0,
    bending: 0,
    fabrication: 0,
    welding: 0,
    finishing: 0,
    coating: 0,
    assembly: 0,
    delivery: 0,
    installation: 0,
  })

  const projectNames = [...new Set(projectItems.map((item) => item.project_name))]

  const filteredItems = projectName
    ? projectItems.filter((item) => item.project_name === projectName)
    : []

  async function loadFilterData() {
    try {
      const data = await fetchAPI('/master-data/project-items/')
      setProjectItems(data)
    } catch {
      setError('Failed to load filter data.')
    }
  }

  async function loadProductionStatus() {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams()

      if (fromDate) params.append('from_date', fromDate)
      if (toDate) params.append('to_date', toDate)
      if (projectName) params.append('project_name', projectName)
      if (itemName) params.append('item_name', itemName)

      const data: ProductionStatusResponse = await fetchAPI(
        `/production/status/?${params.toString()}`
      )

      setRows(data.results)
      setTotals(data.totals)
    } catch {
      setError('Failed to load production status.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFilterData()
  }, [])

  useEffect(() => {
    loadProductionStatus()
  }, [])

  function handleApplyFilters(e: React.FormEvent) {
    e.preventDefault()
    loadProductionStatus()
  }

  function handleProjectChange(value: string) {
    setProjectName(value)
    setItemName('')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold mb-2 text-slate-900">View Production Status</h1>
        <p className="text-slate-700">
          View production stage totals and delivery totals with filters.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <form onSubmit={handleApplyFilters} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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

          <div>
            <label className="block text-sm font-medium text-slate-800 mb-1">Project</label>
            <select
              value={projectName}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">All projects</option>
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
              disabled={!projectName}
            >

              <option value="">All items</option>
              {[...new Set(filteredItems.map((item) => item.item_name))].map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2 xl:col-span-4">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 text-white px-4 py-2 hover:bg-slate-800"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Totals</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
          <SummaryCard label="Cutting" value={totals.cutting} />
          <SummaryCard label="Grooving" value={totals.grooving} />
          <SummaryCard label="Bending" value={totals.bending} />
          <SummaryCard label="Fabrication" value={totals.fabrication} />
          <SummaryCard label="Welding" value={totals.welding} />
          <SummaryCard label="Finishing" value={totals.finishing} />
          <SummaryCard label="Coating" value={totals.coating} />
          <SummaryCard label="Assembly" value={totals.assembly} />
          <SummaryCard label="Delivery" value={totals.delivery} />
          <SummaryCard label="Installation" value={totals.installation} />
        </div>

        {error && <p className="text-red-700 mb-4">{error}</p>}

        {loading ? (
          <p className="text-slate-700">Loading production status...</p>
        ) : rows.length === 0 ? (
          <p className="text-slate-700">No production records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-left text-slate-900">
                  <th className="py-3 font-semibold">Project</th>
                  <th className="py-3 font-semibold">Item</th>
                  <th className="py-3 font-semibold">Qty</th>
                  <th className="py-3 font-semibold">Unit</th>
                  <th className="py-3 font-semibold">Cutting</th>
                  <th className="py-3 font-semibold">Grooving</th>
                  <th className="py-3 font-semibold">Bending</th>
                  <th className="py-3 font-semibold">Fabrication</th>
                  <th className="py-3 font-semibold">Welding</th>
                  <th className="py-3 font-semibold">Finishing</th>
                  <th className="py-3 font-semibold">Coating</th>
                  <th className="py-3 font-semibold">Assembly</th>
                  <th className="py-3 font-semibold">Delivery</th>
                  <th className="py-3 font-semibold">Installation</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={`${row.project_name}-${row.item_name}-${index}`} className="border-b border-slate-100">
                    <td className="py-3 text-slate-800">{row.project_name}</td>
                    <td className="py-3 text-slate-800">{row.item_name}</td>
                    <td className="py-3 text-slate-800">{row.quantity ?? '-'}</td>
                    <td className="py-3 text-slate-800">{row.unit ?? '-'}</td>
                    <td className="py-3 text-slate-800">{row.cutting}</td>
                    <td className="py-3 text-slate-800">{row.grooving}</td>
                    <td className="py-3 text-slate-800">{row.bending}</td>
                    <td className="py-3 text-slate-800">{row.fabrication}</td>
                    <td className="py-3 text-slate-800">{row.welding}</td>
                    <td className="py-3 text-slate-800">{row.finishing}</td>
                    <td className="py-3 text-slate-800">{row.coating}</td>
                    <td className="py-3 text-slate-800">{row.assembly}</td>
                    <td className="py-3 text-slate-800">{row.delivery_total}</td>
                    <td className="py-3 text-slate-800">{row.installation}</td>
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

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm text-slate-600">{label}</div>
      <div className="text-xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}
