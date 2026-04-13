'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type EmployeeOption = {
  id: number
  employee_id: string
  employee_name: string
}

type FormState = {
  employeeId: string
  employeeName: string
  advanceDate: string
  amount: string
  remarks: string
}

const initialForm: FormState = {
  employeeId: '',
  employeeName: '',
  advanceDate: '',
  amount: '',
  remarks: '',
}

export default function AdvanceForm() {
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

  function handleEmployeeIdChange(value: string) {
    const selectedEmployee = employeeOptions.find(
      (employee) => employee.employee_id === value
    )

    setForm((prev) => ({
      ...prev,
      employeeId: value,
      employeeName: selectedEmployee ? selectedEmployee.employee_name : '',
    }))
  }

  function handleEmployeeNameChange(value: string) {
    const selectedEmployee = employeeOptions.find(
      (employee) => employee.employee_name === value
    )

    setForm((prev) => ({
      ...prev,
      employeeName: value,
      employeeId: selectedEmployee ? selectedEmployee.employee_id : '',
    }))
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)

    try {
      await fetchAPI('/employees/salary/advance/', {
        method: 'POST',
        body: JSON.stringify({
          employee_id: form.employeeId,
          advance_date: form.advanceDate,
          amount: form.amount,
          remarks: form.remarks,
        }),
      })

      setForm(initialForm)
      setMessage('Advance saved successfully.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save advance.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Advance</h1>
        <p className="mt-2 text-slate-700">
          Enter employee salary advance details.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Employee ID">
            <select
              value={form.employeeId}
              onChange={(e) => handleEmployeeIdChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            >
              <option value="">Select employee ID</option>
              {employeeOptions.map((employee) => (
                <option key={employee.id} value={employee.employee_id}>
                  {employee.employee_id}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Employee Name">
            <select
              value={form.employeeName}
              onChange={(e) => handleEmployeeNameChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            >
              <option value="">Select employee name</option>
              {employeeOptions.map((employee) => (
                <option key={employee.id} value={employee.employee_name}>
                  {employee.employee_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Advance Date">
            <input
              type="date"
              name="advanceDate"
              value={form.advanceDate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            />
          </Field>

          <Field label="Amount">
            <input
              type="number"
              step="0.01"
              name="amount"
              value={form.amount}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter advance amount"
              required
            />
          </Field>

          <div className="md:col-span-2">
            <Field label="Remarks">
              <textarea
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="Enter remarks"
              />
            </Field>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>

          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      </form>
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
