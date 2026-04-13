'use client'

import { useEffect, useState } from 'react'
import {
  ClientData,
  createTenderLog,
  getClientData,
  tenderStatusOptions,
} from '@/lib/estimation-storage'

const initialForm = {
  tenderNumber: '',
  tenderName: '',
  quoteRef: '',
  clientId: '',
  projectName: '',
  projectLocation: '',
  tenderDate: '',
  submissionDate: '',
  status: 'Under Pricing',
  remarks: '',
}

export default function TenderLogEntryClient() {
  const [clients, setClients] = useState<ClientData[]>([])
  const [form, setForm] = useState(initialForm)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadClients() {
      try {
        setClients(await getClientData())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load clients.')
      }
    }

    loadClients()
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

    try {
      await createTenderLog({
        tenderNumber: form.tenderNumber.trim(),
        tenderName: form.tenderName.trim(),
        quoteRef: form.quoteRef.trim(),
        clientId: form.clientId ? Number(form.clientId) : null,
        projectName: form.projectName.trim(),
        projectLocation: form.projectLocation.trim(),
        tenderDate: form.tenderDate || null,
        submissionDate: form.submissionDate || null,
        status: form.status,
        remarks: form.remarks.trim(),
      })

      setForm(initialForm)
      setMessage('Tender log saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save tender log.')
    }
  }

  const selectedClient = clients.find(
    (client) => String(client.id) === String(form.clientId)
  )

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

          <Field label="Tender Name">
            <input
              name="tenderName"
              value={form.tenderName}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter tender name"
            />
          </Field>

          <Field label="Client Name">
            <select
              name="clientId"
              value={form.clientId}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
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
            />
          </Field>

          <Field label="Project Name">
            <input
              name="projectName"
              value={form.projectName}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter project name"
            />
          </Field>

          <Field label="Project Location">
            <input
              name="projectLocation"
              value={form.projectLocation}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter project location"
            />
          </Field>

          <Field label="Tender Submission Date">
            <input
              type="date"
              name="submissionDate"
              value={form.submissionDate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
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
