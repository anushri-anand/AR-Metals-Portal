'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  ClientData,
  TenderLog,
  createTenderLog,
  getClientData,
  getTenderLogs,
  tenderStatusOptions,
} from '@/lib/estimation-storage'

const initialForm = {
  tenderNumber: '',
  quoteRef: '',
  revisionNumber: 'R0',
  revisionDate: '',
  clientId: '',
  projectName: '',
  projectLocation: '',
  description: '',
  sellingAmount: '',
  tenderDate: '',
  submissionDate: '',
  status: 'Under Pricing',
  remarks: '',
}

export default function TenderLogEntryClient() {
  const [clients, setClients] = useState<ClientData[]>([])
  const [tenders, setTenders] = useState<TenderLog[]>([])
  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [savedClients, savedTenders] = await Promise.all([
          getClientData(),
          getTenderLogs(),
        ])

        setClients(savedClients)
        setTenders(savedTenders)
        setForm((prev) => ({
          ...prev,
          tenderNumber: getNextTenderNumber(savedTenders),
        }))
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load tender data.'
        )
      }
    }

    loadInitialData()
  }, [])

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
    setError('')
    setMessage('')

    const selectedClient = getSelectedClient(clients, form.clientId)

    if (!selectedClient?.contactPerson.trim()) {
      setError('Contact name is required in Client Data before saving tender.')
      return
    }

    try {
      const savedTender = await createTenderLog({
        tenderNumber: form.tenderNumber.trim(),
        quoteRef: form.quoteRef.trim(),
        revisionNumber: form.revisionNumber.trim(),
        revisionDate: form.revisionDate || null,
        clientId: form.clientId ? Number(form.clientId) : null,
        projectName: form.projectName.trim(),
        projectLocation: form.projectLocation.trim(),
        description: form.description.trim(),
        sellingAmount: Number(form.sellingAmount || 0),
        tenderDate: form.tenderDate || null,
        submissionDate: form.submissionDate || null,
        status: form.status,
        remarks: form.remarks.trim(),
      })
      const nextTenders = [savedTender, ...tenders]

      setTenders(nextTenders)
      setForm({
        ...initialForm,
        tenderNumber: getNextTenderNumber(nextTenders),
      })
      setMessage('Tender log saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tender log.')
    }
  }

  const selectedClient = getSelectedClient(clients, form.clientId)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Tender Log Entry</h1>
        <p className="mt-2 text-slate-700">
          Save tender numbers here. Costing will use these tender numbers.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Tender Number">
            <input
              name="tenderNumber"
              value={form.tenderNumber}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter tender number"
              required
            />
          </Field>

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
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
              readOnly
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

          <Field label="Client Name">
            <select
              name="clientId"
              value={form.clientId}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            >
              <option value="">Select client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.clientName}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Contact Name">
            <input
              value={selectedClient?.contactPerson || ''}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
              placeholder="Auto-filled from client data"
              readOnly
              required
            />
          </Field>

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

          <Field label="Project Location">
            <input
              name="projectLocation"
              value={form.projectLocation}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter project location"
              required
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
              placeholder="Enter quote amount"
            />
          </Field>

          <Field label="Tender Submission Date">
            <input
              type="date"
              name="submissionDate"
              value={form.submissionDate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
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

        <div className="mt-6">
          <Field label="Description">
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter description"
            />
          </Field>
        </div>

        <div className="mt-6">
          <Field label="Remarks">
            <textarea
              name="remarks"
              value={form.remarks}
              onChange={handleChange}
              className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter remarks"
            />
          </Field>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            Save Tender
          </button>
          <Link
            href="/estimation/tender-log/update"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Update Submitted Tender
          </Link>
          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}
        </div>
      </form>
    </div>
  )
}

function getSelectedClient(clients: ClientData[], clientId: string) {
  return clients.find((client) => String(client.id) === String(clientId))
}

function getNextTenderNumber(tenders: TenderLog[]) {
  const numericTenderNumbers = tenders
    .map((tender) => Number(tender.tenderNumber))
    .filter((value) => Number.isInteger(value) && value > 0)

  if (numericTenderNumbers.length === 0) {
    return String(tenders.length + 1)
  }

  return String(Math.max(...numericTenderNumbers) + 1)
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
