'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type VariationItem = {
  item_name: string
  quantity: string
  unit: string
  estimated_mh: string
}

type SavedVariationItem = VariationItem & {
  id: number
}

type SavedVariation = {
  id: number
  project_number: string
  project_name: string
  variation_number: string
  items: SavedVariationItem[]
}

type ProjectOption = {
  id: number
  project_name: string
  project_number: string
}

type FormState = {
  variationNumber: string
  projectNumber: string
  projectName: string
  numberOfItems: string
  items: VariationItem[]
}

const initialForm: FormState = {
  variationNumber: '',
  projectNumber: '',
  projectName: '',
  numberOfItems: '',
  items: [],
}

function createEmptyItem(): VariationItem {
  return {
    item_name: '',
    quantity: '',
    unit: '',
    estimated_mh: '',
  }
}

export default function ProjectDetailsVariationForm() {
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [savedVariations, setSavedVariations] = useState<SavedVariation[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [projectData, variationData] = await Promise.all([
          fetchAPI('/production/project-details/options/'),
          fetchAPI('/production/project-details/variation/'),
        ])

        setProjects(projectData)
        setSavedVariations(variationData)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load variation options.'
        )
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  function handleProjectNumberChange(value: string) {
    const selectedProject = projects.find(
      (project) => project.project_number === value
    )

    setForm((prev) => ({
      ...prev,
      projectNumber: value,
      projectName: selectedProject ? selectedProject.project_name : '',
    }))
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

  function handleNumberOfItemsChange(value: string) {
    const itemCount = Math.max(0, Math.trunc(Number(value || 0)))

    setForm((prev) => ({
      ...prev,
      numberOfItems: value,
      items:
        itemCount > 0
          ? Array.from(
              { length: itemCount },
              (_, index) => prev.items[index] || createEmptyItem()
            )
          : [],
    }))
  }

  function handleItemChange(
    index: number,
    field: keyof VariationItem,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)

    try {
      const savedVariation = await fetchAPI('/production/project-details/variation/', {
        method: 'POST',
        body: JSON.stringify({
          variation_number: form.variationNumber,
          project_number: form.projectNumber,
          items: form.items,
        }),
      })

      setSavedVariations((prev) => [...prev, savedVariation])
      setForm(initialForm)
      setMessage('Project variation saved successfully.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save project variation.'
      )
    } finally {
      setSaving(false)
    }
  }

  const selectedProjectVariations = savedVariations.filter(
    (variation) =>
      !form.projectNumber || variation.project_number === form.projectNumber
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Project Variation</h1>
        <p className="mt-2 text-slate-700">
          Add variation items against an existing project.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Variation #">
            <input
              name="variationNumber"
              value={form.variationNumber}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter variation number"
              required
            />
          </Field>

          <Field label="Project #">
            <select
              value={form.projectNumber}
              onChange={(e) => handleProjectNumberChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            >
              <option value="">
                {loading ? 'Loading projects...' : 'Select project #'}
              </option>
              {projects.map((project) => (
                <option key={project.id} value={project.project_number}>
                  {project.project_number}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Project Name">
            <input
              value={form.projectName}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
              placeholder="Project name"
            />
          </Field>

          <Field label="No. of Items">
            <input
              type="number"
              min="1"
              value={form.numberOfItems}
              onChange={(e) => handleNumberOfItemsChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter number of items"
              required
            />
          </Field>
        </div>

        {form.items.length > 0 ? (
          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
            <div className="max-h-[60vh] overflow-auto">
              <table className="min-w-[760px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
                  <tr>
                    <HeaderCell>Item</HeaderCell>
                    <HeaderCell>Qty</HeaderCell>
                    <HeaderCell>Unit</HeaderCell>
                    <HeaderCell>Estimated MH</HeaderCell>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, index) => (
                    <tr key={`variation-item-${index}`} className="border-b border-slate-200">
                      <BodyCell>
                        <input
                          value={item.item_name}
                          onChange={(e) =>
                            handleItemChange(index, 'item_name', e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          placeholder={`Item ${index + 1}`}
                          required
                        />
                      </BodyCell>
                      <BodyCell>
                        <input
                          type="number"
                          step="any"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, 'quantity', e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          required
                        />
                      </BodyCell>
                      <BodyCell>
                        <input
                          value={item.unit}
                          onChange={(e) =>
                            handleItemChange(index, 'unit', e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          required
                        />
                      </BodyCell>
                      <BodyCell>
                        <input
                          type="number"
                          step="0.01"
                          value={item.estimated_mh}
                          onChange={(e) =>
                            handleItemChange(index, 'estimated_mh', e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          required
                        />
                      </BodyCell>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="mt-8 space-y-3">
          <button
            type="submit"
            disabled={saving || !form.projectNumber || form.items.length === 0}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          {message ? <p className="text-sm text-green-700">{message}</p> : null}
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Saved Variations
          </h2>
        </div>
        <div className="max-h-[65vh] overflow-auto">
              <table className="min-w-[1080px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
                  <tr>
                    <HeaderCell>Project #</HeaderCell>
                    <HeaderCell>Project Name</HeaderCell>
                    <HeaderCell>Variation #</HeaderCell>
                    <HeaderCell>Item</HeaderCell>
                    <HeaderCell>Qty</HeaderCell>
                <HeaderCell>Unit</HeaderCell>
                <HeaderCell>Estimated MH</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {selectedProjectVariations.length === 0 ? (
                <tr>
                  <BodyCell colSpan={7}>No variations found.</BodyCell>
                </tr>
              ) : (
                selectedProjectVariations.flatMap((variation) =>
                  variation.items.map((item, index) => (
                    <tr key={`${variation.id}-${item.id}`} className="border-b border-slate-200">
                      <BodyCell>{index === 0 ? variation.project_number : ''}</BodyCell>
                      <BodyCell>{index === 0 ? variation.project_name : ''}</BodyCell>
                      <BodyCell>
                        {index === 0 ? variation.variation_number : ''}
                      </BodyCell>
                      <BodyCell>{item.item_name}</BodyCell>
                      <BodyCell>{item.quantity}</BodyCell>
                      <BodyCell>{item.unit}</BodyCell>
                      <BodyCell>{item.estimated_mh}</BodyCell>
                    </tr>
                  ))
                )
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
      <label className="mb-1 block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
    </div>
  )
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return <th className="border-b border-r border-slate-200 px-4 py-3 font-semibold">{children}</th>
}

function BodyCell({
  children,
  colSpan,
}: {
  children: React.ReactNode
  colSpan?: number
}) {
  return (
    <td className="border-r border-slate-200 px-4 py-3 align-top text-slate-700" colSpan={colSpan}>
      {children}
    </td>
  )
}
