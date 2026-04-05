'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type Employee = {
  id: number
  name: string
  designation: string
}

type ProjectItem = {
  id: number
  project_name: string
  item_name: string
}

type LabourStatusRow = {
  id: number
  employee_name: string
  designation: string
  project_name: string
  item_name: string
  date: string
  hours_worked: number
  created_at: string
}

type LabourStatusResponse = {
  total_hours: number
  count: number
  results: LabourStatusRow[]
}

export default function LabourStatusClient() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([])
  const [rows, setRows] = useState<LabourStatusRow[]>([])
  const [totalHours, setTotalHours] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [projectName, setProjectName] = useState('')
  const [itemName, setItemName] = useState('')

  const projectNames = [...new Set(projectItems.map((item) => item.project_name))]

  const filteredItems = projectName
    ? projectItems.filter((item) => item.project_name === projectName)
    : []

  async function loadFilterData() {
    try {
      const [employeesData, itemsData] = await Promise.all([
        fetchAPI('/master-data/employees/'),
        fetchAPI('/master-data/project-items/'),
      ])

      setEmployees(employeesData)
      setProjectItems(itemsData)
    } catch {
      setError('Failed to load filter data.')
    }
  }

  async function loadLabourStatus() {
    try {
      setLoading(true)
      setError('')

      const params = new URLSearchParams()

      if (fromDate) params.append('from_date', fromDate)
      if (toDate) params.append('to_date', toDate)
      if (employeeId) params.append('employee_id', employeeId)
      if (projectName) params.append('project_name', projectName)
      if (itemName) params.append('item_name', itemName)

      const data: LabourStatusResponse = await fetchAPI(
        `/employees/labour-status/?${params.toString()}`
      )

      setRows(data.results)
      setTotalHours(data.total_hours)
    } catch {
      setError('Failed to load labour status.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFilterData()
  }, [])

  useEffect(() => {
    loadLabourStatus()
  }, [])

  function handleApplyFilters(e: React.FormEvent) {
    e.preventDefault()
    loadLabourStatus()
  }

  function handleProjectChange(value: string) {
    setProjectName(value)
    setItemName('')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold mb-2 text-slate-900">View Labour Status</h1>
        <p className="text-slate-700">
          View labour entries with filters and total hours.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <form onSubmit={handleApplyFilters} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
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
            <label className="block text-sm font-medium text-slate-800 mb-1">Employee</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">All employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name} - {employee.designation}
                </option>
              ))}
            </select>
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

          <div className="md:col-span-2 xl:col-span-5">
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Labour Status</h2>
          <div className="text-slate-900 font-semibold">Total Hours: {totalHours}</div>
        </div>

        {error && <p className="text-red-700 mb-4">{error}</p>}

        {loading ? (
          <p className="text-slate-700">Loading labour status...</p>
        ) : rows.length === 0 ? (
          <p className="text-slate-700">No labour records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-300 text-left text-slate-900">
                  <th className="py-3 font-semibold">Date</th>
                  <th className="py-3 font-semibold">Employee</th>
                  <th className="py-3 font-semibold">Project</th>
                  <th className="py-3 font-semibold">Item</th>
                  <th className="py-3 font-semibold">Hours Worked</th>
                  <th className="py-3 font-semibold">Created At</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="py-3 text-slate-800">{row.date}</td>
                    <td className="py-3 text-slate-800">
                      {row.employee_name} - {row.designation}
                    </td>
                    <td className="py-3 text-slate-800">{row.project_name}</td>
                    <td className="py-3 text-slate-800">{row.item_name}</td>
                    <td className="py-3 text-slate-800">{row.hours_worked}</td>
                    <td className="py-3 text-slate-800">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
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
