'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type ProjectItem = {
  id: number
  package?: string
}

type VariationOption = {
  id: number
  variation_number: string
}

type ProjectOption = {
  id: number
  project_name: string
  project_number: string
  items: ProjectItem[]
  variations?: VariationOption[]
}

type TimeAllocationRow = {
  id: number
  date: string
  employee_id: string
  employee_name: string
  cost_code: string
  account_code: string
  project_number: string
  project_name: string
  variation_number: string
  package: string
  percentage: string | number
}

type FilterState = {
  projectNumber: string
  projectName: string
  variationNumber: string
  package: string
}

const initialFilters: FilterState = {
  projectNumber: '',
  projectName: '',
  variationNumber: '',
  package: '',
}

export default function TimeAllocationViewClient() {
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([])
  const [filters, setFilters] = useState<FilterState>(initialFilters)
  const [rows, setRows] = useState<TimeAllocationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProjectOptions() {
      try {
        const projects = await fetchAPI('/production/project-details/options/')
        setProjectOptions(Array.isArray(projects) ? projects : [])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load project options.'
        )
      }
    }

    void loadProjectOptions()
  }, [])

  useEffect(() => {
    async function loadTimeAllocations() {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams()

        if (filters.projectNumber) params.set('project_number', filters.projectNumber)
        if (filters.projectName) params.set('project_name', filters.projectName)
        if (filters.variationNumber) params.set('variation_number', filters.variationNumber)
        if (filters.package) params.set('package', filters.package)

        const query = params.toString()
        const data = await fetchAPI(
          `/production/time-allocation/${query ? `?${query}` : ''}`
        )
        setRows(Array.isArray(data) ? data : [])
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load time allocation data.'
        )
      } finally {
        setLoading(false)
      }
    }

    void loadTimeAllocations()
  }, [filters])

  const selectedProject = useMemo(
    () =>
      projectOptions.find(
        (project) =>
          project.project_number === filters.projectNumber ||
          project.project_name === filters.projectName
      ) || null,
    [filters.projectName, filters.projectNumber, projectOptions]
  )

  const variationOptions = useMemo(
    () => selectedProject?.variations || [],
    [selectedProject]
  )

  const packageOptions = useMemo(() => {
    if (!selectedProject || filters.variationNumber) {
      return []
    }

    return Array.from(
      new Set(selectedProject.items.map((item) => item.package || '').filter(Boolean))
    ).sort((left, right) => left.localeCompare(right))
  }, [filters.variationNumber, selectedProject])

  function handleProjectNumberChange(value: string) {
    const selected = projectOptions.find((project) => project.project_number === value)

    setFilters({
      projectNumber: value,
      projectName: selected ? selected.project_name : '',
      variationNumber: '',
      package: '',
    })
  }

  function handleProjectNameChange(value: string) {
    const selected = projectOptions.find((project) => project.project_name === value)

    setFilters({
      projectName: value,
      projectNumber: selected ? selected.project_number : '',
      variationNumber: '',
      package: '',
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Time Allocation View</h1>
        <p className="mt-2 text-slate-700">
          Filter saved time allocation rows by project and package.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Project #">
            <select
              value={filters.projectNumber}
              onChange={(e) => handleProjectNumberChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
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
              value={filters.variationNumber}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  variationNumber: e.target.value,
                  package: '',
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              disabled={!selectedProject}
            >
              <option value="">Base Project</option>
              {variationOptions.map((variation) => (
                <option key={variation.id} value={variation.variation_number}>
                  {variation.variation_number}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Project Name">
            <select
              value={filters.projectName}
              onChange={(e) => handleProjectNameChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
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
              value={filters.package}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  package: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              disabled={!selectedProject || Boolean(filters.variationNumber)}
            >
              <option value="">
                {filters.variationNumber ? 'Variation allocation' : 'Select package'}
              </option>
              {packageOptions.map((packageValue) => (
                <option key={packageValue} value={packageValue}>
                  {packageValue}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Time Allocation Table</h2>
        </div>
        <div className="max-h-[65vh] overflow-auto">
          <table className="min-w-[1160px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-900">
              <tr>
                <HeaderCell>Date</HeaderCell>
                <HeaderCell>Employee ID</HeaderCell>
                <HeaderCell>Employee Name</HeaderCell>
                <HeaderCell>Cost Code</HeaderCell>
                <HeaderCell>Account Code</HeaderCell>
                <HeaderCell>Project #</HeaderCell>
                <HeaderCell>Project Name</HeaderCell>
                <HeaderCell>Variation #</HeaderCell>
                <HeaderCell>Package</HeaderCell>
                <HeaderCell>Percentage</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <BodyCell colSpan={10}>Loading time allocation rows...</BodyCell>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <BodyCell colSpan={10}>No time allocation rows found.</BodyCell>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-200">
                    <BodyCell>{formatDate(row.date)}</BodyCell>
                    <BodyCell>{row.employee_id}</BodyCell>
                    <BodyCell>{row.employee_name}</BodyCell>
                    <BodyCell>{row.cost_code || '-'}</BodyCell>
                    <BodyCell>{row.account_code || '-'}</BodyCell>
                    <BodyCell>{row.project_number || '-'}</BodyCell>
                    <BodyCell>{row.project_name || '-'}</BodyCell>
                    <BodyCell>{row.variation_number || 'Base Project'}</BodyCell>
                    <BodyCell>{row.package || '-'}</BodyCell>
                    <BodyCell>{formatPercentage(row.percentage)}</BodyCell>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
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
      <label className="mb-1 block text-sm font-medium text-slate-800">{label}</label>
      {children}
    </div>
  )
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-r border-slate-200 px-4 py-3 font-semibold">
      {children}
    </th>
  )
}

function BodyCell({
  children,
  colSpan,
}: {
  children: React.ReactNode
  colSpan?: number
}) {
  return (
    <td
      className="border-r border-slate-200 px-4 py-3 align-top text-slate-700"
      colSpan={colSpan}
    >
      {children}
    </td>
  )
}

function formatDate(value: string) {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB')
}

function formatPercentage(value: string | number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? `${parsed.toFixed(2)}%` : '0.00%'
}
