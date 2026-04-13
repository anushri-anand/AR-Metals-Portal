'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type ProjectItem = {
  id: number
  item_name: string
  quantity: string
  unit: string
  estimated_mh: string
}

type ProjectDetail = {
  id: number
  project_name: string
  project_number: string
  items: ProjectItem[]
}

export default function ProjectDetailsUpdateForm() {
  const [projects, setProjects] = useState<ProjectDetail[]>([])
  const [selectedProjectNumber, setSelectedProjectNumber] = useState('')
  const [selectedProjectName, setSelectedProjectName] = useState('')
  const [items, setItems] = useState<ProjectItem[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

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

  function loadSelectedProject(project: ProjectDetail | undefined) {
    if (!project) {
      setSelectedProjectNumber('')
      setSelectedProjectName('')
      setItems([])
      return
    }

    setSelectedProjectNumber(project.project_number)
    setSelectedProjectName(project.project_name)
    setItems(project.items.map((item) => ({ ...item })))
  }

  function handleProjectNumberChange(value: string) {
    const project = projects.find((item) => item.project_number === value)
    loadSelectedProject(project)
  }

  function handleProjectNameChange(value: string) {
    const project = projects.find((item) => item.project_name === value)
    loadSelectedProject(project)
  }

  function handleItemChange(
    index: number,
    field: 'quantity' | 'unit' | 'estimated_mh',
    value: string
  ) {
    setItems((prev) =>
      prev.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)

    try {
      const data = await fetchAPI('/production/project-details/update/', {
        method: 'POST',
        body: JSON.stringify({
          project_number: selectedProjectNumber,
          items: items.map((item) => ({
            id: item.id,
            quantity: item.quantity,
            unit: item.unit,
            estimated_mh: item.estimated_mh,
          })),
        }),
      })

      setItems(data.items)
      setMessage('Project details updated successfully.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update project details.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Project Details Update</h1>
        <p className="mt-2 text-slate-700">
          Select a project and update Qty, Unit, and Estimated MH.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Project #">
            <select
              value={selectedProjectNumber}
              onChange={(e) => handleProjectNumberChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            >
              <option value="">Select project #</option>
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
              required
            >
              <option value="">Select project name</option>
              {projects.map((project) => (
                <option key={project.id} value={project.project_name}>
                  {project.project_name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {loading ? (
          <p className="mt-8 text-slate-700">Loading project details...</p>
        ) : items.length === 0 ? (
          <p className="mt-8 text-slate-700">Select a project to view items.</p>
        ) : (
          <div className="mt-8 max-h-[70vh] w-full max-w-full overflow-auto">
            <table className="min-w-[720px] border-collapse">
              <thead className="sticky top-0 z-10 bg-white">
                <tr className="border-b border-slate-300 text-left text-slate-900">
                  <th className="py-3 pr-4 font-semibold">Item</th>
                  <th className="py-3 pr-4 font-semibold">Qty</th>
                  <th className="py-3 pr-4 font-semibold">Unit</th>
                  <th className="py-3 pr-4 font-semibold">Estimated MH</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 text-slate-800">{item.item_name}</td>
                    <td className="py-3 pr-4 text-slate-800">
                      <input
                        type="number"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          handleItemChange(index, 'quantity', e.target.value)
                        }
                        className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      />
                    </td>
                    <td className="py-3 pr-4 text-slate-800">
                      <input
                        value={item.unit}
                        onChange={(e) =>
                          handleItemChange(index, 'unit', e.target.value)
                        }
                        className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      />
                    </td>
                    <td className="py-3 pr-4 text-slate-800">
                      <input
                        type="number"
                        step="0.01"
                        value={item.estimated_mh}
                        onChange={(e) =>
                          handleItemChange(index, 'estimated_mh', e.target.value)
                        }
                        className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-8 flex items-center gap-4">
          <button
            type="submit"
            disabled={saving || !selectedProjectNumber}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Update'}
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
