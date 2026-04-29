'use client'

import { useEffect, useMemo, useState } from 'react'
import ProjectSelectFields from '@/components/project-select-fields'
import {
  ContractVariationLog,
  contractVariationStatusOptions,
  createContractVariationLog,
  getContractVariationLogs,
} from '@/lib/estimation-storage'
import {
  Field,
  formatVariationDate,
  getLatestVariationLog,
  getRfvOptionsForProject,
} from '../variation-log-shared'

export default function VariationLogStatusClient() {
  const [logs, setLogs] = useState<ContractVariationLog[]>([])
  const [projectNumber, setProjectNumber] = useState('')
  const [projectName, setProjectName] = useState('')
  const [rfvNumber, setRfvNumber] = useState('')
  const [statusValue, setStatusValue] = useState('To be Submitted')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadLogs() {
      try {
        setLogs(await getContractVariationLogs())
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load variation log status.'
        )
      }
    }

    loadLogs()
  }, [])

  const rfvOptions = useMemo(
    () => getRfvOptionsForProject(logs, projectNumber),
    [logs, projectNumber]
  )
  const latestLog = useMemo(
    () => getLatestVariationLog(logs, projectNumber, rfvNumber),
    [logs, projectNumber, rfvNumber]
  )

  useEffect(() => {
    setStatusValue(latestLog?.status || 'To be Submitted')
  }, [latestLog])

  function handleProjectChange(value: {
    projectNumber: string
    projectName: string
  }) {
    setProjectNumber(value.projectNumber)
    setProjectName(value.projectName)
    setRfvNumber('')
    setMessage('')
    setError('')
  }

  async function handleSaveStatus(e: React.FormEvent) {
    e.preventDefault()

    if (!latestLog) {
      setError('Select a saved Project # and RFV # before updating status.')
      return
    }

    setSaving(true)
    setMessage('')
    setError('')

    try {
      const savedLog = await createContractVariationLog({
        projectNumber: latestLog.projectNumber,
        projectName: latestLog.projectName,
        rfvNumber: latestLog.rfvNumber,
        clientVariationNumber: latestLog.clientVariationNumber,
        description: latestLog.description,
        documentRef: latestLog.documentRef,
        submittedAmount: latestLog.submittedAmount,
        armLetterRef: latestLog.armLetterRef,
        submittedDate: latestLog.submittedDate,
        approvedAmount: latestLog.approvedAmount,
        clientLetterRef: latestLog.clientLetterRef,
        approvedDate: latestLog.approvedDate,
        status: statusValue,
        remarks: latestLog.remarks,
      })

      setLogs((prev) => [savedLog, ...prev])
      setMessage('Variation status updated.')
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to update variation status.'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Variation Log Status</h1>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>

      <form
        onSubmit={handleSaveStatus}
        className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ProjectSelectFields
            projectNumber={projectNumber}
            projectName={projectName}
            onChange={handleProjectChange}
          />

          <Field label="RFV #">
            <select
              value={rfvNumber}
              onChange={(e) => setRfvNumber(e.target.value)}
              className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 ${
                rfvNumber ? 'text-black' : 'text-neutral-400'
              }`}
            >
              <option value="">Select RFV #</option>
              {rfvOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {latestLog ? (
          <>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <Field label="Client Variation #">
                <input
                  value={latestLog.clientVariationNumber || '-'}
                  readOnly
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
                />
              </Field>

              <Field label="Submitted Amount">
                <input
                  value={String(latestLog.submittedAmount || 0)}
                  readOnly
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
                />
              </Field>

              <Field label="Approved Amount">
                <input
                  value={String(latestLog.approvedAmount || 0)}
                  readOnly
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
                />
              </Field>

              <Field label="Submitted Date">
                <input
                  value={formatVariationDate(latestLog.submittedDate)}
                  readOnly
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
                />
              </Field>

              <Field label="Approved Date">
                <input
                  value={formatVariationDate(latestLog.approvedDate)}
                  readOnly
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
                />
              </Field>

              <Field label="Document Ref">
                <input
                  value={latestLog.documentRef || '-'}
                  readOnly
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
                />
              </Field>

              <Field label="ARM/AKR Letter Ref">
                <input
                  value={latestLog.armLetterRef || '-'}
                  readOnly
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
                />
              </Field>

              <Field label="Client Letter Ref">
                <input
                  value={latestLog.clientLetterRef || '-'}
                  readOnly
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
                />
              </Field>

              <Field label="Status">
                <select
                  value={statusValue}
                  onChange={(e) => setStatusValue(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                >
                  {contractVariationStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="space-y-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save Status'}
              </button>
              {message && <p className="text-sm text-green-700">{message}</p>}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">
            Select Project # and RFV # to change the latest saved variation status.
          </p>
        )}
      </form>
    </div>
  )
}
