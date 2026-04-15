'use client'

import { useEffect, useState } from 'react'
import {
  TenderLog,
  getTenderLogs,
  tenderStatusOptions,
  updateTenderLog,
} from '@/lib/estimation-storage'

const initialForm = {
  quoteRef: '',
  revisionNumber: '',
  revisionDate: '',
  description: '',
  sellingAmount: '',
  tenderDate: '',
  status: 'Under Pricing',
  remarks: '',
}

export default function TenderLogUpdateClient() {
  const [tenders, setTenders] = useState<TenderLog[]>([])
  const [selectedTenderNumber, setSelectedTenderNumber] = useState('')
  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadTenders() {
      try {
        const savedTenders = await getTenderLogs()
        const sortedTenders = [...savedTenders].sort(sortTenders)

        setTenders(sortedTenders)
        if (sortedTenders[0]) {
          setSelectedTenderNumber(sortedTenders[0].tenderNumber)
          setForm(createForm(sortedTenders[0]))
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tenders.')
      }
    }

    loadTenders()
  }, [])

  const selectedTender = tenders.find(
    (tender) => tender.tenderNumber === selectedTenderNumber
  )

  function handleTenderChange(value: string) {
    const tender = tenders.find((item) => item.tenderNumber === value)

    setSelectedTenderNumber(value)
    setForm(tender ? createForm(tender) : initialForm)
    setMessage('')
    setError('')
  }

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = e.target

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedTender) {
      setError('Select a tender before updating.')
      return
    }

    setMessage('')
    setError('')
    setSaving(true)

    try {
      const updatedTender = await updateTenderLog(selectedTender.id, {
        quoteRef: form.quoteRef.trim(),
        revisionNumber: form.revisionNumber.trim(),
        revisionDate: form.revisionDate || null,
        description: form.description.trim(),
        sellingAmount: Number(form.sellingAmount || 0),
        tenderDate: form.tenderDate || null,
        status: form.status,
        remarks: form.remarks.trim(),
      })

      setTenders((prev) =>
        prev.map((tender) =>
          String(tender.id) === String(updatedTender.id) ? updatedTender : tender
        )
      )
      setMessage(`Tender ${updatedTender.tenderNumber} updated.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tender.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Update Submitted Tender
        </h1>
        <p className="mt-2 text-slate-700">
          Select a submitted tender and update the fields that were optional
          during entry.
        </p>
        {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Tender Number">
            <select
              value={selectedTenderNumber}
              onChange={(event) => handleTenderChange(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            >
              <option value="">Select tender</option>
              {tenders.map((tender) => (
                <option key={tender.id} value={tender.tenderNumber}>
                  {tender.tenderNumber}
                </option>
              ))}
            </select>
          </Field>

          <ReadOnlyField label="Client Name" value={selectedTender?.clientName} />
          <ReadOnlyField label="Contact Name" value={selectedTender?.contactName} />
          <ReadOnlyField label="Project Name" value={selectedTender?.projectName} />
          <ReadOnlyField
            label="Project Location"
            value={selectedTender?.projectLocation}
          />
          <ReadOnlyField
            label="Tender Submission Date"
            value={selectedTender?.submissionDate}
          />

          <Field label="Quote Ref.">
            <input
              name="quoteRef"
              value={form.quoteRef}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter quote reference"
            />
          </Field>

          <Field label="Date">
            <input
              type="date"
              name="tenderDate"
              value={form.tenderDate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="Rev #">
            <input
              name="revisionNumber"
              value={form.revisionNumber}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Example: R0, R1"
            />
          </Field>

          <Field label="Rev Date">
            <input
              type="date"
              name="revisionDate"
              value={form.revisionDate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="Quote Amount">
            <input
              type="number"
              name="sellingAmount"
              value={form.sellingAmount}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              min="0"
              step="0.01"
            />
          </Field>

          <Field label="Status">
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              {tenderStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Description">
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            placeholder="Enter description"
          />
        </Field>

        <Field label="Remarks">
          <textarea
            name="remarks"
            value={form.remarks}
            onChange={handleChange}
            className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            placeholder="Enter remarks"
          />
        </Field>

        <button
          type="submit"
          disabled={saving || !selectedTender}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Updating...' : 'Update Tender'}
        </button>
      </form>
    </div>
  )
}

function sortTenders(a: TenderLog, b: TenderLog) {
  const aNumber = Number(a.tenderNumber)
  const bNumber = Number(b.tenderNumber)

  if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
    return aNumber - bNumber
  }

  return a.tenderNumber.localeCompare(b.tenderNumber)
}

function createForm(tender: TenderLog) {
  return {
    quoteRef: tender.quoteRef || '',
    revisionNumber: tender.revisionNumber || '',
    revisionDate: tender.revisionDate || '',
    description: tender.description || '',
    sellingAmount: String(tender.sellingAmount || ''),
    tenderDate: tender.tenderDate || '',
    status: tender.status || 'Under Pricing',
    remarks: tender.remarks || '',
  }
}

function ReadOnlyField({
  label,
  value,
}: {
  label: string
  value?: string | null
}) {
  return (
    <Field label={label}>
      <input
        value={value || ''}
        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
        readOnly
      />
    </Field>
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
