'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchAPI } from '@/lib/api'

type ProjectItem = {
  itemName: string
  quantity: string
  unit: string
  estimatedMh: string
}

type FormState = {
  projectName: string
  projectNumber: string
  numberOfItems: string
  items: ProjectItem[]
}

const initialForm: FormState = {
  projectName: '',
  projectNumber: '',
  numberOfItems: '',
  items: [],
}

function createEmptyItem(): ProjectItem {
  return {
    itemName: '',
    quantity: '',
    unit: '',
    estimatedMh: '',
  }
}

export default function ProjectDetailsEntryForm() {
  const router = useRouter()

  const [form, setForm] = useState<FormState>(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleNumberOfItemsChange(value: string) {
    const itemCount = Number(value || 0)

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
    field: keyof ProjectItem,
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
      await fetchAPI('/production/project-details/entry/', {
        method: 'POST',
        body: JSON.stringify({
          project_name: form.projectName,
          project_number: form.projectNumber,
          items: form.items.map((item) => ({
            item_name: item.itemName,
            quantity: item.quantity,
            unit: item.unit,
            estimated_mh: item.estimatedMh,
          })),
        }),
      })

      setForm(initialForm)
      setMessage('Project details saved successfully.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to save project details.'
      )
    } finally {
      setSaving(false)
    }
  }

  function handleGoToUpdate() {
    router.push('/production/project-details/update')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Project Details Entry</h1>
        <p className="mt-2 text-slate-700">
          Enter project details and item-wise estimated man-hours.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Project Name">
            <input
              name="projectName"
              value={form.projectName}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter project name"
              required
            />
          </Field>

          <Field label="Project #">
            <input
              name="projectNumber"
              value={form.projectNumber}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter project number"
              required
            />
          </Field>

          <Field label="No. of Items">
            <input
              type="number"
              min="1"
              name="numberOfItems"
              value={form.numberOfItems}
              onChange={(e) => handleNumberOfItemsChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter number of items"
              required
            />
          </Field>
        </div>

        {form.items.length > 0 && (
          <div className="mt-8 space-y-6">
            {form.items.map((item, index) => (
              <div key={index} className="rounded-xl border border-slate-200 p-6">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">
                  Item {index + 1}
                </h2>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Item">
                    <input
                      value={item.itemName}
                      onChange={(e) =>
                        handleItemChange(index, 'itemName', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="Enter item"
                      required
                    />
                  </Field>

                  <Field label="Qty">
                    <input
                      type="number"
                      step="0.01"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, 'quantity', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="Enter quantity"
                      required
                    />
                  </Field>

                  <Field label="Unit">
                    <input
                      value={item.unit}
                      onChange={(e) =>
                        handleItemChange(index, 'unit', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="Enter unit"
                      required
                    />
                  </Field>

                  <Field label="Estimated MH">
                    <input
                      type="number"
                      step="0.01"
                      value={item.estimatedMh}
                      onChange={(e) =>
                        handleItemChange(index, 'estimatedMh', e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                      placeholder="Enter estimated MH"
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
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>

          <button
            type="button"
            onClick={handleGoToUpdate}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50"
          >
            Update
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
