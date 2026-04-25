'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type ProjectItem = {
  id: number
  package: string
  item_name: string
  quantity: string
  unit: string
  estimated_mh: string
}

type ProjectDetail = {
  id: number
  project_name: string
  project_number: string
  contract_po_ref?: string
  items: ProjectItem[]
}

export default function ProjectDetailsViewClient() {
  const [projects, setProjects] = useState<ProjectDetail[]>([])
  const [selectedProjectNumber, setSelectedProjectNumber] = useState('')
  const [selectedProjectName, setSelectedProjectName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProjects() {
      setLoading(true)
      setError('')

      try {
        const data = await fetchAPI('/production/project-details/')
        setProjects(data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load project details.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [])

  function handleProjectNumberChange(value: string) {
    const project = projects.find((item) => item.project_number === value)

    setSelectedProjectNumber(value)
    setSelectedProjectName(project ? project.project_name : '')
  }

  function handleProjectNameChange(value: string) {
    const project = projects.find((item) => item.project_name === value)

    setSelectedProjectName(value)
    setSelectedProjectNumber(project ? project.project_number : '')
  }

  const filteredProjects = projects.filter((project) => {
    if (!selectedProjectNumber && !selectedProjectName) {
      return true
    }

    return (
      project.project_number === selectedProjectNumber &&
      project.project_name === selectedProjectName
    )
  })

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Project Details View</h1>
        <p className="mt-2 text-slate-700">
          View project details and item-wise estimated man-hours.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Project #">
            <select
              value={selectedProjectNumber}
              onChange={(e) => handleProjectNumberChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="">All project numbers</option>
              {projects.map((project) => (
                <option key={project.id} value={project.project_number}>
                  {project.project_number}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Project Name">
            <select
              value={selectedProjectName}
              onChange={(e) => handleProjectNameChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="">All project names</option>
              {projects.map((project) => (
                <option key={project.id} value={project.project_name}>
                  {project.project_name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-slate-900">
          Project Items
        </h2>

        {loading ? (
          <p className="text-slate-700">Loading project details...</p>
        ) : error ? (
          <p className="text-red-700">{error}</p>
        ) : filteredProjects.length === 0 ? (
          <p className="text-slate-700">No records found.</p>
        ) : (
          <div className="space-y-8">
            {filteredProjects.map((project) => (
              <div key={project.id} className="max-h-[70vh] w-full max-w-full overflow-auto">
                <h3 className="mb-3 text-lg font-semibold text-slate-900">
                  {project.project_number} - {project.project_name}
                </h3>
                <p className="mb-3 text-sm text-slate-700">
                  Contract / PO Ref: {project.contract_po_ref || '-'}
                </p>

                <table className="min-w-[860px] border-collapse">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className="border-b border-slate-300 text-left text-slate-900">
                      <th className="py-3 pr-4 font-semibold">Package</th>
                      <th className="py-3 pr-4 font-semibold">Item</th>
                      <th className="py-3 pr-4 font-semibold">Qty</th>
                      <th className="py-3 pr-4 font-semibold">Unit</th>
                      <th className="py-3 pr-4 font-semibold">Estimated MH</th>
                    </tr>
                  </thead>

                  <tbody>
                    {project.items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-3 pr-4 text-slate-800">
                          {item.package || '-'}
                        </td>
                        <td className="py-3 pr-4 text-slate-800">{item.item_name}</td>
                        <td className="py-3 pr-4 text-slate-800">{item.quantity}</td>
                        <td className="py-3 pr-4 text-slate-800">{item.unit}</td>
                        <td className="py-3 pr-4 text-slate-800">{item.estimated_mh}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
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
