'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import {
  getBoqSnOptions,
  getItemNameOptions,
  getPackageOptions,
  getSelectedItem,
  getVariationOptions,
  type ProductionItemSelection,
  type ProductionProjectOption,
  updateProjectItemSelection,
} from '@/lib/production-selection'

type FormState = ProductionItemSelection & {
  date: string
  deliveryNoteNumber: string
  quantity: string
}

const initialForm: FormState = {
  date: '',
  projectNumber: '',
  variationNumber: '',
  projectName: '',
  package: '',
  itemName: '',
  boqSn: '',
  deliveryNoteNumber: '',
  quantity: '',
}

export default function DeliveryForm() {
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
  const itemNameOptions = getItemNameOptions(form, projectOptions)
  const boqSnOptions = getBoqSnOptions(form, projectOptions)
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
      await fetchAPI('/production/status/delivery/entry/', {
        method: 'POST',
        body: JSON.stringify({
          date: form.date,
          project_number: form.projectNumber,
          project_name: form.projectName,
          variation_number: form.variationNumber,
          item_name: form.itemName,
          boq_sn: form.boqSn,
          delivery_note_number: form.deliveryNoteNumber,
          quantity: form.quantity,
        }),
      })

      setForm(initialForm)
      setMessage('Delivery saved successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save delivery.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Delivery</h1>
        <p className="mt-2 text-slate-700">
          Enter delivery details for project items.
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

          <Field label="Item">
            <select
              value={form.itemName}
              onChange={(e) => handleSelectionChange('itemName', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
              disabled={!form.projectNumber && !form.projectName}
            >
              <option value="">Select item</option>
              {itemNameOptions.map((itemName) => (
                <option key={itemName} value={itemName}>
                  {itemName}
                </option>
              ))}
            </select>
          </Field>

          <Field label="BOQ SN">
            <select
              value={form.boqSn}
              onChange={(e) => handleSelectionChange('boqSn', e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required={!form.variationNumber && boqSnOptions.length > 1}
              disabled={!form.itemName || Boolean(form.variationNumber)}
            >
              <option value="">
                {form.variationNumber ? 'Variation item - no BOQ SN' : 'Select BOQ SN'}
              </option>
              {boqSnOptions.map((boqSn) => (
                <option key={boqSn} value={boqSn}>
                  {boqSn}
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

          <Field label="Delivery Note No.">
            <input
              name="deliveryNoteNumber"
              value={form.deliveryNoteNumber}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter delivery note number"
              required
            />
          </Field>

          <Field label="Quantity">
            <input
              type="number"
              step="any"
              min="0"
              name="quantity"
              value={form.quantity}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter delivered quantity"
              required
            />
          </Field>
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
