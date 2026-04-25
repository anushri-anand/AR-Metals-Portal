'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import {
  getPackageOptions,
  getSelectedItem,
  getVariationOptions,
  type ProductionItemSelection,
  type ProductionProjectOption,
  updateProjectItemSelection,
} from '@/lib/production-selection'

type FormState = ProductionItemSelection & {
  date: string
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
  projectNumber: '',
  variationNumber: '',
  projectName: '',
  package: '',
  itemName: '',
  boqSn: '',
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

const stageFields: Array<{
  key:
    | 'cutting'
    | 'grooving'
    | 'bending'
    | 'fabrication'
    | 'welding'
    | 'finishing'
    | 'coating'
    | 'assembly'
    | 'installation'
  label: string
}> = [
  { key: 'cutting', label: 'Cutting' },
  { key: 'grooving', label: 'Grooving' },
  { key: 'bending', label: 'Bending' },
  { key: 'fabrication', label: 'Fabrication' },
  { key: 'welding', label: 'Welding' },
  { key: 'finishing', label: 'Finishing' },
  { key: 'coating', label: 'Coating' },
  { key: 'assembly', label: 'Assembly' },
  { key: 'installation', label: 'Installation' },
]

export default function WorkCompletionForm() {
  const [projectOptions, setProjectOptions] = useState<ProductionProjectOption[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadProjects() {
      try {
        const data = await fetchAPI('/production/project-details/options/')
        setProjectOptions(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load projects.')
      }
    }

    void loadProjects()
  }, [])

  const variationOptions = getVariationOptions(form, projectOptions)
  const packageOptions = getPackageOptions(form, projectOptions)
  const selectedItem = getSelectedItem(form, projectOptions)

  function handleSelectionChange(
    field: keyof ProductionItemSelection,
    value: string
  ) {
    setForm((prev) => ({
      ...prev,
      ...updateProjectItemSelection(prev, field, value, projectOptions),
    }))
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    setSaving(true)

    try {
      await fetchAPI('/production/status/work-completion/entry/', {
        method: 'POST',
        body: JSON.stringify({
          date: form.date,
          project_number: form.projectNumber,
          project_name: form.projectName,
          variation_number: form.variationNumber,
          package: form.package,
          cutting: form.cutting || '0',
          grooving: form.grooving || '0',
          bending: form.bending || '0',
          fabrication: form.fabrication || '0',
          welding: form.welding || '0',
          finishing: form.finishing || '0',
          coating: form.coating || '0',
          assembly: form.assembly || '0',
          installation: form.installation || '0',
        }),
      })

      setForm(initialForm)
      setMessage('Work completion saved successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save work completion.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Work Completion</h1>
        <p className="mt-2 text-slate-700">
          Enter stage-wise work completion for project packages.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
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

          <Field label="Project #">
            <select
              value={form.projectNumber}
              onChange={(e) => handleSelectionChange('projectNumber', e.target.value)}
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
              value={form.variationNumber}
              onChange={(e) =>
                handleSelectionChange('variationNumber', e.target.value)
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              disabled={!form.projectNumber && !form.projectName}
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
              value={form.projectName}
              onChange={(e) => handleSelectionChange('projectName', e.target.value)}
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
              value={form.package}
              onChange={(e) => handleSelectionChange('package', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              disabled={
                !form.projectNumber || Boolean(form.variationNumber) || packageOptions.length === 0
              }
            >
              <option value="">
                {form.variationNumber ? 'Variation item - no package' : 'Select package'}
              </option>
              {packageOptions.map((itemPackage) => (
                <option key={itemPackage} value={itemPackage}>
                  {itemPackage}
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

          {stageFields.map((stage) => (
            <StageField
              key={stage.key}
              label={stage.label}
              name={stage.key}
              value={form[stage.key]}
              onChange={handleChange}
            />
          ))}
        </div>

        <div className="mt-8 flex items-center gap-4">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
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
        step="any"
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
