'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type ProjectItem = {
  id: number
  item_name: string
  quantity: string
  unit: string
}

type ProjectOption = {
  id: number
  project_name: string
  project_number: string
  items: ProjectItem[]
}

type FormState = {
  date: string
  projectName: string
  itemName: string
  cutting: string
  grooving: string
  bending: string
  fabrication: string
  welding: string
  finishing: string
  coating: string
  assembly: string
  installation: string
}

const initialForm: FormState = {
  date: '',
  projectName: '',
  itemName: '',
  cutting: '',
  grooving: '',
  bending: '',
  fabrication: '',
  welding: '',
  finishing: '',
  coating: '',
  assembly: '',
  installation: '',
}

export default function WorkCompletionForm() {
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await fetchAPI('/production/project-details/options/')
        setProjectOptions(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects.')
      }
    }

    loadProjects()
  }, [])

  const selectedProject = projectOptions.find(
    (project) => project.project_name === form.projectName
  )

  const itemOptions = selectedProject ? selectedProject.items : []

  const selectedItem = useMemo(() => {
    return itemOptions.find((item) => item.item_name === form.itemName)
  }, [itemOptions, form.itemName])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
      itemName: name === 'projectName' ? '' : prev.itemName,
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('Work completion form structure is ready. Backend save will be connected next.')
    console.log({
      ...form,
      totalQuantity: selectedItem?.quantity || '',
      unit: selectedItem?.unit || '',
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Work Completion</h1>
        <p className="mt-2 text-slate-700">
          Enter stage-wise work completion for project items.
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

          <Field label="Project Name">
            <select
              name="projectName"
              value={form.projectName}
              onChange={handleChange}
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
              name="itemName"
              value={form.itemName}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
              disabled={!form.projectName}
            >
              <option value="">Select item</option>
              {itemOptions.map((item) => (
                <option key={item.id} value={item.item_name}>
                  {item.item_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Total Quantity">
            <input
              value={selectedItem?.quantity || ''}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <Field label="Unit">
            <input
              value={selectedItem?.unit || ''}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <StageField label="Cutting" name="cutting" value={form.cutting} onChange={handleChange} />
          <StageField label="Grooving" name="grooving" value={form.grooving} onChange={handleChange} />
          <StageField label="Bending" name="bending" value={form.bending} onChange={handleChange} />
          <StageField label="Fabrication" name="fabrication" value={form.fabrication} onChange={handleChange} />
          <StageField label="Welding" name="welding" value={form.welding} onChange={handleChange} />
          <StageField label="Finishing" name="finishing" value={form.finishing} onChange={handleChange} />
          <StageField label="Coating" name="coating" value={form.coating} onChange={handleChange} />
          <StageField label="Assembly" name="assembly" value={form.assembly} onChange={handleChange} />
          <StageField label="Installation" name="installation" value={form.installation} onChange={handleChange} />
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

function StageField({
  label,
  name,
  value,
  onChange,
}: {
  label: string
  name: keyof FormState
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        step="0.01"
        min="0"
        name={name}
        value={value}
        onChange={onChange}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
        placeholder={`Enter ${label.toLowerCase()}`}
      />
    </Field>
  )
}
