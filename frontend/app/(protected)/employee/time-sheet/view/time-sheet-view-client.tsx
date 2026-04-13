'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type EmployeeOption = {
  id: number
  employee_id: string
  employee_name: string
}

type TimeEntryRow = {
  id: number
  employee_id: string
  employee_name: string
  date: string
  day: string
  is_public_holiday: boolean
  start_time: string | null
  finish_time: string | null
  total_time: string
  regular_duty_hours: string
  normal_ot: string
  sunday_ot: string
  public_holiday_ot: string
  medical_leave_with_doc: boolean
  medical_leave_without_doc: boolean
  absent: boolean
  remarks: string
}

export default function TimeSheetViewClient() {
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([])
  const [entries, setEntries] = useState<TimeEntryRow[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
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
    async function loadEntries() {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams()

        if (selectedEmployeeId) {
          params.append('employee_id', selectedEmployeeId)
        }

        if (fromDate) {
          params.append('date_from', fromDate)
        }

        if (toDate) {
          params.append('date_to', toDate)
        }

        const query = params.toString()
        const data = await fetchAPI(
          `/employees/time-sheet/entries/${query ? `?${query}` : ''}`
        )

        setEntries(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load time sheet data.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadEntries()
  }, [selectedEmployeeId, fromDate, toDate])

  function handleEmployeeIdChange(value: string) {
    const selectedEmployee = employeeOptions.find(
      (employee) => employee.employee_id === value
    )

    setSelectedEmployeeId(value)
    setSelectedEmployeeName(selectedEmployee ? selectedEmployee.employee_name : '')
  }

  function handleEmployeeNameChange(value: string) {
    const selectedEmployee = employeeOptions.find(
      (employee) => employee.employee_name === value
    )

    setSelectedEmployeeName(value)
    setSelectedEmployeeId(selectedEmployee ? selectedEmployee.employee_id : '')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Time Sheet View</h1>
        <p className="mt-2 text-slate-700">
          Filter and view saved time-entry records.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Field label="From Date">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="To Date">
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="Employee ID">
            <select
              value={selectedEmployeeId}
              onChange={(e) => handleEmployeeIdChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="">All employee IDs</option>
              {employeeOptions.map((employee) => (
                <option key={employee.id} value={employee.employee_id}>
                  {employee.employee_id}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Employee Name">
            <select
              value={selectedEmployeeName}
              onChange={(e) => handleEmployeeNameChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="">All employee names</option>
              {employeeOptions.map((employee) => (
                <option key={employee.id} value={employee.employee_name}>
                  {employee.employee_name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          Time Entry Records
        </h2>

        {loading ? (
          <p className="text-slate-700">Loading time sheet data...</p>
        ) : error ? (
          <p className="text-red-700">{error}</p>
        ) : entries.length === 0 ? (
          <p className="text-slate-700">No records found.</p>
        ) : (
          <div className="max-h-[70vh] w-full max-w-full overflow-auto">
            <table className="min-w-[2200px] border-collapse">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-slate-300 text-left text-slate-900">
                  <th className="py-3 pr-4 font-semibold">Employee ID</th>
                  <th className="py-3 pr-4 font-semibold">Employee Name</th>
                  <th className="py-3 pr-4 font-semibold">Date</th>
                  <th className="py-3 pr-4 font-semibold">Day</th>
                  <th className="py-3 pr-4 font-semibold">Public Holiday</th>
                  <th className="py-3 pr-4 font-semibold">Start Time</th>
                  <th className="py-3 pr-4 font-semibold">Finish Time</th>
                  <th className="py-3 pr-4 font-semibold">Total Time</th>
                  <th className="py-3 pr-4 font-semibold">Regular Duty Hours</th>
                  <th className="py-3 pr-4 font-semibold">Normal OT</th>
                  <th className="py-3 pr-4 font-semibold">Sunday OT</th>
                  <th className="py-3 pr-4 font-semibold">Public Holiday OT</th>
                  <th className="py-3 pr-4 font-semibold">Medical Leave With Doc</th>
                  <th className="py-3 pr-4 font-semibold">Medical Leave Without Doc</th>
                  <th className="py-3 pr-4 font-semibold">Absent</th>
                  <th className="py-3 pr-4 font-semibold">Remarks</th>
                </tr>
              </thead>

              <tbody>
                {entries.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 text-slate-800">{row.employee_id}</td>
                    <td className="py-3 pr-4 text-slate-800">{row.employee_name}</td>
                    <td className="py-3 pr-4 text-slate-800">{formatDate(row.date)}</td>
                    <td className="py-3 pr-4 text-slate-800">{row.day}</td>
                    <td className="py-3 pr-4 text-slate-800">{yesNo(row.is_public_holiday)}</td>
                    <td className="py-3 pr-4 text-slate-800">{formatTime(row.start_time)}</td>
                    <td className="py-3 pr-4 text-slate-800">{formatTime(row.finish_time)}</td>
                    <td className="py-3 pr-4 text-slate-800">{row.total_time}</td>
                    <td className="py-3 pr-4 text-slate-800">{row.regular_duty_hours}</td>
                    <td className="py-3 pr-4 text-slate-800">{row.normal_ot}</td>
                    <td className="py-3 pr-4 text-slate-800">{row.sunday_ot}</td>
                    <td className="py-3 pr-4 text-slate-800">{row.public_holiday_ot}</td>
                    <td className="py-3 pr-4 text-slate-800">{yesNo(row.medical_leave_with_doc)}</td>
                    <td className="py-3 pr-4 text-slate-800">{yesNo(row.medical_leave_without_doc)}</td>
                    <td className="py-3 pr-4 text-slate-800">{yesNo(row.absent)}</td>
                    <td className="py-3 pr-4 text-slate-800">{row.remarks || '-'}</td>
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

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
    </div>
  )
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString()
}

function formatTime(value: string | null) {
  if (!value) return '-'
  return value.slice(0, 5)
}

function yesNo(value: boolean) {
  return value ? 'Yes' : 'No'
}
