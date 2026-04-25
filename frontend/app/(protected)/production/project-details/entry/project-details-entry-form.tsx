'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchAPI } from '@/lib/api'
import { findNextDocumentNumber } from '@/lib/document-numbering'

type TenderItem = {
  package: string
  item_name: string
  quantity: string
  unit: string
  estimated_mh: string
}

type TenderOption = {
  tender_number: string
  revision_number: string
  project_name: string
  number_of_items: number
  items: TenderItem[]
}

type ExistingProject = {
  project_number: string
}

type FormState = {
  tenderNumber: string
  revisionNumber: string
  projectName: string
  projectNumber: string
  contractPoRef: string
  numberOfItems: string
  items: TenderItem[]
}

const initialForm: FormState = {
  tenderNumber: '',
  revisionNumber: '',
  projectName: '',
  projectNumber: '',
  contractPoRef: '',
  numberOfItems: '',
  items: [],
}

export default function ProjectDetailsEntryForm() {
  const router = useRouter()

  const [form, setForm] = useState<FormState>(initialForm)
  const [tenderOptions, setTenderOptions] = useState<TenderOption[]>([])
  const [existingProjectNumbers, setExistingProjectNumbers] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadTenderOptions() {
      setLoading(true)
      setError('')

      try {
        const [tenderData, projectData] = await Promise.all([
          fetchAPI('/production/project-details/tender-options/'),
          fetchAPI('/production/project-details/'),
        ])
        setTenderOptions(tenderData)
        const nextProjectNumbers = Array.isArray(projectData)
          ? projectData.map((project: ExistingProject) => String(project.project_number || ''))
          : []
        setExistingProjectNumbers(nextProjectNumbers)
        setForm((prev) => ({
          ...prev,
          projectNumber: prev.projectNumber || findNextDocumentNumber(nextProjectNumbers, 'PR'),
        }))
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load tender details.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadTenderOptions()
  }, [])

  function handleProjectNumberChange(value: string) {
    setForm((prev) => ({
      ...prev,
      projectNumber: value,
    }))
  }

  function handleTenderChange(value: string) {
    const selectedTender = tenderOptions.find(
      (option) => option.tender_number === value
    )

    setForm((prev) => ({
      ...prev,
      tenderNumber: value,
      revisionNumber: selectedTender?.revision_number || '',
      projectName: selectedTender?.project_name || '',
      numberOfItems: selectedTender ? String(selectedTender.number_of_items) : '',
      items: selectedTender?.items || [],
    }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)

    try {
      const savedProject = await fetchAPI('/production/project-details/entry/', {
        method: 'POST',
        body: JSON.stringify({
          tender_number: form.tenderNumber,
          project_number: form.projectNumber,
          contract_po_ref: form.contractPoRef,
        }),
      })

      const nextProjectNumbers = [
        ...existingProjectNumbers.filter((value) => value !== savedProject.project_number),
        String(savedProject.project_number || ''),
      ]
      setExistingProjectNumbers(nextProjectNumbers)
      setForm({
        ...initialForm,
        projectNumber: findNextDocumentNumber(nextProjectNumbers, 'PR'),
      })
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
          Select a tender and pull the latest costing revision into project
          details. Only the project number is entered manually.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Tender #">
            <select
              value={form.tenderNumber}
              onChange={(e) => handleTenderChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            >
              <option value="">
                {loading ? 'Loading tenders...' : 'Select tender #'}
              </option>
              {tenderOptions.map((option) => (
                <option key={option.tender_number} value={option.tender_number}>
                  {option.tender_number}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Revision #">
            <input
              value={form.revisionNumber}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
              placeholder="R0"
            />
          </Field>

          <Field label="Project Name">
            <input
              value={form.projectName}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
              placeholder="Project name from tender"
            />
          </Field>

          <Field label="Project #">
            <input
              value={form.projectNumber}
              onChange={(e) => handleProjectNumberChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter project number"
              required
            />
          </Field>

          <Field label="Contract / PO Ref">
            <input
              value={form.contractPoRef}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  contractPoRef: e.target.value,
                }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter contract / PO ref"
            />
          </Field>

          <Field label="No. of Items">
            <input
              value={form.numberOfItems}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
              placeholder="No. of items"
            />
          </Field>
        </div>

        {form.items.length > 0 && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200">
            <div className="max-h-[60vh] w-full max-w-full overflow-auto">
              <table className="min-w-[860px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-700">
                  <tr className="border-b border-slate-300">
                    <th className="border border-slate-300 px-4 py-3 font-semibold">
                      Package
                    </th>
                    <th className="border border-slate-300 px-4 py-3 font-semibold">
                      Item
                    </th>
                    <th className="border border-slate-300 px-4 py-3 font-semibold">
                      Qty
                    </th>
                    <th className="border border-slate-300 px-4 py-3 font-semibold">
                      Unit
                    </th>
                    <th className="border border-slate-300 px-4 py-3 font-semibold">
                      Estimated MH
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {form.items.map((item, index) => (
                    <tr key={`${item.item_name}-${index}`}>
                      <td className="border border-slate-200 px-4 py-3 text-slate-700">
                        {item.package || '-'}
                      </td>
                      <td className="border border-slate-200 px-4 py-3 text-slate-900">
                        {item.item_name}
                      </td>
                      <td className="border border-slate-200 px-4 py-3 text-slate-700">
                        {item.quantity}
                      </td>
                      <td className="border border-slate-200 px-4 py-3 text-slate-700">
                        {item.unit}
                      </td>
                      <td className="border border-slate-200 px-4 py-3 text-slate-700">
                        {item.estimated_mh}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && form.tenderNumber && form.items.length === 0 && (
          <p className="mt-8 text-sm text-amber-700">
            No items were found in the latest costing revision for this tender.
          </p>
        )}

        <div className="mt-8 flex items-center gap-4">
          <button
            type="submit"
            disabled={saving || !form.tenderNumber || form.items.length === 0}
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
