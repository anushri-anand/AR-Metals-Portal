'use client'

import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import { createMasterListItem } from '@/lib/estimation-storage'
import {
  downloadCsvTemplate,
  MASTER_LIST_IMPORT_TEMPLATE_HEADERS,
} from '@/lib/import-templates'

type PurchaseOrderOption = {
  id: number
  po_number: string
}

const initialForm = {
  itemDescription: '',
  unit: '',
  rate: '',
  poRefNumber: '',
}

export default function MasterListEntryClient() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrderOption[]>([])
  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    async function loadPurchaseOrders() {
      try {
        const purchaseOrderData = await fetchAPI('/procurement/purchase-order/?status=approved')
        setPurchaseOrders(
          Array.isArray(purchaseOrderData) ? purchaseOrderData : []
        )
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load purchase orders.'
        )
      }
    }

    loadPurchaseOrders()
  }, [])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    try {
      await createMasterListItem({
        itemDescription: form.itemDescription.trim(),
        unit: form.unit.trim(),
        rate: Number(form.rate || 0),
        poRefNumber: form.poRefNumber,
      })

      setForm(initialForm)
      setMessage('Master list item saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save item.')
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''

    if (!file) return

    setImporting(true)
    setMessage('')
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      const data = await fetchAPI('/estimation/master-list/import/', {
        method: 'POST',
        body: formData,
      })

      setForm(initialForm)
      setMessage(`Imported ${Number(data?.count || 0)} master list row(s).`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import master list.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Master List Entry
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Item Description">
            <input
              name="itemDescription"
              value={form.itemDescription}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter item description"
              required
            />
          </Field>

          <Field label="Unit">
            <input
              name="unit"
              value={form.unit}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter unit"
              required
            />
          </Field>

          <Field label="Rate">
            <input
              type="number"
              step="0.01"
              name="rate"
              value={form.rate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter rate"
              required
            />
          </Field>

          <Field label="PO Ref #">
            <select
              name="poRefNumber"
              value={form.poRefNumber}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="">No PO Ref #</option>
              {purchaseOrders.map((po) => (
                <option key={po.id} value={po.po_number}>
                  {po.po_number}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <label className="cursor-pointer rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50">
            {importing ? 'Importing...' : 'Import Excel/CSV'}
            <input
              type="file"
              accept=".xlsx,.csv"
              onChange={handleImportFile}
              disabled={importing}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={() =>
              downloadCsvTemplate(
                'master-list-import-template.csv',
                MASTER_LIST_IMPORT_TEMPLATE_HEADERS
              )
            }
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Download Template
          </button>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            Save Item
          </button>

          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-amber-700">{error}</p>}
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
