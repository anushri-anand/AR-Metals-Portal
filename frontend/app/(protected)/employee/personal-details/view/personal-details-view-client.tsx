'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type EmployeeOption = {
  id: number
  employee_id: string
  employee_name: string
}

type EmployeeHistoryRow = {
  id: number
  employee: number
  employee_id: string
  employee_name: string
  designation: string
  category: 'Staff' | 'Labour'
  visa_start_date: string | null
  visa_end_date: string | null
  passport_expiry_date: string | null
  visa_under: 'AKR' | 'ARM'
  basic_salary: string
  allowances: string
  salary_start_date: string
  salary_end_date: string | null
  employment_start_date: string
  employment_end_date: string | null
  is_current: boolean
  created_at: string
}

export default function PersonalDetailsViewClient() {
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([])
  const [historyRows, setHistoryRows] = useState<EmployeeHistoryRow[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadEmployeeOptions() {
      try {
        const data = await fetchAPI('/employees/options/')
        setEmployeeOptions(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load employee options.'
        )
      }
    }

    loadEmployeeOptions()
  }, [])

  useEffect(() => {
    async function loadHistory() {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams()

        if (selectedEmployeeId) {
          params.append('employee_id', selectedEmployeeId)
        }

        const query = params.toString()
        const data = await fetchAPI(
          `/employees/personal-details/history/${query ? `?${query}` : ''}`
        )

        setHistoryRows(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load employee history.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadHistory()
  }, [selectedEmployeeId])

  function handleEmployeeIdChange(value: string) {
    setSelectedEmployeeId(value)

    const selectedEmployee = employeeOptions.find(
      (employee) => employee.employee_id === value
    )

    setSelectedEmployeeName(selectedEmployee ? selectedEmployee.employee_name : '')
  }

  function handleEmployeeNameChange(value: string) {
    setSelectedEmployeeName(value)

    const selectedEmployee = employeeOptions.find(
      (employee) => employee.employee_name === value
    )

    setSelectedEmployeeId(selectedEmployee ? selectedEmployee.employee_id : '')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Personal Details View
        </h1>
        <p className="mt-2 text-slate-700">
          View the complete history of employee personal and salary records.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Employee ID
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => handleEmployeeIdChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="">Select employee ID</option>
              {employeeOptions.map((employee) => (
                <option key={employee.id} value={employee.employee_id}>
                  {employee.employee_id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Employee Name
            </label>
            <select
              value={selectedEmployeeName}
              onChange={(e) => handleEmployeeNameChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="">Select employee name</option>
              {employeeOptions.map((employee) => (
                <option key={employee.id} value={employee.employee_name}>
                  {employee.employee_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          Employee History
        </h2>

        {loading ? (
          <p className="text-slate-700">Loading history...</p>
        ) : error ? (
          <p className="text-red-700">{error}</p>
        ) : historyRows.length === 0 ? (
          <p className="text-slate-700">No records found.</p>
        ) : (
          <div className="max-h-[70vh] w-full max-w-full overflow-auto">
            <table className="min-w-[1800px] border-collapse">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-slate-300 text-left text-slate-900">
                  <th className="py-3 pr-4 font-semibold">Employee ID</th>
                  <th className="py-3 pr-4 font-semibold">Employee Name</th>
                  <th className="py-3 pr-4 font-semibold">Designation</th>
                  <th className="py-3 pr-4 font-semibold">Category</th>
                  <th className="py-3 pr-4 font-semibold">VISA Start Date</th>
                  <th className="py-3 pr-4 font-semibold">VISA End Date</th>
                  <th className="py-3 pr-4 font-semibold">Passport Expiry Date</th>
                  <th className="py-3 pr-4 font-semibold">VISA Under</th>
                  <th className="py-3 pr-4 font-semibold">Basic Salary</th>
                  <th className="py-3 pr-4 font-semibold">Allowances</th>
                  <th className="py-3 pr-4 font-semibold">Salary Start Date</th>
                  <th className="py-3 pr-4 font-semibold">Salary End Date</th>
                  <th className="py-3 pr-4 font-semibold">Employment Start Date</th>
                  <th className="py-3 pr-4 font-semibold">Employment End Date</th>
                </tr>
              </thead>

              <tbody>
                {historyRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100"
                  >
                    <td className="py-3 pr-4 text-slate-800">{row.employee_id}</td>
                    <td className="py-3 pr-4 text-slate-800">{row.employee_name}</td>
                    <td className="py-3 pr-4 text-slate-800">{row.designation}</td>
                    <td className="py-3 pr-4 text-slate-800">{row.category}</td>
                    <td className="py-3 pr-4 text-slate-800">{formatDateOrDash(row.visa_start_date)}</td>
                    <td className="py-3 pr-4 text-slate-800">{formatDateOrPresent(row.visa_end_date)}</td>
                    <td className="py-3 pr-4 text-slate-800">{formatDateOrDash(row.passport_expiry_date)}</td>
                    <td className="py-3 pr-4 text-slate-800">{row.visa_under}</td>
                    <td className="py-3 pr-4 text-slate-800">{row.basic_salary}</td>
                    <td className="py-3 pr-4 text-slate-800">{row.allowances}</td>
                    <td className="py-3 pr-4 text-slate-800">{formatDateOrDash(row.salary_start_date)}</td>
                    <td className="py-3 pr-4 text-slate-800">{formatDateOrPresent(row.salary_end_date)}</td>
                    <td className="py-3 pr-4 text-slate-800">{formatDateOrDash(row.employment_start_date)}</td>
                    <td className="py-3 pr-4 text-slate-800">{formatDateOrPresent(row.employment_end_date)}</td>
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

function formatDateOrDash(value: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString()
}

function formatDateOrPresent(value: string | null) {
  if (!value) return 'Present'
  return new Date(value).toLocaleDateString()
}
