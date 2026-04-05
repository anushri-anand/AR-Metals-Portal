'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type ProjectItem = {
  id: number
  project_name: string
  item_name: string
}

export default function ProductionEntryForm() {
  const [projectItems, setProjectItems] = useState<ProjectItem[]>([])
  const [date, setDate] = useState('')
  const [projectName, setProjectName] = useState('')
  const [projectItemId, setProjectItemId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    cutting: '0',
    grooving: '0',
    bending: '0',
    fabrication: '0',
    welding: '0',
    finishing: '0',
    coating: '0',
    assembly: '0',
    installation: '0',
  })

  useEffect(() => {
    async function loadData() {
      try {
        const data = await fetchAPI('/master-data/project-items/')
        setProjectItems(data)
      } catch {
        setError('Failed to load project items.')
      }
    }

    loadData()
  }, [])

  const projectNames = [...new Set(projectItems.map((item) => item.project_name))]

  const filteredItems = projectName
    ? projectItems.filter((item) => item.project_name === projectName)
    : []

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  function handleProjectChange(value: string) {
    setProjectName(value)
    setProjectItemId('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
  
    try {
      await fetchAPI('/production/production-entries/', {
        method: 'POST',
        body: JSON.stringify({
          project_item: Number(projectItemId),
          date,
          cutting: Number(form.cutting),
          grooving: Number(form.grooving),
          bending: Number(form.bending),
          fabrication: Number(form.fabrication),
          welding: Number(form.welding),
          finishing: Number(form.finishing),
          coating: Number(form.coating),
          assembly: Number(form.assembly),
          installation: Number(form.installation),
        }),
      })
  
      setMessage('Production entry saved successfully.')
      setDate('')
      setProjectName('')
      setProjectItemId('')
      setForm({
        cutting: '0',
        grooving: '0',
        bending: '0',
        fabrication: '0',
        welding: '0',
        finishing: '0',
        coating: '0',
        assembly: '0',
        installation: '0',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save production entry.')
    }
  }
  
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
      <h1 className="text-2xl font-bold mb-2 text-slate-900">Add Production Entry</h1>
      <p className="text-slate-700 mb-6">
        Record production quantities for a selected project item.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">Project</label>
          <select
            value={projectName}
            onChange={(e) => handleProjectChange(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            required
          >
            <option value="">Select project</option>
            {projectNames.map((project) => (
              <option key={project} value={project}>
                {project}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-800 mb-1">Item</label>
          <select
            value={projectItemId}
            onChange={(e) => setProjectItemId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            required
          >
            <option value="">Select item</option>
            {filteredItems.map((item) => (
              <option key={item.id} value={item.id}>
                {item.item_name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Object.entries(form).map(([key, value]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-800 mb-1 capitalize">
                {key}
              </label>
              <input
                type="number"
                min="0"
                value={value}
                onChange={(e) => handleChange(key as keyof typeof form, e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400"
              />
            </div>
          ))}
        </div>

        <button
          type="submit"
          className="rounded-lg bg-slate-900 text-white px-4 py-2 hover:bg-slate-800"
        >
          Save Production Entry
        </button>

        {message && <p className="text-green-700">{message}</p>}
        {error && <p className="text-red-700">{error}</p>}
      </form>
    </div>
  )
}
