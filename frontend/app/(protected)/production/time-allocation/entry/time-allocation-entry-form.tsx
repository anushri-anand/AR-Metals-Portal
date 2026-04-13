'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type EmployeeOption = {
  id: number
  employee_id: string
  employee_name: string
}

type ProjectItem = {
  id: number
  item_name: string
}

type ProjectOption = {
  id: number
  project_name: string
  project_number: string
  items: ProjectItem[]
}

type Allocation = {
  projectName: string
  itemName: string
  percentage: string
}

type FormState = {
  date: string
  employeeId: string
  employeeName: string
  numberOfAllocations: string
  allocations: Allocation[]
}

const initialForm: FormState = {
  date: '',
  employeeId: '',
  employeeName: '',
  numberOfAllocations: '',
  allocations: [],
}

function createEmptyAllocation(): Allocation {
  return {
    projectName: '',
    itemName: '',
    percentage: '',
  }
}

export default function TimeAllocationEntryForm() {
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([])
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadOptions() {
      try {
        const [employees, projects] = await Promise.all([
          fetchAPI('/employees/options/'),
          fetchAPI('/production/project-details/options/'),
        ])

        setEmployeeOptions(employees)
        setProjectOptions(projects)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load form options.'
        )
      }
    }

    loadOptions()
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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleNumberOfAllocationsChange(value: string) {
    const allocationCount = Number(value || 0)

    setForm((prev) => ({
      ...prev,
      numberOfAllocations: value,
      allocations:
        allocationCount > 0
          ? Array.from(
              { length: allocationCount },
              (_, index) => prev.allocations[index] || createEmptyAllocation()
            )
          : [],
    }))
  }

  function handleAllocationChange(
    index: number,
    field: keyof Allocation,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      allocations: prev.allocations.map((allocation, allocationIndex) =>
        allocationIndex === index
          ? {
              ...allocation,
              [field]: value,
              itemName: field === 'projectName' ? '' : allocation.itemName,
            }
          : allocation
      ),
    }))
  }

  function getItemsForProject(projectName: string) {
    const project = projectOptions.find(
      (option) => option.project_name === projectName
    )

    return project ? project.items : []
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')

    setMessage('Time allocation form structure is ready. Backend save will be connected next.')
    console.log(form)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Time Allocation Entry</h1>
        <p className="mt-2 text-slate-700">
          Allocate employee time across projects and project items.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Date">
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            />
          </Field>

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

          <Field label="No. of Allocations">
            <input
              type="number"
              min="1"
              name="numberOfAllocations"
              value={form.numberOfAllocations}
              onChange={(e) => handleNumberOfAllocationsChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter number of allocations"
              required
            />
          </Field>
        </div>

        {form.allocations.length > 0 && (
          <div className="mt-8 space-y-6">
            {form.allocations.map((allocation, index) => (
              <div key={index} className="rounded-xl border border-slate-200 p-6">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">
                  Allocation {index + 1}
                </h2>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <Field label="Project Name">
                    <select
                      value={allocation.projectName}
                      onChange={(e) =>
                        handleAllocationChange(index, 'projectName', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      required
                    >
                      <option value="">Select project name</option>
                      {projectOptions.map((project) => (
                        <option key={project.id} value={project.project_name}>
                          {project.project_name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Item">
                    <select
                      value={allocation.itemName}
                      onChange={(e) =>
                        handleAllocationChange(index, 'itemName', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      required
                      disabled={!allocation.projectName}
                    >
                      <option value="">Select item</option>
                      {getItemsForProject(allocation.projectName).map((item) => (
                        <option key={item.id} value={item.item_name}>
                          {item.item_name}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Percentage">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={allocation.percentage}
                      onChange={(e) =>
                        handleAllocationChange(index, 'percentage', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="Enter percentage"
                      required
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        )}

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
