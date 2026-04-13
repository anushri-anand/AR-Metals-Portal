'use client'

import { useState } from 'react'
import { fetchAPI } from '@/lib/api'

type FormState = {
  employeeId: string
  employeeName: string
  designation: string
  category: string
  visaStartDate: string
  visaEndDate: string
  passportExpiryDate: string
  visaUnder: string
  basicSalary: string
  allowances: string
  salaryStartDate: string
  employmentStartDate: string
}

const initialForm: FormState = {
  employeeId: '',
  employeeName: '',
  designation: '',
  category: '',
  visaStartDate: '',
  visaEndDate: '',
  passportExpiryDate: '',
  visaUnder: '',
  basicSalary: '',
  allowances: '',
  salaryStartDate: '',
  employmentStartDate: '',
}

export default function PersonalDetailsEntryForm() {
  const [form, setForm] = useState<FormState>(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

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
      await fetchAPI('/employees/personal-details/entry/', {
        method: 'POST',
        body: JSON.stringify({
          employee_id: form.employeeId,
          employee_name: form.employeeName,
          designation: form.designation,
          category: form.category,
          visa_start_date: form.visaStartDate || null,
          visa_end_date: form.visaEndDate || null,
          passport_expiry_date: form.passportExpiryDate || null,
          visa_under: form.visaUnder,
          basic_salary: form.basicSalary,
          allowances: form.allowances,
          salary_start_date: form.salaryStartDate,
          employment_start_date: form.employmentStartDate,
        }),
      })

      setForm(initialForm)
      setMessage('Employee personal details saved successfully.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save employee details.'
      )
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Personal Details Entry
        </h1>
        <p className="mt-2 text-slate-700">
          Enter employee personal and salary details.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Employee ID">
            <input
              name="employeeId"
              value={form.employeeId}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter employee ID"
              required
            />
          </Field>

          <Field label="Employee Name">
            <input
              name="employeeName"
              value={form.employeeName}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter employee name"
              required
            />
          </Field>

          <Field label="Designation">
            <input
              name="designation"
              value={form.designation}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter designation"
              required
            />
          </Field>

          <Field label="Category">
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
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
            <select
              name="visaUnder"
              value={form.visaUnder}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            >
              <option value="">Select visa under</option>
              <option value="AKR">AKR</option>
              <option value="ARM">ARM</option>
            </select>
          </Field>

          <Field label="Basic Salary">
            <input
              type="number"
              name="basicSalary"
              value={form.basicSalary}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter basic salary"
              required
            />
          </Field>

          <Field label="Allowances">
            <input
              type="number"
              name="allowances"
              value={form.allowances}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter allowances"
              required
            />
          </Field>

          <Field label="Salary Start Date">
            <input
              type="date"
              name="salaryStartDate"
              value={form.salaryStartDate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            />
          </Field>

          <Field label="Salary End Date">
            <div className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700">
              Present
            </div>
          </Field>

          <Field label="Employment Start Date">
            <input
              type="date"
              name="employmentStartDate"
              value={form.employmentStartDate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            />
          </Field>

          <Field label="Employment End Date">
            <div className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700">
              Present
            </div>
          </Field>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            Save
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
