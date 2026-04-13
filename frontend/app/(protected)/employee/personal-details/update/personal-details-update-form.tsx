'use client'

import { useEffect, useMemo, useState } from 'react'
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

type FormState = {
  designation: string
  category: string
  visaStartDate: string
  visaEndDate: string
  passportExpiryDate: string
  basicSalary: string
  allowances: string
  salaryStartDate: string
  employmentEndDate: string
}

const initialForm: FormState = {
  designation: '',
  category: '',
  visaStartDate: '',
  visaEndDate: '',
  passportExpiryDate: '',
  basicSalary: '',
  allowances: '',
  salaryStartDate: '',
  employmentEndDate: '',
}

export default function PersonalDetailsUpdateForm() {
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([])
  const [historyRows, setHistoryRows] = useState<EmployeeHistoryRow[]>([])

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('')

  const [form, setForm] = useState<FormState>(initialForm)
  const [currentVisaUnder, setCurrentVisaUnder] = useState('')
  const [currentEmploymentStartDate, setCurrentEmploymentStartDate] = useState('')
  const [currentSalaryEndDate, setCurrentSalaryEndDate] = useState('Present')

  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
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
    async function loadEmployeeHistory() {
      if (!selectedEmployeeId) {
        setHistoryRows([])
        setForm(initialForm)
        setCurrentVisaUnder('')
        setCurrentEmploymentStartDate('')
        setCurrentSalaryEndDate('Present')
        return
      }

      setLoading(true)
      setError('')
      setMessage('')

      try {
        const data = await fetchAPI(
          `/employees/personal-details/history/?employee_id=${selectedEmployeeId}`
        )

        setHistoryRows(data)

        const currentRow = data.find((row: EmployeeHistoryRow) => row.is_current)

        if (currentRow) {
          setForm({
            designation: currentRow.designation || '',
            category: currentRow.category || '',
            visaStartDate: currentRow.visa_start_date || '',
            visaEndDate: currentRow.visa_end_date || '',
            passportExpiryDate: currentRow.passport_expiry_date || '',
            basicSalary: currentRow.basic_salary || '',
            allowances: currentRow.allowances || '',
            salaryStartDate: '',
            employmentEndDate: currentRow.employment_end_date || '',
          })

          setCurrentVisaUnder(currentRow.visa_under || '')
          setCurrentEmploymentStartDate(currentRow.employment_start_date || '')
          setCurrentSalaryEndDate(
            currentRow.salary_end_date ? currentRow.salary_end_date : 'Present'
          )
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load employee history.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadEmployeeHistory()
  }, [selectedEmployeeId])

  const currentRow = useMemo(() => {
    return historyRows.find((row) => row.is_current) || null
  }, [historyRows])

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

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
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

    try {
      await fetchAPI('/employees/personal-details/update/', {
        method: 'POST',
        body: JSON.stringify({
          employee_id: selectedEmployeeId,
          designation: form.designation,
          category: form.category,
          visa_start_date: form.visaStartDate || null,
          visa_end_date: form.visaEndDate || null,
          passport_expiry_date: form.passportExpiryDate || null,
          basic_salary: form.basicSalary,
          allowances: form.allowances,
          salary_start_date: form.salaryStartDate || null,
          employment_end_date: form.employmentEndDate || null,
        }),
      })

      setMessage('Employee details updated successfully.')
      setForm((prev) => ({
        ...prev,
        salaryStartDate: '',
      }))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update employee details.'
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Personal Details Update
        </h1>
        <p className="mt-2 text-slate-700">
          Select an employee and create a new updated record without deleting the old one.
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

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        {loading ? (
          <p className="text-slate-700">Loading employee details...</p>
        ) : !selectedEmployeeId ? (
          <p className="text-slate-700">Select an employee to load current details.</p>
        ) : !currentRow ? (
          <p className="text-slate-700">No current record found for this employee.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Field label="Designation">
                <input
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </Field>

              <Field label="Category">
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                >
                  <option value="">Select category</option>
                  <option value="Staff">Staff</option>
                  <option value="Labour">Labour</option>
                </select>
              </Field>

              <Field label="VISA Start Date">
                <input
                  type="date"
                  name="visaStartDate"
                  value={form.visaStartDate}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </Field>

              <Field label="VISA End Date">
                <input
                  type="date"
                  name="visaEndDate"
                  value={form.visaEndDate}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </Field>

              <Field label="Passport Expiry Date">
                <input
                  type="date"
                  name="passportExpiryDate"
                  value={form.passportExpiryDate}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </Field>

              <Field label="VISA Under">
                <div className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700">
                  {currentVisaUnder || '-'}
                </div>
              </Field>

              <Field label="Basic Salary">
                <input
                  type="number"
                  name="basicSalary"
                  value={form.basicSalary}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </Field>

              <Field label="Allowances">
                <input
                  type="number"
                  name="allowances"
                  value={form.allowances}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </Field>

              <Field label="New Salary Start Date">
                <input
                  type="date"
                  name="salaryStartDate"
                  value={form.salaryStartDate}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </Field>

              <Field label="Current Salary End Date">
                <div className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700">
                  {currentSalaryEndDate === 'Present'
                    ? 'Present'
                    : formatDate(currentSalaryEndDate)}
                </div>
              </Field>

              <Field label="Employment Start Date">
                <div className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700">
                  {currentEmploymentStartDate
                    ? formatDate(currentEmploymentStartDate)
                    : '-'}
                </div>
              </Field>

              <Field label="Employment End Date">
                <input
                  type="date"
                  name="employmentEndDate"
                  value={form.employmentEndDate}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                />
              </Field>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
              >
                Save Update
              </button>

              {message && <p className="text-sm text-green-700">{message}</p>}
              {error && <p className="text-sm text-red-700">{error}</p>}
            </div>
          </>
        )}
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

function formatDate(value: string) {
  return new Date(value).toLocaleDateString()
}
