'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import {
  BoqItem,
  MasterListItem,
  TenderCosting,
  TenderLog,
  calculateCostSummary,
  createId,
  formatMoney,
  getBoqItems,
  getMasterListItems,
  getTenderCostings,
  getTenderLogs,
  saveBoqItems,
  updateBoqItem,
} from '@/lib/estimation-storage'

const frozenColumns = [
  { key: 'sn', width: 40, left: 0 },
  { key: 'clientsBoq', width: 96, left: 40 },
  { key: 'description', width: 260, left: 136 },
  { key: 'quantity', width: 70, left: 396 },
  { key: 'unit', width: 56, left: 466 },
  { key: 'details', width: 84, left: 522 },
] as const

const costColumnWidths = [
  120,
  120,
  140,
  140,
  120,
  100,
  90,
  130,
  135,
  100,
  110,
  100,
  115,
  125,
]
const tableWidth =
  frozenColumns.reduce((total, column) => total + column.width, 0) +
  costColumnWidths.reduce((total, width) => total + width, 0)

type NumericBoqField =
  | 'quantity'
  | 'freightCustomDutyPercent'
  | 'prelimsPercent'
  | 'fohPercent'
  | 'commitmentsPercent'
  | 'contingenciesPercent'
  | 'markup'

type PercentField = Exclude<NumericBoqField, 'quantity'>

function createEmptyRow(sn = '1'): BoqItem {
  return {
    id: createId('boq'),
    sn,
    tenderNumber: '',
    revisionNumber: '',
    revisionDate: null,
    clientsBoq: '',
    description: '',
    quantity: 0,
    unit: '',
    freightCustomDutyPercent: 0,
    prelimsPercent: 0,
    fohPercent: 0,
    commitmentsPercent: 0,
    contingenciesPercent: 0,
    markup: 0,
  }
}

export default function CostingClient() {
  const [allRows, setAllRows] = useState<BoqItem[]>([])
  const [rows, setRows] = useState<BoqItem[]>([createEmptyRow()])
  const [masterItems, setMasterItems] = useState<MasterListItem[]>([])
  const [costings, setCostings] = useState<TenderCosting[]>([])
  const [tenderLogs, setTenderLogs] = useState<TenderLog[]>([])
  const [selectedTenderNumber, setSelectedTenderNumber] = useState('')
  const [revisionNumber, setRevisionNumber] = useState('')
  const [revisionDate, setRevisionDate] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        const [
          savedBoqItems,
          savedMasterItems,
          savedCostings,
          savedTenderLogs,
        ] = await Promise.all([
          getBoqItems(),
          getMasterListItems(),
          getTenderCostings(),
          getTenderLogs(),
        ])
        const tenderNumbers = getTenderNumbers(savedBoqItems, savedTenderLogs)
        const firstTenderNumber = tenderNumbers[0] || ''
        const firstRevisionNumber = getFirstRevision(
          savedBoqItems,
          firstTenderNumber
        )
        const firstRevisionDate = getRevisionDate(
          savedBoqItems,
          firstTenderNumber,
          firstRevisionNumber
        )

        setAllRows(savedBoqItems)
        setMasterItems(savedMasterItems)
        setCostings(savedCostings)
        setTenderLogs(savedTenderLogs)
        setSelectedTenderNumber(firstTenderNumber)
        setRevisionNumber(firstRevisionNumber)
        setRevisionDate(firstRevisionDate)
        setRows(
          firstTenderNumber
            ? getRowsForTenderRevision(
                savedBoqItems,
                firstTenderNumber,
                firstRevisionNumber
              )
            : [createEmptyRow()]
        )
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load costing data.'
        )
      }
    }

    loadData()
  }, [])

  const tenderNumbers = getTenderNumbers(allRows, tenderLogs)

  function handleTenderChange(value: string) {
    const nextRevisionNumber = getFirstRevision(allRows, value)
    const nextRevisionDate = getRevisionDate(allRows, value, nextRevisionNumber)

    setSelectedTenderNumber(value)
    setRevisionNumber(nextRevisionNumber)
    setRevisionDate(nextRevisionDate)
    setRows(
      value
        ? getRowsForTenderRevision(allRows, value, nextRevisionNumber)
        : [createEmptyRow()]
    )
    setMessage('')
    setError('')
  }

  function handleRevisionChange(value: string) {
    setRevisionNumber(value)
    setRevisionDate(getRevisionDate(allRows, selectedTenderNumber, value))
    setRows(
      selectedTenderNumber
        ? getRowsForTenderRevision(allRows, selectedTenderNumber, value)
        : [createEmptyRow()]
    )
    setMessage('')
    setError('')
  }

  function handleRowChange(
    id: string | number,
    field: keyof BoqItem,
    value: string
  ) {
    setRows((prev) =>
      prev.map((row) =>
        String(row.id) === String(id)
          ? {
              ...row,
              [field]: isNumericBoqField(field) ? Number(value || 0) : value,
            }
          : row
      )
    )
  }

  function handleAddRow() {
    setRows((prev) => [
      ...prev,
      {
        ...createEmptyRow(String(prev.length + 1)),
        tenderNumber: selectedTenderNumber,
        revisionNumber,
        revisionDate: revisionDate || null,
      },
    ])
  }

  async function handleSaveBoq() {
    setError('')

    if (!selectedTenderNumber) {
      setError('Select a tender number before saving BOQ.')
      return
    }

    const rowsToSave = rows
      .filter((row) => row.clientsBoq || row.description || row.quantity || row.unit)
      .map((row, index) => ({
        ...row,
        sn: String(index + 1),
        tenderNumber: selectedTenderNumber,
        revisionNumber: revisionNumber.trim(),
        revisionDate: revisionDate || null,
      }))
    const rowsFromOtherTenderRevisions = allRows.filter(
      (row) =>
        row.tenderNumber !== selectedTenderNumber ||
        row.revisionNumber !== revisionNumber.trim()
    )

    try {
      const savedRows = await saveBoqItems([
        ...rowsFromOtherTenderRevisions,
        ...rowsToSave,
      ])
      const savedCurrentRows = getRowsForTenderRevision(
        savedRows,
        selectedTenderNumber,
        revisionNumber.trim()
      )

      setAllRows(savedRows)
      setRows(savedCurrentRows)
      setRevisionNumber(revisionNumber.trim())
      setMessage('Bill of Quantity saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save BOQ.')
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''

    if (!file) return

    if (!selectedTenderNumber) {
      setError('Select a tender number before importing.')
      return
    }

    setMessage('')
    setError('')
    setImporting(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const data = await fetchAPI('/estimation/boq-items/import/', {
        method: 'POST',
        body: formData,
      })
      const importedRows = (data.rows || []).map(
        (row: Partial<BoqItem>, index: number) => ({
          ...createEmptyRow(String(index + 1)),
          sn: row.sn || String(index + 1),
          tenderNumber: selectedTenderNumber,
          revisionNumber: revisionNumber.trim(),
          revisionDate: revisionDate || null,
          clientsBoq: row.clientsBoq || '',
          description: row.description || '',
          quantity: Number(row.quantity || 0),
          unit: row.unit || '',
        })
      )

      setRows(importedRows.length > 0 ? importedRows : [createEmptyRow()])
      setMessage(
        `Imported ${importedRows.length} BOQ row${
          importedRows.length === 1 ? '' : 's'
        }. Review the table, then click Save BOQ.`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import file.')
    } finally {
      setImporting(false)
    }
  }

  function handleExportBoq() {
    if (!selectedTenderNumber) {
      setError('Select a tender number before exporting.')
      return
    }

    const exportRows = [
      [
        'SN',
        "Client's BOQ",
        'Item Description',
        'Qty',
        'Unit',
        'Selling Rate',
        'Selling Amount',
      ],
      ...rows
        .filter((row) => row.clientsBoq || row.description || row.quantity || row.unit)
        .map((row, index) => {
          const summary = getRowSummary(row, costings, masterItems)

          return [
            row.sn || String(index + 1),
            row.clientsBoq,
            row.description,
            row.quantity,
            row.unit,
            summary ? formatMoney(summary.sellingRate) : '',
            summary ? formatMoney(summary.sellingAmount) : '',
          ]
        }),
    ]
    const worksheet = `
      <html>
        <head><meta charset="utf-8" /></head>
        <body>
          <table>
            ${exportRows
              .map(
                (row) =>
                  `<tr>${row
                    .map((value) => `<td>${escapeHtmlValue(value)}</td>`)
                    .join('')}</tr>`
              )
              .join('')}
          </table>
        </body>
      </html>
    `
    const blob = new Blob([worksheet], {
      type: 'application/vnd.ms-excel;charset=utf-8;',
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    const revisionSuffix = revisionNumber ? `-rev-${revisionNumber}` : ''

    link.href = url
    link.download = `${selectedTenderNumber}${revisionSuffix}-boq.xls`
    link.click()
    window.URL.revokeObjectURL(url)
    setMessage('BOQ exported.')
  }

  function handleBoqNumberChange(
    id: string | number,
    field: PercentField,
    value: string
  ) {
    const nextRows = rows.map((item) =>
      item.id === id
        ? {
            ...item,
            [field]: Number(value || 0),
          }
        : item
    )
    const nextAllRows = allRows.map((item) =>
      item.id === id
        ? {
            ...item,
            [field]: Number(value || 0),
          }
        : item
    )

    setRows(nextRows)
    setAllRows(nextAllRows)

    if (typeof id !== 'number') {
      setError('Save BOQ before updating costing percentages.')
      return
    }

    updateBoqItem(id, {
      [field]: Number(value || 0),
    }).catch((err) => {
      setError(
        err instanceof Error ? err.message : 'Failed to update costing value.'
      )
    })
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Costing</h1>
        <p className="mt-2 text-slate-700">
          Select a tender, enter the revision number, build the Bill of
          Quantity, then open each row to enter costing details.
        </p>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="Tender Number">
            <select
              value={selectedTenderNumber}
              onChange={(e) => handleTenderChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="">Select tender number</option>
              {tenderNumbers.map((tenderNumber) => (
                <option key={tenderNumber} value={tenderNumber}>
                  {tenderNumber}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Revision Number">
            <input
              value={revisionNumber}
              onChange={(e) => handleRevisionChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Example: R0, R1"
            />
          </Field>

          <Field label="Revision Date">
            <input
              type="date"
              value={revisionDate}
              onChange={(e) => setRevisionDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>
        </div>
      </div>

      <div className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Bill of Quantity
          </h2>
        </div>

        <div className="max-h-[70vh] w-full max-w-full overflow-auto">
          <table
            className="table-fixed border-separate border-spacing-0 divide-y divide-slate-200 text-sm"
            style={{ width: tableWidth }}
          >
            <colgroup>
              {frozenColumns.map((column) => (
                <col key={column.key} style={{ width: column.width }} />
              ))}
              {costColumnWidths.map((width, index) => (
                <col key={index} style={{ width }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-50 bg-slate-50 text-left text-slate-700">
              <tr>
                <StickyHeader column={frozenColumns[0]}>SN</StickyHeader>
                <StickyHeader column={frozenColumns[1]}>
                  Client&apos;s BOQ
                </StickyHeader>
                <StickyHeader column={frozenColumns[2]}>
                  Item Description
                </StickyHeader>
                <StickyHeader column={frozenColumns[3]}>Qty</StickyHeader>
                <StickyHeader column={frozenColumns[4]}>Unit</StickyHeader>
                <StickyHeader column={frozenColumns[5]} isLastFrozen>
                  Details
                </StickyHeader>
                <th className="px-4 py-3 font-semibold">Supply Unit Cost</th>
                <th className="px-4 py-3 font-semibold">Supply Total Cost</th>
                <th className="px-4 py-3 font-semibold">
                  Installation Unit Cost
                </th>
                <th className="px-4 py-3 font-semibold">
                  Installation Total Cost
                </th>
                <th className="px-4 py-3 font-semibold">
                  Freight &amp; Custom/Duty %
                </th>
                <th className="px-4 py-3 font-semibold">Prelims %</th>
                <th className="px-4 py-3 font-semibold">FOH %</th>
                <th className="px-4 py-3 font-semibold">Commitments %</th>
                <th className="px-4 py-3 font-semibold">Contingencies %</th>
                <th className="px-4 py-3 font-semibold">Unit Cost</th>
                <th className="px-4 py-3 font-semibold">Total Cost</th>
                <th className="px-4 py-3 font-semibold">Markup</th>
                <th className="px-4 py-3 font-semibold">Selling Rate</th>
                <th className="px-4 py-3 font-semibold">Selling Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => {
                const summary = getRowSummary(row, costings, masterItems)

                return (
                  <tr key={row.id}>
                    <StickyCell column={frozenColumns[0]}>
                      {index + 1}
                    </StickyCell>
                    <StickyCell column={frozenColumns[1]}>
                      <CompactInput
                        value={row.clientsBoq}
                        onChange={(value) =>
                          handleRowChange(row.id, 'clientsBoq', value)
                        }
                        placeholder="BOQ"
                      />
                    </StickyCell>
                    <StickyCell column={frozenColumns[2]}>
                      <CompactInput
                        value={row.description}
                        onChange={(value) =>
                          handleRowChange(row.id, 'description', value)
                        }
                        placeholder="Item description"
                      />
                    </StickyCell>
                    <StickyCell column={frozenColumns[3]}>
                      <CompactInput
                        type="number"
                        value={row.quantity || ''}
                        onChange={(value) =>
                          handleRowChange(row.id, 'quantity', value)
                        }
                        placeholder="Qty"
                      />
                    </StickyCell>
                    <StickyCell column={frozenColumns[4]}>
                      <CompactInput
                        value={row.unit}
                        onChange={(value) => handleRowChange(row.id, 'unit', value)}
                        placeholder="Unit"
                      />
                    </StickyCell>
                    <StickyCell column={frozenColumns[5]} isLastFrozen>
                      {isSavedBoqRow(row) ? (
                        <Link
                          href={`/estimation/costing/${encodeURIComponent(
                            row.tenderNumber ||
                              selectedTenderNumber ||
                              'tender-entry'
                          )}?boqId=${row.id}`}
                          className="inline-flex rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-700"
                        >
                          Open
                        </Link>
                      ) : (
                        <span className="text-xs font-medium text-slate-500">
                          Save first
                        </span>
                      )}
                    </StickyCell>
                    <CostCell value={summary?.supplyUnitCost} />
                    <CostCell value={summary?.supplyTotalCost} />
                    <CostCell value={summary?.installationUnitCost} />
                    <CostCell value={summary?.installationTotalCost} />
                    <PercentInputCell
                      value={row.freightCustomDutyPercent || ''}
                      onChange={(value) =>
                        handleBoqNumberChange(
                          row.id,
                          'freightCustomDutyPercent',
                          value
                        )
                      }
                      placeholder="Freight"
                    />
                    <PercentInputCell
                      value={row.prelimsPercent || ''}
                      onChange={(value) =>
                        handleBoqNumberChange(row.id, 'prelimsPercent', value)
                      }
                      placeholder="Prelims"
                    />
                    <PercentInputCell
                      value={row.fohPercent || ''}
                      onChange={(value) =>
                        handleBoqNumberChange(row.id, 'fohPercent', value)
                      }
                      placeholder="FOH"
                    />
                    <PercentInputCell
                      value={row.commitmentsPercent || ''}
                      onChange={(value) =>
                        handleBoqNumberChange(
                          row.id,
                          'commitmentsPercent',
                          value
                        )
                      }
                      placeholder="Commit"
                    />
                    <PercentInputCell
                      value={row.contingenciesPercent || ''}
                      onChange={(value) =>
                        handleBoqNumberChange(
                          row.id,
                          'contingenciesPercent',
                          value
                        )
                      }
                      placeholder="Conting"
                    />
                    <CostCell value={summary?.unitCost} />
                    <CostCell value={summary?.totalCost} />
                    <PercentInputCell
                      value={row.markup || ''}
                      onChange={(value) =>
                        handleBoqNumberChange(row.id, 'markup', value)
                      }
                      placeholder="Markup"
                    />
                    <CostCell value={summary?.sellingRate} />
                    <CostCell value={summary?.sellingAmount} />
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 p-6">
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
            onClick={handleAddRow}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Add Row
          </button>
          <button
            type="button"
            onClick={handleSaveBoq}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
          >
            Save BOQ
          </button>
          <button
            type="button"
            onClick={handleExportBoq}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Export BOQ
          </button>
        </div>
      </div>
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

function StickyHeader({
  column,
  isLastFrozen = false,
  children,
}: {
  column: (typeof frozenColumns)[number]
  isLastFrozen?: boolean
  children: React.ReactNode
}) {
  return (
    <th
      className={`sticky z-50 border-r border-slate-200 bg-slate-50 px-2 py-3 font-semibold ${
        isLastFrozen ? 'shadow-[8px_0_14px_-12px_rgba(15,23,42,0.9)]' : ''
      }`}
      style={{
        top: 0,
        left: column.left,
        width: column.width,
        minWidth: column.width,
        maxWidth: column.width,
      }}
    >
      {children}
    </th>
  )
}

function StickyCell({
  column,
  isLastFrozen = false,
  children,
}: {
  column: (typeof frozenColumns)[number]
  isLastFrozen?: boolean
  children: React.ReactNode
}) {
  return (
    <td
      className={`sticky z-30 overflow-hidden text-ellipsis whitespace-nowrap border-r border-slate-200 bg-white px-2 py-3 text-slate-700 ${
        isLastFrozen ? 'shadow-[8px_0_14px_-12px_rgba(15,23,42,0.9)]' : ''
      }`}
      style={{
        left: column.left,
        width: column.width,
        minWidth: column.width,
        maxWidth: column.width,
      }}
    >
      {children}
    </td>
  )
}

function CostCell({ value }: { value?: number }) {
  return (
    <td className="whitespace-nowrap px-2 py-3 text-slate-700">
      {value === undefined ? '' : formatMoney(value)}
    </td>
  )
}

function PercentInputCell({
  value,
  onChange,
  placeholder,
}: {
  value: string | number
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <td className="px-2 py-3">
      <NumberInput value={value} onChange={onChange} placeholder={placeholder} />
    </td>
  )
}

function NumberInput({
  value,
  onChange,
  placeholder,
}: {
  value: string | number
  onChange: (value: string) => void
  placeholder: string
}) {
  return (
    <input
      type="number"
      step="0.01"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-20 rounded-lg border border-slate-300 px-2 py-2 text-slate-900"
      placeholder={placeholder}
    />
  )
}

function CompactInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string | number
  onChange: (value: string) => void
  placeholder: string
  type?: string
}) {
  return (
    <input
      type={type}
      step={type === 'number' ? '0.01' : undefined}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-slate-900"
      placeholder={placeholder}
    />
  )
}

function getTenderNumbers(items: BoqItem[], tenderLogs: TenderLog[]) {
  return Array.from(
    new Set([
      ...tenderLogs.map((item) => item.tenderNumber),
      ...items.map((item) => item.tenderNumber),
    ].filter(Boolean))
  )
}

function getFirstRevision(items: BoqItem[], tenderNumber: string) {
  return (
    items.find((item) => item.tenderNumber === tenderNumber)?.revisionNumber || ''
  )
}

function getRowsForTenderRevision(
  items: BoqItem[],
  tenderNumber: string,
  revisionNumber: string
) {
  const tenderRows = items
    .filter(
      (row) =>
        row.tenderNumber === tenderNumber &&
        row.revisionNumber === revisionNumber
    )
    .map((row, index) => ({
      ...row,
      sn: String(index + 1),
    }))

  return tenderRows.length > 0
    ? tenderRows
    : [
        {
          ...createEmptyRow(),
          tenderNumber,
          revisionNumber,
          revisionDate: null,
        },
      ]
}

function getRevisionDate(
  items: BoqItem[],
  tenderNumber: string,
  revisionNumber: string
) {
  return (
    items.find(
      (item) =>
        item.tenderNumber === tenderNumber &&
        item.revisionNumber === revisionNumber &&
        item.revisionDate
    )?.revisionDate || ''
  )
}

function getRowSummary(
  row: BoqItem,
  costings: TenderCosting[],
  masterItems: MasterListItem[]
) {
  const costing = costings.find(
    (item) => String(item.boqItemId) === String(row.id)
  )

  if (!costing) return null

  return calculateCostSummary({
    boqQuantity: row.quantity,
    costing,
    freightCustomDutyPercent: row.freightCustomDutyPercent,
    prelimsPercent: row.prelimsPercent,
    fohPercent: row.fohPercent,
    commitmentsPercent: row.commitmentsPercent,
    contingenciesPercent: row.contingenciesPercent,
    markup: row.markup,
    masterItems,
  })
}

function isNumericBoqField(field: keyof BoqItem): field is NumericBoqField {
  return [
    'quantity',
    'freightCustomDutyPercent',
    'prelimsPercent',
    'fohPercent',
    'commitmentsPercent',
    'contingenciesPercent',
    'markup',
  ].includes(field)
}

function escapeHtmlValue(value: string | number) {
  const text = String(value ?? '')

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isSavedBoqRow(row: BoqItem) {
  return !(typeof row.id === 'string' && row.id.startsWith('boq-'))
}
