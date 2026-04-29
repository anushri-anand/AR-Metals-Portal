'use client'

import { useEffect, useMemo, useState } from 'react'
import ProjectSelectFields from '@/components/project-select-fields'
import { ContractVariationLog, formatMoney, getContractVariationLogs } from '@/lib/estimation-storage'
import {
  buildVariationSummaryRows,
  Field,
  formatVariationDate,
  getLatestVariationLog,
  getRfvOptionsForProject,
} from '../variation-log-shared'

export default function VariationLogViewClient() {
  const [logs, setLogs] = useState<ContractVariationLog[]>([])
  const [projectNumber, setProjectNumber] = useState('')
  const [projectName, setProjectName] = useState('')
  const [rfvNumber, setRfvNumber] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadLogs() {
      try {
        setLogs(await getContractVariationLogs())
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load variation log view.'
        )
      }
    }

    loadLogs()
  }, [])

  const projectLogs = useMemo(
    () =>
      projectNumber
        ? logs.filter((log) => log.projectNumber === projectNumber)
        : logs,
    [logs, projectNumber]
  )
  const rfvOptions = useMemo(
    () => getRfvOptionsForProject(logs, projectNumber),
    [logs, projectNumber]
  )
  const latestLog = useMemo(
    () => getLatestVariationLog(logs, projectNumber, rfvNumber),
    [logs, projectNumber, rfvNumber]
  )
  const summaryRows = useMemo(
    () => buildVariationSummaryRows(projectLogs),
    [projectLogs]
  )

  function handleProjectChange(value: {
    projectNumber: string
    projectName: string
  }) {
    setProjectNumber(value.projectNumber)
    setProjectName(value.projectName)
    setRfvNumber('')
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Variation Log View</h1>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
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
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Latest Saved Entry</h2>
        </div>
        <div className="max-h-[55vh] w-full overflow-auto">
          <table className="min-w-[1600px] divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Project #</th>
                <th className="px-4 py-3 font-semibold">Project Name</th>
                <th className="px-4 py-3 font-semibold">RFV #</th>
                <th className="px-4 py-3 font-semibold">Client Variation #</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Document Ref</th>
                <th className="px-4 py-3 font-semibold">Submitted Amount</th>
                <th className="px-4 py-3 font-semibold">ARM/AKR Letter Ref</th>
                <th className="px-4 py-3 font-semibold">Submitted Date</th>
                <th className="px-4 py-3 font-semibold">Approved Amount</th>
                <th className="px-4 py-3 font-semibold">Client Letter Ref</th>
                <th className="px-4 py-3 font-semibold">Approved Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {latestLog ? (
                <tr>
                  <td className="px-4 py-3 text-slate-900">{latestLog.projectNumber}</td>
                  <td className="px-4 py-3 text-slate-700">{latestLog.projectName}</td>
                  <td className="px-4 py-3 text-slate-700">{latestLog.rfvNumber || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {latestLog.clientVariationNumber || '-'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{latestLog.description || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{latestLog.documentRef || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{formatMoney(latestLog.submittedAmount)}</td>
                  <td className="px-4 py-3 text-slate-700">{latestLog.armLetterRef || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{formatVariationDate(latestLog.submittedDate)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatMoney(latestLog.approvedAmount)}</td>
                  <td className="px-4 py-3 text-slate-700">{latestLog.clientLetterRef || '-'}</td>
                  <td className="px-4 py-3 text-slate-700">{formatVariationDate(latestLog.approvedDate)}</td>
                  <td className="px-4 py-3 text-slate-700">{latestLog.status}</td>
                  <td className="px-4 py-3 text-slate-700">{latestLog.remarks || '-'}</td>
                </tr>
              ) : (
                <tr>
                  <td className="px-4 py-6 text-center text-slate-500" colSpan={14}>
                    Select Project # and RFV # to view the latest saved variation log entry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
        </div>
        <div className="max-h-[45vh] w-full overflow-auto">
          <table className="min-w-[760px] divide-y divide-slate-200 text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">SN</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Submitted Amount</th>
                <th className="px-4 py-3 font-semibold">Approved Amount</th>
                <th className="px-4 py-3 font-semibold">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summaryRows.map((row, index) => (
                <tr key={row.status}>
                  <td className="px-4 py-3 text-slate-900">{index + 1}</td>
                  <td className="px-4 py-3 text-slate-700">{row.status}</td>
                  <td className="px-4 py-3 text-slate-700">{formatMoney(row.submittedAmount)}</td>
                  <td className="px-4 py-3 text-slate-700">{formatMoney(row.approvedAmount)}</td>
                  <td className="px-4 py-3 text-slate-700">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
