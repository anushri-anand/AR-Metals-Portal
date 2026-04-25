'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import { getContractRevenues, getTenderLogs, TenderLog } from '@/lib/estimation-storage'

type BomalRow = {
  itemDescription: string
  unit: string
  estimatedQty: string
  wastagePercent: string
  qtyIncWastage: string
  estimatedRate: string
  estimatedAmount: string
  remarks: string
}

type BomalSection = {
  key: string
  title: string
  subtotal: string
  rows: BomalRow[]
}

type BomalReport = {
  company: string
  companyDisplayName: string
  projectName: string
  projectNumber: string
  tenderNumber: string
  revisionNumber: string
  sections: BomalSection[]
  totalAmount: string
}

type ProjectOption = {
  project_name: string
  project_number: string
  tender_number?: string
  revision_number?: string
}

type BomalOption = {
  tenderNumber: string
  projectName: string
  projectNumber: string
}

export default function BomalClient() {
  const [tenderNumber, setTenderNumber] = useState('')
  const [projectNumber, setProjectNumber] = useState('')
  const [projectName, setProjectName] = useState('')
  const [options, setOptions] = useState<BomalOption[]>([])
  const [report, setReport] = useState<BomalReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadOptions() {
      try {
        const [tenderLogs, projectOptions, contractRevenues] = await Promise.all([
          getTenderLogs(),
          fetchAPI('/production/project-details/options/').catch(() => [] as ProjectOption[]),
          getContractRevenues().catch(() => []),
        ])
        const nextOptions = buildBomalOptions(
          tenderLogs,
          Array.isArray(projectOptions) ? projectOptions : [],
          contractRevenues
        )
        setOptions(nextOptions)

        if (nextOptions.length > 0) {
          setTenderNumber((prev) => prev || nextOptions[0].tenderNumber)
          setProjectName((prev) => prev || nextOptions[0].projectName)
          setProjectNumber((prev) => prev || nextOptions[0].projectNumber)
        }
      } catch {
        setOptions([])
      }
    }

    void loadOptions()
  }, [])

  useEffect(() => {
    if (!tenderNumber) {
      setReport(null)
      setError('')
      return
    }

    async function loadReport() {
      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams({
          tender_number: tenderNumber,
          project_number: projectNumber,
          project_name: projectName,
        })
        const data = await fetchAPI(`/estimation/bomal/?${params.toString()}`)
        setReport(data)
      } catch (err) {
        setReport(null)
        setError(err instanceof Error ? err.message : 'Failed to load BOMAL report.')
      } finally {
        setLoading(false)
      }
    }

    void loadReport()
  }, [projectName, projectNumber, tenderNumber])

  const rowCount = useMemo(
    () => report?.sections.reduce((total, section) => total + section.rows.length, 0) ?? 0,
    [report]
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">BOMAL</h1>
        <p className="mt-2 text-slate-700">
          View the bill of materials and labours for the selected project.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Tender #
            </label>
            <select
              value={tenderNumber}
              onChange={(e) => {
                const selectedOption = options.find(
                  (option) => option.tenderNumber === e.target.value
                )
                setTenderNumber(e.target.value)
                setProjectName(selectedOption?.projectName || '')
                setProjectNumber(selectedOption?.projectNumber || '')
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="">Select tender #</option>
              {options.map((option) => (
                <option key={option.tenderNumber} value={option.tenderNumber}>
                  {option.tenderNumber}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Project Name
            </label>
            <input
              value={projectName}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
              placeholder="Project name from tender log"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Project #
            </label>
            <input
              value={projectNumber}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
              placeholder="Project number"
            />
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-8 py-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold uppercase tracking-wide text-slate-900">
              {report?.companyDisplayName || 'Bill Of Materials And Labours'}
            </h2>
            <p className="mt-2 text-base font-semibold uppercase text-slate-700">
              Bill Of Materials And Labours
            </p>
          </div>

          <div className="mt-6 grid gap-3 text-sm text-slate-800 md:grid-cols-2">
            <div>
              <span className="font-semibold">Project:</span>{' '}
              {report ? report.projectName : projectName || '-'}
            </div>
            <div>
              <span className="font-semibold">Job No:</span>{' '}
              {report ? report.projectNumber : projectNumber || '-'}
            </div>
            <div>
              <span className="font-semibold">Tender No:</span>{' '}
              {report?.tenderNumber || '-'}
            </div>
            <div>
              <span className="font-semibold">Revision No:</span>{' '}
              {report?.revisionNumber || '-'}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-slate-700">Loading BOMAL report...</div>
        ) : !tenderNumber ? (
          <div className="p-8 text-slate-700">
            Select a tender number to view the report.
          </div>
        ) : report ? (
          <div className="max-h-[72vh] overflow-auto">
            <table className="min-w-[1180px] border-collapse text-sm">
              <thead className="sticky top-0 z-20 bg-slate-100 text-slate-900">
                <tr>
                  <HeaderCell>Item Description</HeaderCell>
                  <HeaderCell>Unit</HeaderCell>
                  <HeaderCell>Estimated Qty</HeaderCell>
                  <HeaderCell>Wastage</HeaderCell>
                  <HeaderCell>Qty Inc. Wastage</HeaderCell>
                  <HeaderCell>Estimated Rate</HeaderCell>
                  <HeaderCell>Estimated Amount</HeaderCell>
                  <HeaderCell>Remarks</HeaderCell>
                </tr>
              </thead>

              <tbody>
                {report.sections.length > 0 ? (
                  report.sections.map((section) => (
                    <SectionBlock key={section.key} section={section} />
                  ))
                ) : (
                  <tr>
                    <td
                      className="border border-slate-300 px-4 py-6 text-center text-slate-600"
                      colSpan={8}
                    >
                      No saved costing data was found for this project yet.
                    </td>
                  </tr>
                )}
              </tbody>

              <tfoot className="sticky bottom-0 z-20 bg-slate-900 text-white">
                <tr>
                  <td className="border border-slate-300 px-4 py-4 text-lg font-bold" colSpan={6}>
                    TOTAL AMOUNT
                  </td>
                  <td className="border border-slate-300 px-4 py-4 text-right text-lg font-bold">
                    {formatMoney(report.totalAmount)}
                  </td>
                  <td className="border border-slate-300 px-4 py-4" />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-8 text-slate-700">No report found.</div>
        )}

        {report ? (
          <div className="border-t border-slate-200 px-8 py-4 text-sm text-slate-600">
            Showing {rowCount} {rowCount === 1 ? 'line item' : 'line items'} across{' '}
            {report.sections.length} {report.sections.length === 1 ? 'section' : 'sections'}.
          </div>
        ) : null}
      </div>
    </div>
  )
}

function buildBomalOptions(
  tenderLogs: TenderLog[],
  projectOptions: ProjectOption[],
  contractRevenues: Array<{ projectNumber: string; projectName: string }>
) {
  return tenderLogs
    .map((tender) => {
      const matchingProject =
        projectOptions.find((project) => project.tender_number === tender.tenderNumber) ||
        projectOptions.find((project) => project.project_name === tender.projectName)
      const matchingRevenue = contractRevenues.find(
        (revenue) => revenue.projectName === tender.projectName
      )

      return {
        tenderNumber: tender.tenderNumber,
        projectName: tender.projectName,
        projectNumber:
          matchingProject?.project_number ||
          matchingRevenue?.projectNumber ||
          '',
      }
    })
    .sort((left, right) => left.tenderNumber.localeCompare(right.tenderNumber))
}

function SectionBlock({ section }: { section: BomalSection }) {
  return (
    <>
      <tr className="bg-amber-100 font-semibold text-slate-900">
        <td className="border border-slate-300 px-4 py-3">{section.title}</td>
        <td className="border border-slate-300 px-4 py-3" />
        <td className="border border-slate-300 px-4 py-3" />
        <td className="border border-slate-300 px-4 py-3" />
        <td className="border border-slate-300 px-4 py-3" />
        <td className="border border-slate-300 px-4 py-3" />
        <td className="border border-slate-300 px-4 py-3 text-right font-bold">
          {formatMoney(section.subtotal)}
        </td>
        <td className="border border-slate-300 px-4 py-3" />
      </tr>

      {section.rows.map((row, index) => (
        <tr key={`${section.key}-${index}`} className="bg-white text-slate-800">
          <BodyCell>{row.itemDescription || '-'}</BodyCell>
          <BodyCell>{row.unit || '-'}</BodyCell>
          <BodyCell align="right">{formatQuantity(row.estimatedQty)}</BodyCell>
          <BodyCell align="right">
            {row.wastagePercent ? `${formatPercent(row.wastagePercent)}%` : '-'}
          </BodyCell>
          <BodyCell align="right">{formatQuantity(row.qtyIncWastage)}</BodyCell>
          <BodyCell align="right">{formatMoney(row.estimatedRate)}</BodyCell>
          <BodyCell align="right">{formatMoney(row.estimatedAmount)}</BodyCell>
          <BodyCell>{row.remarks || '-'}</BodyCell>
        </tr>
      ))}
    </>
  )
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="border border-slate-300 px-4 py-3 text-center font-semibold uppercase">
      {children}
    </th>
  )
}

function BodyCell({
  children,
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'right' | 'center'
}) {
  const alignmentClassName =
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'

  return (
    <td className={`border border-slate-300 px-4 py-2.5 ${alignmentClassName}`}>{children}</td>
  )
}

function formatMoney(value: string | number) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return '0.00'
  }

  return number.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatQuantity(value: string | number) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return '0'
  }

  return number.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  })
}

function formatPercent(value: string | number) {
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return '0'
  }

  return number.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}
