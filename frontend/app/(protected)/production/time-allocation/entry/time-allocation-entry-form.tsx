'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import {
  getAccountCodeOptions,
  normalizeAccountCode,
  requiresManualAccountCode,
} from '@/lib/account-codes'

type EmployeeOption = {
  id: number
  employee_id: string
  employee_name: string
  category?: 'Staff' | 'Labour' | ''
}

type ProjectItem = {
  id: number
  boq_sn: string
  package?: string
  item_name: string
}

type VariationItem = {
  id: number
  package?: string
  item_name: string
}

type VariationOption = {
  id: number
  variation_number: string
  items: VariationItem[]
}

type ProjectOption = {
  id: number
  project_name: string
  project_number: string
  items: ProjectItem[]
  variations?: VariationOption[]
}

type Allocation = {
  projectNumber: string
  projectName: string
  variationNumber: string
  package: string
  percentage: string
}

type FormState = {
  date: string
  employeeId: string
  employeeName: string
  costCode: string
  accountCode: string
  numberOfAllocations: string
  allocations: Allocation[]
}

const labourCostCodeOptions = ['Production Labour', 'Installation Labour'] as const
const allCostCodeOptions = [
  'Material',
  'Machining',
  'Coating',
  'Consumables',
  'Subcontracts',
  'Production Labour',
  'Installation Labour',
  'Freight&Customs',
  'Prelims',
  'FOH',
  'Commitments',
  'Contingency',
] as const

const initialForm: FormState = {
  date: '',
  employeeId: '',
  employeeName: '',
  costCode: '',
  accountCode: '',
  numberOfAllocations: '',
  allocations: [],
}

function createEmptyAllocation(): Allocation {
  return {
    projectNumber: '',
    projectName: '',
    variationNumber: '',
    package: '',
    percentage: '',
  }
}

function getProjectForAllocation(
  allocation: Allocation,
  projectOptions: ProjectOption[]
) {
  return projectOptions.find(
    (option) =>
      option.project_number === allocation.projectNumber ||
      option.project_name === allocation.projectName
  )
}

function getBaseProjectItems(
  allocation: Allocation,
  projectOptions: ProjectOption[]
) {
  const project = getProjectForAllocation(allocation, projectOptions)
  return project ? project.items : []
}

function getPackageOptions(
  allocation: Allocation,
  projectOptions: ProjectOption[]
) {
  if (allocation.variationNumber) {
    return []
  }

  return Array.from(
    new Set(
      getBaseProjectItems(allocation, projectOptions)
        .map((item) => item.package || '')
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right))
}

export default function TimeAllocationEntryForm() {
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([])
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [lastLabourCostCode, setLastLabourCostCode] =
    useState<(typeof labourCostCodeOptions)[number]>('Production Labour')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

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

  const selectedEmployee = employeeOptions.find(
    (employee) =>
      employee.employee_id === form.employeeId ||
      employee.employee_name === form.employeeName
  )
  const selectedEmployeeCategory = selectedEmployee?.category || ''
  const isStaffEmployee = selectedEmployeeCategory === 'Staff'
  const isLabourEmployee = selectedEmployeeCategory === 'Labour'
  const isFohCostCode = form.costCode === 'FOH'

  function getTimeAllocationCodes(employee?: EmployeeOption) {
    if (employee?.category === 'Staff') {
      return {
        costCode: 'FOH',
        accountCode: 'Staff Cost',
      }
    }

    if (employee?.category === 'Labour') {
      return {
        costCode: lastLabourCostCode,
        accountCode: lastLabourCostCode,
      }
    }

    return {
      costCode: form.costCode,
      accountCode: form.accountCode,
    }
  }

  function handleEmployeeIdChange(value: string) {
    const selectedEmployee = employeeOptions.find(
      (employee) => employee.employee_id === value
    )
    const nextCodes = getTimeAllocationCodes(selectedEmployee)

    setForm((prev) => ({
      ...prev,
      employeeId: value,
      employeeName: selectedEmployee ? selectedEmployee.employee_name : '',
      costCode: nextCodes.costCode,
      accountCode: nextCodes.accountCode,
      numberOfAllocations:
        selectedEmployee?.category === 'Staff' ? '' : prev.numberOfAllocations,
      allocations:
        selectedEmployee?.category === 'Staff' ? [] : prev.allocations,
    }))
  }

  function handleEmployeeNameChange(value: string) {
    const selectedEmployee = employeeOptions.find(
      (employee) => employee.employee_name === value
    )
    const nextCodes = getTimeAllocationCodes(selectedEmployee)

    setForm((prev) => ({
      ...prev,
      employeeName: value,
      employeeId: selectedEmployee ? selectedEmployee.employee_id : '',
      costCode: nextCodes.costCode,
      accountCode: nextCodes.accountCode,
      numberOfAllocations:
        selectedEmployee?.category === 'Staff' ? '' : prev.numberOfAllocations,
      allocations:
        selectedEmployee?.category === 'Staff' ? [] : prev.allocations,
    }))
  }

  function handleCostCodeChange(value: string) {
    if (isLabourEmployee) {
      const nextCostCode = labourCostCodeOptions.includes(
        value as (typeof labourCostCodeOptions)[number]
      )
        ? (value as (typeof labourCostCodeOptions)[number])
        : 'Production Labour'

      setLastLabourCostCode(nextCostCode)
      setForm((prev) => ({
        ...prev,
        costCode: nextCostCode,
        accountCode: nextCostCode,
        numberOfAllocations: prev.numberOfAllocations,
        allocations: prev.allocations,
      }))
      return
    }

    setForm((prev) => ({
      ...prev,
      costCode: value,
      accountCode:
        value === 'FOH'
          ? prev.accountCode && getAccountCodeOptions('FOH').includes(prev.accountCode)
            ? prev.accountCode
            : 'Staff Cost'
          : normalizeAccountCode(value, prev.accountCode) || value,
      numberOfAllocations: value === 'FOH' ? '' : prev.numberOfAllocations,
      allocations: value === 'FOH' ? [] : prev.allocations,
    }))
  }

  function handleAccountCodeChange(value: string) {
    setForm((prev) => ({
      ...prev,
      accountCode: requiresManualAccountCode(prev.costCode)
        ? value
        : normalizeAccountCode(prev.costCode, value) || prev.costCode,
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

  function handleAllocationChange(index: number, field: keyof Allocation, value: string) {
    setForm((prev) => ({
      ...prev,
      allocations: prev.allocations.map((allocation, allocationIndex) =>
        allocationIndex === index
          ? {
              ...allocation,
              ...getUpdatedAllocation(allocation, field, value, projectOptions),
            }
          : allocation
      ),
    }))
  }

  function getVariationOptions(allocation: Allocation) {
    const project = getProjectForAllocation(allocation, projectOptions)
    return (project?.variations || []).slice().sort((left, right) =>
      left.variation_number.localeCompare(right.variation_number)
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)

    try {
      await fetchAPI('/production/time-allocation/entry/', {
        method: 'POST',
        body: JSON.stringify({
          date: form.date,
          employee_id: form.employeeId,
          employee_name: form.employeeName,
          cost_code: form.costCode,
          account_code: form.accountCode,
          allocations: isFohCostCode
            ? []
            : form.allocations.map((allocation) => ({
                project_number: allocation.projectNumber,
                project_name: allocation.projectName,
                variation_number: allocation.variationNumber,
                package: allocation.package,
                percentage: allocation.percentage,
              })),
        }),
      })

      setForm((prev) => ({
        ...initialForm,
        costCode: prev.costCode,
        accountCode: prev.accountCode,
      }))
      setMessage('Time allocation saved successfully.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save time allocation.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Time Allocation Entry</h1>
        <p className="mt-2 text-slate-700">
          Allocate employee time across projects and packages.
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

          <Field label="Cost Code">
            <select
              value={form.costCode}
              onChange={(e) => handleCostCodeChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              disabled={!form.employeeId}
              required
            >
              <option value="">
                {isStaffEmployee
                  ? 'FOH'
                  : isLabourEmployee
                    ? 'Select cost code'
                    : 'Select employee first'}
              </option>
              {isLabourEmployee ? (
                labourCostCodeOptions.map((costCode) => (
                  <option key={costCode} value={costCode}>
                    {costCode}
                  </option>
                ))
              ) : (
                allCostCodeOptions.map((costCode) => (
                  <option key={costCode} value={costCode}>
                    {costCode}
                  </option>
                ))
              )}
            </select>
          </Field>

          <Field label="Account Code">
            {requiresManualAccountCode(form.costCode) ? (
              <select
                value={form.accountCode}
                onChange={(e) => handleAccountCodeChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                required
              >
                <option value="">Select account code</option>
                {getAccountCodeOptions(form.costCode).map((accountCode) => (
                  <option key={accountCode} value={accountCode}>
                    {accountCode}
                  </option>
                ))}
              </select>
            ) : (
              <input
              value={form.accountCode}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
              placeholder={
                isStaffEmployee
                  ? 'Staff Cost'
                  : isLabourEmployee
                    ? 'Auto selected from cost code'
                    : 'Select employee first'
              }
              required
            />
            )}
          </Field>

          {!isFohCostCode ? (
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
          ) : null}
        </div>

        {!isFohCostCode && form.allocations.length > 0 && (
          <div className="mt-8 space-y-6">
            {form.allocations.map((allocation, index) => (
              <div key={index} className="rounded-xl border border-slate-200 p-6">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">
                  Allocation {index + 1}
                </h2>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
                  <Field label="Project #">
                    <select
                      value={allocation.projectNumber}
                      onChange={(e) =>
                        handleAllocationChange(index, 'projectNumber', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      required
                    >
                      <option value="">Select project #</option>
                      {projectOptions.map((project) => (
                        <option key={project.id} value={project.project_number}>
                          {project.project_number}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Variation #">
                    <select
                      value={allocation.variationNumber}
                      onChange={(e) =>
                        handleAllocationChange(index, 'variationNumber', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                    >
                      <option value="">Base Project</option>
                      {getVariationOptions(allocation).map((variation) => (
                        <option
                          key={variation.id}
                          value={variation.variation_number}
                        >
                          {variation.variation_number}
                        </option>
                      ))}
                    </select>
                  </Field>

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

                  <Field label="Package">
                    <select
                      value={allocation.package}
                      onChange={(e) =>
                        handleAllocationChange(index, 'package', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      required={!allocation.variationNumber}
                      disabled={
                        (!allocation.projectName && !allocation.projectNumber) || Boolean(allocation.variationNumber)
                      }
                    >
                      <option value="">
                        {allocation.variationNumber
                          ? 'Variation allocation'
                          : 'Select package'}
                      </option>
                      {getPackageOptions(allocation, projectOptions).map((packageValue) => (
                        <option key={packageValue} value={packageValue}>
                          {packageValue}
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
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>

          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      </form>
    </div>
  )
}

function getUpdatedAllocation(
  allocation: Allocation,
  field: keyof Allocation,
  value: string,
  projectOptions: ProjectOption[]
) {
  if (field === 'projectNumber') {
    const selectedProject = projectOptions.find(
      (project) => project.project_number === value
    )

    return {
      ...allocation,
      projectNumber: value,
      projectName: selectedProject ? selectedProject.project_name : '',
      variationNumber: '',
      package: '',
    }
  }

  if (field === 'projectName') {
    const selectedProject = projectOptions.find(
      (project) => project.project_name === value
    )

    return {
      ...allocation,
      projectName: value,
      projectNumber: selectedProject ? selectedProject.project_number : '',
      variationNumber: '',
      package: '',
    }
  }

  if (field === 'variationNumber') {
    return {
      ...allocation,
      variationNumber: value,
      package: '',
    }
  }

  return {
    ...allocation,
    [field]: value,
  }
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
