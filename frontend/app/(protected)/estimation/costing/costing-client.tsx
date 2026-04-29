'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import { hasRoleAccess } from '@/lib/access'
import {
  compareVariationNumbers,
  normalizeVariationNumber,
} from '@/lib/variation-number'
import {
  approveCostingRevisionSnapshot,
  BoqItem,
  ContractVariationLog,
  CostingRevisionSnapshot,
  MasterListItem,
  TenderCosting,
  TenderLog,
  calculateCostSummary,
  createId,
  formatMoney,
  getBoqItems,
  getContractVariationLogs,
  getCostingRevisionSnapshots,
  getMasterListItems,
  getTenderCostings,
  getTenderLogs,
  saveBoqItems,
  saveTenderCosting,
  submitCostingRevisionSnapshot,
  updateBoqItem,
} from '@/lib/estimation-storage'

const frozenColumns = [
  { key: 'sn', width: 40, left: 0 },
  { key: 'clientsBoq', width: 96, left: 40 },
  { key: 'package', width: 110, left: 136 },
  { key: 'description', width: 260, left: 246 },
  { key: 'quantity', width: 70, left: 506 },
  { key: 'unit', width: 56, left: 576 },
  { key: 'details', width: 84, left: 632 },
] as const

const costColumnWidths = [
  110,
  145,
  115,
  105,
  120,
  120,
  145,
  120,
  120,
  140,
  140,
  120,
  100,
  90,
  110,
  100,
  115,
  125,
  180,
]
const tableWidth =
  frozenColumns.reduce((total, column) => total + column.width, 0) +
  costColumnWidths.reduce((total, width) => total + width, 0)

type NumericBoqField =
  | 'quantity'
  | 'freightCustomDutyPercent'
  | 'prelimsPercent'
  | 'markup'

type CommonValueField =
  | 'prelimsPercent'
  | 'fohPercent'
  | 'commitmentsPercent'
  | 'contingenciesPercent'
  | 'markup'

type CommonValues = Record<CommonValueField, number>

type ProjectOption = {
  id: number
  project_name: string
  project_number: string
  tender_number?: string
  revision_number?: string
}

function createEmptyRow(sn = '1'): BoqItem {
  return {
    id: createId('boq'),
    sn,
    tenderNumber: '',
    revisionNumber: '',
    revisionDate: null,
    variationNumber: '',
    clientsBoq: '',
    package: '',
    description: '',
    quantity: 0,
    unit: '',
    freightCustomDutyPercent: 0,
    prelimsPercent: 0,
    fohPercent: 0,
    commitmentsPercent: 0,
    contingenciesPercent: 0,
    markup: 0,
    remarks: '',
  }
}

function createEmptyCommonValues(): CommonValues {
  return {
    prelimsPercent: 0,
    fohPercent: 0,
    commitmentsPercent: 0,
    contingenciesPercent: 0,
    markup: 0,
  }
}

export default function CostingClient({
  mode = 'original',
}: {
  mode?: 'original' | 'variation'
}) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [allRows, setAllRows] = useState<BoqItem[]>([])
  const [rows, setRows] = useState<BoqItem[]>([createEmptyRow()])
  const [masterItems, setMasterItems] = useState<MasterListItem[]>([])
  const [costings, setCostings] = useState<TenderCosting[]>([])
  const [tenderLogs, setTenderLogs] = useState<TenderLog[]>([])
  const [variationLogs, setVariationLogs] = useState<ContractVariationLog[]>([])
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([])
  const [snapshots, setSnapshots] = useState<CostingRevisionSnapshot[]>([])
  const [selectedProjectNumber, setSelectedProjectNumber] = useState('')
  const [selectedProjectName, setSelectedProjectName] = useState('')
  const [selectedTenderNumber, setSelectedTenderNumber] = useState('')
  const [selectedVariationNumber, setSelectedVariationNumber] = useState('')
  const [revisionNumber, setRevisionNumber] = useState('')
  const [revisionDate, setRevisionDate] = useState('')
  const [commonValues, setCommonValues] = useState<CommonValues>(
    createEmptyCommonValues()
  )
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [role, setRole] = useState('')
  const [submittingSnapshot, setSubmittingSnapshot] = useState(false)
  const [approvingSnapshotId, setApprovingSnapshotId] = useState<number | null>(
    null
  )
  const initialProjectNumber = searchParams.get('projectNumber') || ''
  const initialProjectName = searchParams.get('projectName') || ''
  const initialTenderNumber = searchParams.get('tenderNumber') || ''
  const initialVariationNumber = searchParams.get('variationNumber') || ''
  const initialRevisionNumber = searchParams.get('revisionNumber') || ''

  useEffect(() => {
    async function loadData() {
      try {
        const [
          savedBoqItems,
          savedMasterItems,
          savedCostings,
          savedTenderLogs,
          savedVariationLogs,
          savedProjectOptions,
          savedSnapshots,
          me,
        ] = await Promise.all([
          getBoqItems(),
          getMasterListItems(),
          getTenderCostings(),
          getTenderLogs(),
          getContractVariationLogs(),
          fetchAPI('/production/project-details/options/'),
          getCostingRevisionSnapshots(),
          fetchAPI('/accounts/me/'),
        ])
        const normalizedProjectOptions = Array.isArray(savedProjectOptions)
          ? (savedProjectOptions as ProjectOption[])
          : []
        const tenderNumbers = getTenderNumbers(savedBoqItems, savedTenderLogs)
        const initialProject =
          mode === 'variation'
            ? normalizedProjectOptions.find(
                (project) =>
                  project.project_number === initialProjectNumber ||
                  project.project_name === initialProjectName
              ) || null
            : null
        const firstTenderNumber =
          mode === 'variation'
            ? initialTenderNumber || initialProject?.tender_number || ''
            : tenderNumbers[0] || ''
        const firstVariationNumber =
          mode === 'variation'
            ? initialVariationNumber &&
              getVariationNumbersForProject(
                savedVariationLogs,
                initialProject?.project_number || initialProjectNumber
              ).includes(initialVariationNumber)
              ? initialVariationNumber
              : ''
            : ''
        const firstRevisionNumber =
          mode === 'variation'
            ? firstVariationNumber
              ? initialRevisionNumber ||
                getDefaultRevisionNumber(
                  savedBoqItems,
                  savedSnapshots,
                  firstTenderNumber,
                  firstVariationNumber
                )
              : initialRevisionNumber || 'R0'
            : getDefaultRevisionNumber(
                savedBoqItems,
                savedSnapshots,
                firstTenderNumber,
                ''
              )
        const firstRevisionDate =
          mode === 'variation'
            ? firstTenderNumber && firstVariationNumber
              ? getRevisionDate(
                  savedBoqItems,
                  firstTenderNumber,
                  firstRevisionNumber,
                  firstVariationNumber
                )
              : ''
            : getRevisionDate(
                savedBoqItems,
                firstTenderNumber,
                firstRevisionNumber,
                ''
              )
        const firstRows =
          mode === 'variation'
            ? firstTenderNumber && firstVariationNumber
              ? applyVariationDefaultsToRows(
                  getRowsForRevisionSelection(
                    savedBoqItems,
                    firstTenderNumber,
                    firstRevisionNumber,
                    firstVariationNumber
                  ),
                  savedBoqItems,
                  firstTenderNumber,
                  firstVariationNumber
                )
              : firstTenderNumber
                ? applyVariationDefaultsToRows(
                    [
                      {
                        ...createEmptyRow(),
                        tenderNumber: firstTenderNumber,
                        revisionNumber: firstRevisionNumber,
                        variationNumber: firstVariationNumber,
                      },
                    ],
                    savedBoqItems,
                    firstTenderNumber,
                    firstVariationNumber
                  )
                : [createEmptyRow()]
            : firstTenderNumber
              ? getRowsForRevisionSelection(
                  savedBoqItems,
                  firstTenderNumber,
                  firstRevisionNumber,
                  ''
                )
              : [createEmptyRow()]
        const firstCommonValues =
          mode === 'variation'
            ? createEmptyCommonValues()
            : getCommonValuesForRows(firstRows)

        setAllRows(savedBoqItems)
        setMasterItems(savedMasterItems)
        setCostings(savedCostings)
        setTenderLogs(savedTenderLogs)
        setVariationLogs(savedVariationLogs)
        setProjectOptions(normalizedProjectOptions)
        setSnapshots(savedSnapshots)
        setSelectedProjectNumber(
          mode === 'variation'
            ? initialProject?.project_number || initialProjectNumber
            : ''
        )
        setSelectedProjectName(
          mode === 'variation'
            ? initialProject?.project_name || initialProjectName
            : ''
        )
        setSelectedTenderNumber(firstTenderNumber)
        setSelectedVariationNumber(mode === 'variation' ? firstVariationNumber : '')
        setRevisionNumber(firstRevisionNumber)
        setRevisionDate(firstRevisionDate)
        setCommonValues(
          mode === 'variation' ? createEmptyCommonValues() : firstCommonValues
        )
        setRows(
          mode === 'variation'
            ? firstRows
            : applyCommonValuesToRows(firstRows, firstCommonValues)
        )
        setRole(typeof me?.role === 'string' ? me.role : '')
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load costing data.'
        )
      }
    }

    loadData()
  }, [
    initialProjectName,
    initialProjectNumber,
    initialRevisionNumber,
    initialTenderNumber,
    initialVariationNumber,
    mode,
  ])

  useEffect(() => {
    if (mode !== 'variation') {
      return
    }

    const nextParams = new URLSearchParams()

    if (selectedProjectNumber) {
      nextParams.set('projectNumber', selectedProjectNumber)
    }

    if (selectedProjectName) {
      nextParams.set('projectName', selectedProjectName)
    }

    if (selectedTenderNumber) {
      nextParams.set('tenderNumber', selectedTenderNumber)
    }

    if (selectedVariationNumber) {
      nextParams.set('variationNumber', selectedVariationNumber)
    }

    if (revisionNumber) {
      nextParams.set('revisionNumber', revisionNumber)
    }

    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname
    router.replace(nextUrl, { scroll: false })
  }, [
    mode,
    pathname,
    revisionNumber,
    router,
    selectedProjectName,
    selectedProjectNumber,
    selectedTenderNumber,
    selectedVariationNumber,
  ])

  const tenderNumbers = getTenderNumbers(allRows, tenderLogs)
  const availableVariationNumbers = getVariationNumbersForProject(
    variationLogs,
    selectedProjectNumber
  )
  const tableTotals = getTableTotals(rows, costings, masterItems)
  const matchingSnapshot =
    (mode === 'variation' && !selectedVariationNumber
      ? null
      : snapshots.find(
          (snapshot) =>
            snapshot.tenderNumber === selectedTenderNumber &&
            snapshot.revisionNumber === revisionNumber.trim() &&
            (snapshot.variationNumber || '') ===
              (mode === 'variation' ? selectedVariationNumber : '')
        )) || null

  function handleTenderChange(value: string) {
    const nextRevisionNumber = getDefaultRevisionNumber(
      allRows,
      snapshots,
      value,
      ''
    )
    const nextRevisionDate = getRevisionDate(allRows, value, nextRevisionNumber, '')
    const nextRows = value
      ? getRowsForRevisionSelection(allRows, value, nextRevisionNumber, '')
      : [createEmptyRow()]
    const nextCommonValues = getCommonValuesForRows(nextRows)

    setSelectedTenderNumber(value)
    setRevisionNumber(nextRevisionNumber)
    setRevisionDate(nextRevisionDate)
    setRows(applyCommonValuesToRows(nextRows, nextCommonValues))
    setCommonValues(nextCommonValues)
    setMessage('')
    setError('')
  }

  function handleProjectNumberChange(projectNumber: string) {
    const selectedProject =
      projectOptions.find((project) => project.project_number === projectNumber) ||
      null
    const nextTenderNumber = selectedProject?.tender_number || ''
    const nextRows = nextTenderNumber
      ? applyVariationDefaultsToRows(
          [
            {
              ...createEmptyRow(),
              tenderNumber: nextTenderNumber,
              revisionNumber: 'R0',
              variationNumber: '',
            },
          ],
          allRows,
          nextTenderNumber,
          ''
        )
      : [createEmptyRow()]

    setSelectedProjectNumber(projectNumber)
    setSelectedProjectName(selectedProject?.project_name || '')
    setSelectedTenderNumber(nextTenderNumber)
    setSelectedVariationNumber('')
    setRevisionNumber('R0')
    setRevisionDate('')
    setRows(nextRows)
    setMessage('')
    setError('')
  }

  function handleVariationNumberChange(value: string) {
    const nextRevisionNumber = value
      ? getDefaultRevisionNumber(allRows, snapshots, selectedTenderNumber, value)
      : 'R0'
    const nextRevisionDate = value
      ? getRevisionDate(
          allRows,
          selectedTenderNumber,
          nextRevisionNumber,
          value
        )
      : ''
    const nextRows =
      selectedTenderNumber && value
        ? applyVariationDefaultsToRows(
            getRowsForRevisionSelection(
              allRows,
              selectedTenderNumber,
              nextRevisionNumber,
              value
            ),
            allRows,
            selectedTenderNumber,
            value
          )
        : selectedTenderNumber
          ? applyVariationDefaultsToRows(
              [
                {
                  ...createEmptyRow(),
                  tenderNumber: selectedTenderNumber,
                  revisionNumber: nextRevisionNumber,
                  variationNumber: '',
                },
              ],
              allRows,
              selectedTenderNumber,
              ''
            )
          : [createEmptyRow()]

    setSelectedVariationNumber(value)
    setRevisionNumber(nextRevisionNumber)
    setRevisionDate(nextRevisionDate)
    setRows(nextRows)
    setMessage('')
    setError('')
  }

  function handleRevisionChange(value: string) {
    const normalizedRevision = value.trim()
    const existingRows = selectedTenderNumber
      ? getRowsForTenderRevision(
          allRows,
          selectedTenderNumber,
          normalizedRevision,
          mode === 'variation' ? selectedVariationNumber : ''
        )
      : []
    const hasExistingRows = existingRows.some(isSavedBoqRow)
    const previousRevisionRows =
      !hasExistingRows && selectedTenderNumber
        ? getPreviousRevisionRows(
            allRows,
            selectedTenderNumber,
            normalizedRevision,
            mode === 'variation' ? selectedVariationNumber : ''
          )
        : []
    const nextRows =
      selectedTenderNumber && hasExistingRows
        ? existingRows
        : previousRevisionRows.length > 0
          ? cloneRowsForRevision(
              previousRevisionRows,
              selectedTenderNumber,
              normalizedRevision,
              mode === 'variation' ? selectedVariationNumber : ''
            )
          : [
              {
                ...createEmptyRow(),
                tenderNumber: selectedTenderNumber,
                revisionNumber: normalizedRevision,
                revisionDate: null,
                variationNumber:
                  mode === 'variation' ? selectedVariationNumber : '',
              },
            ]
    const nextCommonValues =
      previousRevisionRows.length > 0 && !hasExistingRows
        ? getCommonValuesForRows(previousRevisionRows)
        : getCommonValuesForRows(nextRows)

    setRevisionNumber(value)
    setRevisionDate(
      hasExistingRows
        ? getRevisionDate(
            allRows,
            selectedTenderNumber,
            normalizedRevision,
            mode === 'variation' ? selectedVariationNumber : ''
          )
        : ''
    )
    setRows(
      mode === 'variation'
        ? applyVariationDefaultsToRows(
            nextRows,
            allRows,
            selectedTenderNumber,
            selectedVariationNumber
          )
        : applyCommonValuesToRows(nextRows, nextCommonValues)
    )
    setCommonValues(
      mode === 'variation' ? createEmptyCommonValues() : nextCommonValues
    )
    setMessage(
      previousRevisionRows.length > 0 && !hasExistingRows
        ? `Loaded ${getRevisionLabel(previousRevisionRows[0]?.revisionNumber)} as the starting point for ${getRevisionLabel(normalizedRevision)}.`
        : ''
    )
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
    const variationDefaults =
      mode === 'variation'
        ? getVariationRowDefaults(
            allRows,
            selectedTenderNumber,
            selectedVariationNumber
          )
        : null
    setRows((prev) => [
      ...prev,
      mode === 'variation'
        ? applyVariationDefaultsToRow(
            {
              ...createEmptyRow(String(prev.length + 1)),
              tenderNumber: selectedTenderNumber,
              revisionNumber,
              revisionDate: revisionDate || null,
              variationNumber: selectedVariationNumber,
            },
            variationDefaults
          )
        : applyCommonValuesToRow(
            {
              ...createEmptyRow(String(prev.length + 1)),
              tenderNumber: selectedTenderNumber,
              revisionNumber,
              revisionDate: revisionDate || null,
            },
            commonValues
          ),
    ])
  }

  async function handleSaveBoq() {
    setError('')

    if (!selectedTenderNumber) {
      setError(
        mode === 'variation'
          ? 'Select a project number before saving BOQ.'
          : 'Select a tender number before saving BOQ.'
      )
      return
    }

    if (mode === 'variation' && !selectedVariationNumber) {
      setError('Select a variation number before saving BOQ.')
      return
    }

    const rowsToSave = rows
      .filter(
        (row) =>
          row.clientsBoq ||
          row.package ||
          row.description ||
          row.quantity ||
          row.unit ||
          row.remarks
      )
      .map((row, index) => ({
        ...(mode === 'variation' ? row : applyCommonValuesToRow(row, commonValues)),
        sn: String(index + 1),
        tenderNumber: selectedTenderNumber,
        revisionNumber: revisionNumber.trim(),
        revisionDate: revisionDate || null,
        variationNumber: mode === 'variation' ? selectedVariationNumber : '',
      }))
    const currentRevisionRows = allRows.filter(
      (row) =>
        row.tenderNumber === selectedTenderNumber &&
        row.revisionNumber === revisionNumber.trim() &&
        (row.variationNumber || '') ===
          (mode === 'variation' ? selectedVariationNumber : '')
    )
    const previousRevisionRows =
      currentRevisionRows.length === 0
        ? getPreviousRevisionRows(
            allRows,
            selectedTenderNumber,
            revisionNumber.trim(),
            mode === 'variation' ? selectedVariationNumber : ''
          )
        : []
    const rowsFromOtherTenderRevisions = allRows.filter(
      (row) =>
        row.tenderNumber !== selectedTenderNumber ||
        row.revisionNumber !== revisionNumber.trim() ||
        (row.variationNumber || '') !==
          (mode === 'variation' ? selectedVariationNumber : '')
    )

    try {
      const savedRows = await saveBoqItems([
        ...rowsFromOtherTenderRevisions,
        ...rowsToSave,
      ])
      const savedCurrentRows = getRowsForTenderRevision(
        savedRows,
        selectedTenderNumber,
        revisionNumber.trim(),
        mode === 'variation' ? selectedVariationNumber : ''
      )
      let nextCostings = costings

      if (previousRevisionRows.length > 0) {
        const copiedCostings = await copyRevisionCostings({
          sourceRows: previousRevisionRows,
          targetRows: savedCurrentRows,
          currentCostings: costings,
        })

        if (copiedCostings.length > 0) {
          nextCostings = await getTenderCostings()
        }
      }

      setAllRows(savedRows)
      setCostings(nextCostings)
      setRows(
        mode === 'variation'
          ? savedCurrentRows
          : applyCommonValuesToRows(savedCurrentRows, commonValues)
      )
      setRevisionNumber(revisionNumber.trim())
      setCommonValues(
        mode === 'variation'
          ? createEmptyCommonValues()
          : getCommonValuesForRows(savedCurrentRows)
      )
      setMessage(
        mode === 'variation'
          ? 'Variation Bill of Quantity saved.'
          : 'Bill of Quantity saved.'
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save BOQ.')
    }
  }

  async function handleSubmitRevision() {
    if (!selectedTenderNumber) {
      setError(
        mode === 'variation'
          ? 'Select a project number before submitting.'
          : 'Select a tender number before submitting.'
      )
      return
    }

    if (mode === 'variation' && !selectedVariationNumber) {
      setError('Select a variation number before submitting.')
      return
    }

    const hasSavedCurrentRows = allRows.some(
      (row) =>
        row.tenderNumber === selectedTenderNumber &&
        row.revisionNumber === revisionNumber.trim() &&
        (row.variationNumber || '') ===
          (mode === 'variation' ? selectedVariationNumber : '')
    )

    if (!hasSavedCurrentRows) {
      setError('Save BOQ for this revision before submitting it.')
      return
    }

    setSubmittingSnapshot(true)
    setError('')
    setMessage('')

    try {
      const savedSnapshot = await submitCostingRevisionSnapshot({
        tenderNumber: selectedTenderNumber,
        projectName:
          mode === 'variation'
            ? selectedProjectName
            : getTenderProjectName(tenderLogs, selectedTenderNumber),
        revisionNumber: revisionNumber.trim(),
        variationNumber: mode === 'variation' ? selectedVariationNumber : '',
      })

      setSnapshots((prev) => upsertCostingSnapshot(prev, savedSnapshot))
      setMessage(
        `Costing ${getRevisionLabel(revisionNumber.trim())} submitted for approval.`
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to submit costing revision.'
      )
    } finally {
      setSubmittingSnapshot(false)
    }
  }

  async function handleApproveRevision(snapshotId: number) {
    setApprovingSnapshotId(snapshotId)
    setError('')
    setMessage('')

    try {
      const approvedSnapshot = await approveCostingRevisionSnapshot(snapshotId)
      const nextSnapshots = upsertCostingSnapshot(snapshots, approvedSnapshot)

      setSnapshots(nextSnapshots)
      if (
        approvedSnapshot.tenderNumber === selectedTenderNumber &&
        approvedSnapshot.revisionNumber === revisionNumber.trim() &&
        (approvedSnapshot.variationNumber || '') ===
          (mode === 'variation' ? selectedVariationNumber : '')
      ) {
        const nextRevisionNumber = getDefaultRevisionNumber(
          allRows,
          nextSnapshots,
          selectedTenderNumber,
          mode === 'variation' ? selectedVariationNumber : ''
        )
        const nextRevisionDate = getRevisionDate(
          allRows,
          selectedTenderNumber,
          nextRevisionNumber,
          mode === 'variation' ? selectedVariationNumber : ''
        )
        const nextRows = selectedTenderNumber
          ? getRowsForRevisionSelection(
              allRows,
              selectedTenderNumber,
              nextRevisionNumber,
              mode === 'variation' ? selectedVariationNumber : ''
            )
          : [createEmptyRow()]
        const nextCommonValues = getCommonValuesForRows(nextRows)

        setRevisionNumber(nextRevisionNumber)
        setRevisionDate(nextRevisionDate)
        setRows(
          mode === 'variation'
            ? applyVariationDefaultsToRows(
                nextRows,
                allRows,
                selectedTenderNumber,
                selectedVariationNumber
              )
            : applyCommonValuesToRows(nextRows, nextCommonValues)
        )
        setCommonValues(
          mode === 'variation'
            ? createEmptyCommonValues()
            : nextCommonValues
        )
      }
      setMessage(
        `Costing ${getRevisionLabel(approvedSnapshot.revisionNumber)} approved.`
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to approve costing revision.'
      )
    } finally {
      setApprovingSnapshotId(null)
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''

    if (!file) return

    if (!selectedTenderNumber) {
      setError(
        mode === 'variation'
          ? 'Select a project number before importing.'
          : 'Select a tender number before importing.'
      )
      return
    }

    if (mode === 'variation' && !selectedVariationNumber) {
      setError('Select a variation number before importing.')
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
        (row: Partial<BoqItem>, index: number) =>
          mode === 'variation'
            ? applyVariationDefaultsToRow(
                {
                  ...createEmptyRow(String(index + 1)),
                  sn: row.sn || String(index + 1),
                  tenderNumber: selectedTenderNumber,
                  revisionNumber: revisionNumber.trim(),
                  revisionDate: revisionDate || null,
                  variationNumber: selectedVariationNumber,
                  clientsBoq: row.clientsBoq || '',
                  package: row.package || '',
                  description: row.description || '',
                  quantity: Number(row.quantity || 0),
                  freightCustomDutyPercent: Number(
                    row.freightCustomDutyPercent || 0
                  ),
                  unit: row.unit || '',
                  remarks: row.remarks || '',
                },
                getVariationRowDefaults(
                  allRows,
                  selectedTenderNumber,
                  selectedVariationNumber
                )
              )
            : applyCommonValuesToRow(
                {
                  ...createEmptyRow(String(index + 1)),
                  sn: row.sn || String(index + 1),
                  tenderNumber: selectedTenderNumber,
                  revisionNumber: revisionNumber.trim(),
                  revisionDate: revisionDate || null,
                  clientsBoq: row.clientsBoq || '',
                  package: row.package || '',
                  description: row.description || '',
                  quantity: Number(row.quantity || 0),
                  freightCustomDutyPercent: Number(
                    row.freightCustomDutyPercent || 0
                  ),
                  unit: row.unit || '',
                  remarks: row.remarks || '',
                },
                commonValues
              )
      )

      setRows(
        importedRows.length > 0
          ? importedRows
          : [
              mode === 'variation'
                ? applyVariationDefaultsToRow(
                    {
                      ...createEmptyRow(),
                      tenderNumber: selectedTenderNumber,
                      revisionNumber: revisionNumber.trim(),
                      revisionDate: revisionDate || null,
                      variationNumber: selectedVariationNumber,
                    },
                    getVariationRowDefaults(
                      allRows,
                      selectedTenderNumber,
                      selectedVariationNumber
                    )
                  )
                : createEmptyRow(),
            ]
      )
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
      setError(
        mode === 'variation'
          ? 'Select a project number before exporting.'
          : 'Select a tender number before exporting.'
      )
      return
    }

    if (mode === 'variation' && !selectedVariationNumber) {
      setError('Select a variation number before exporting.')
      return
    }

    const exportRows = [
      [
        'SN',
        "Client's BOQ",
        'Package',
        'Item Description',
        'Qty',
        'Unit',
        'Selling Rate',
        'Selling Amount',
        'Remarks',
      ],
      ...rows
        .filter(
          (row) =>
            row.clientsBoq ||
            row.package ||
            row.description ||
            row.quantity ||
            row.unit ||
            row.remarks
        )
        .map((row, index) => {
          const summary = getRowSummary(row, costings, masterItems)

          return [
            row.sn || String(index + 1),
            row.clientsBoq,
            row.package,
            row.description,
            row.quantity,
            row.unit,
            summary ? formatMoney(summary.sellingRate) : '',
            summary ? formatMoney(summary.sellingAmount) : '',
            row.remarks,
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
    const variationSuffix =
      mode === 'variation' && selectedVariationNumber
        ? `-variation-${selectedVariationNumber}`
        : ''

    link.href = url
    link.download = `${selectedTenderNumber}${variationSuffix}${revisionSuffix}-boq.xls`
    link.click()
    window.URL.revokeObjectURL(url)
    setMessage('BOQ exported.')
  }

  function handleBoqNumberChange(
    id: string | number,
    field: 'freightCustomDutyPercent',
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

  function handleCommonValueChange(field: CommonValueField, value: string) {
    const numericValue = Number(value || 0)
    const nextCommonValues = {
      ...commonValues,
      [field]: numericValue,
    }

    setCommonValues(nextCommonValues)
    setRows((prev) => prev.map((row) => applyCommonValuesToRow(row, nextCommonValues)))
    setAllRows((prev) =>
      prev.map((row) =>
        row.tenderNumber === selectedTenderNumber &&
        row.revisionNumber === revisionNumber
          ? applyCommonValuesToRow(row, nextCommonValues)
          : row
      )
    )
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          {mode === 'variation' ? 'Variation Costing' : 'Costing'}
        </h1>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div
          className={`grid grid-cols-1 gap-6 md:grid-cols-2 ${
            mode === 'variation' ? 'xl:grid-cols-6' : 'xl:grid-cols-4'
          }`}
        >
          {mode === 'variation' ? (
            <>
              <Field label="Project Number">
                <select
                  value={selectedProjectNumber}
                  onChange={(e) => handleProjectNumberChange(e.target.value)}
                  className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 ${
                    selectedProjectNumber ? 'text-black' : 'text-neutral-400'
                  }`}
                >
                  <option value="">Select project number</option>
                  {projectOptions.map((project) => (
                    <option key={project.id} value={project.project_number}>
                      {project.project_number}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Project Name">
                <input
                  value={selectedProjectName}
                  readOnly
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
                  placeholder="Project name"
                />
              </Field>
            </>
          ) : (
            <Field label="Tender Number">
              <select
                value={selectedTenderNumber}
                onChange={(e) => handleTenderChange(e.target.value)}
                className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 ${
                  selectedTenderNumber ? 'text-black' : 'text-neutral-400'
                }`}
              >
                <option value="">Select tender number</option>
                {tenderNumbers.map((tenderNumber) => (
                  <option key={tenderNumber} value={tenderNumber}>
                    {tenderNumber}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {mode === 'variation' ? (
            <Field label="Variation Number">
              <select
                value={selectedVariationNumber}
                onChange={(e) => handleVariationNumberChange(e.target.value)}
                className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 ${
                  selectedVariationNumber ? 'text-black' : 'text-neutral-400'
                }`}
              >
                <option value="">Select variation number</option>
                {availableVariationNumbers.map((variationNumber) => (
                  <option key={variationNumber} value={variationNumber}>
                    {variationNumber}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

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
              className={`w-full rounded-lg border border-slate-300 bg-white px-3 py-2 ${
                revisionDate ? 'text-black' : 'text-neutral-400'
              }`}
            />
          </Field>

          <Field label="Actions">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleSubmitRevision}
                disabled={submittingSnapshot || !selectedTenderNumber}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submittingSnapshot ? 'Submitting...' : 'Submit'}
              </button>
              {hasRoleAccess(role, ['manager', 'admin']) &&
              matchingSnapshot &&
              matchingSnapshot.status !== 'approved' ? (
                <button
                  type="button"
                  onClick={() => handleApproveRevision(matchingSnapshot.id)}
                  disabled={approvingSnapshotId === matchingSnapshot.id}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-60"
                >
                  {approvingSnapshotId === matchingSnapshot.id
                    ? 'Approving...'
                    : 'Approve'}
                </button>
              ) : null}
            </div>
            {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-700">
          <span className="font-medium">Current status:</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold uppercase tracking-wide text-slate-700">
            {matchingSnapshot?.status || 'draft'}
          </span>
          {matchingSnapshot?.submittedBy ? (
            <span>
              Submitted by {matchingSnapshot.submittedBy}
            </span>
          ) : null}
          {matchingSnapshot?.approvedBy ? (
            <span>
              Approved by {matchingSnapshot.approvedBy}
            </span>
          ) : null}
        </div>
      </div>

      {mode === 'original' ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Common Values</h2>
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-5">
            <Field label="Prelims %">
              <NumberInput
                value={commonValues.prelimsPercent || ''}
                onChange={(value) => handleCommonValueChange('prelimsPercent', value)}
                placeholder="Prelims"
              />
            </Field>
            <Field label="FOH %">
              <NumberInput
                value={commonValues.fohPercent || ''}
                onChange={(value) => handleCommonValueChange('fohPercent', value)}
                placeholder="FOH"
              />
            </Field>
            <Field label="Commitments %">
              <NumberInput
                value={commonValues.commitmentsPercent || ''}
                onChange={(value) =>
                  handleCommonValueChange('commitmentsPercent', value)
                }
                placeholder="Commitments"
              />
            </Field>
            <Field label="Contingencies %">
              <NumberInput
                value={commonValues.contingenciesPercent || ''}
                onChange={(value) =>
                  handleCommonValueChange('contingenciesPercent', value)
                }
                placeholder="Contingencies"
              />
            </Field>
            <Field label="Markup">
              <NumberInput
                value={commonValues.markup || ''}
                onChange={(value) => handleCommonValueChange('markup', value)}
                placeholder="Markup"
              />
            </Field>
          </div>
        </div>
      ) : null}

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
                  Package
                </StickyHeader>
                <StickyHeader column={frozenColumns[3]}>
                  Item Description
                </StickyHeader>
                <StickyHeader column={frozenColumns[4]}>Qty</StickyHeader>
                <StickyHeader column={frozenColumns[5]}>Unit</StickyHeader>
                <StickyHeader column={frozenColumns[6]} isLastFrozen>
                  Details
                </StickyHeader>
                <th className="px-4 py-3 font-semibold">Material</th>
                <th className="px-4 py-3 font-semibold">
                  Production Labour
                </th>
                <th className="px-4 py-3 font-semibold">Machining</th>
                <th className="px-4 py-3 font-semibold">Coating</th>
                <th className="px-4 py-3 font-semibold">Consumable</th>
                <th className="px-4 py-3 font-semibold">Subcontract</th>
                <th className="px-4 py-3 font-semibold">
                  Installation Labour
                </th>
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
                <th className="px-4 py-3 font-semibold">Unit Cost</th>
                <th className="px-4 py-3 font-semibold">Total Cost</th>
                <th className="px-4 py-3 font-semibold">Markup</th>
                <th className="px-4 py-3 font-semibold">Selling Rate</th>
                <th className="px-4 py-3 font-semibold">Selling Amount</th>
                <th className="px-4 py-3 font-semibold">Remarks</th>
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
                        value={row.package}
                        onChange={(value) =>
                          handleRowChange(row.id, 'package', value)
                        }
                        placeholder="Package"
                      />
                    </StickyCell>
                    <StickyCell column={frozenColumns[3]}>
                      <CompactInput
                        value={row.description}
                        onChange={(value) =>
                          handleRowChange(row.id, 'description', value)
                        }
                        placeholder="Item description"
                      />
                    </StickyCell>
                    <StickyCell column={frozenColumns[4]}>
                      <CompactInput
                        type="number"
                        value={row.quantity || ''}
                        onChange={(value) =>
                          handleRowChange(row.id, 'quantity', value)
                        }
                        placeholder="Qty"
                      />
                    </StickyCell>
                    <StickyCell column={frozenColumns[5]}>
                      <CompactInput
                        value={row.unit}
                        onChange={(value) => handleRowChange(row.id, 'unit', value)}
                        placeholder="Unit"
                      />
                    </StickyCell>
                    <StickyCell column={frozenColumns[6]} isLastFrozen>
                      {isSavedBoqRow(row) ? (
                        <Link
                          href={buildCostingDetailsHref({
                            mode,
                            tenderNumber:
                              row.tenderNumber ||
                              selectedTenderNumber ||
                              'tender-entry',
                            boqId: row.id,
                            projectNumber: selectedProjectNumber,
                            projectName: selectedProjectName,
                            variationNumber: selectedVariationNumber,
                            revisionNumber,
                          })}
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
                    <CostCell value={summary?.materialUnitCost} />
                    <CostCell value={summary?.productionLabourUnitCost} />
                    <CostCell value={summary?.machiningUnitCost} />
                    <CostCell value={summary?.coatingUnitCost} />
                    <CostCell value={summary?.consumableUnitCost} />
                    <CostCell value={summary?.subcontractUnitCost} />
                    <CostCell value={summary?.installationLabourUnitCost} />
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
                    {mode === 'variation' ? (
                      <PercentInputCell
                        value={row.prelimsPercent || ''}
                        onChange={(value) =>
                          handleRowChange(row.id, 'prelimsPercent', value)
                        }
                        placeholder="Prelims"
                      />
                    ) : (
                      <ReadOnlyPercentCell value={commonValues.prelimsPercent} />
                    )}
                    <CostCell value={summary?.unitCost} />
                    <CostCell value={summary?.totalCost} />
                    {mode === 'variation' ? (
                      <PercentInputCell
                        value={row.markup || ''}
                        onChange={(value) =>
                          handleRowChange(row.id, 'markup', value)
                        }
                        placeholder="Markup"
                      />
                    ) : (
                      <ReadOnlyPercentCell value={commonValues.markup} />
                    )}
                    <CostCell value={summary?.sellingRate} />
                    <CostCell value={summary?.sellingAmount} />
                    <td className="px-2 py-3">
                      <CompactInput
                        value={row.remarks}
                        onChange={(value) =>
                          handleRowChange(row.id, 'remarks', value)
                        }
                        placeholder="Remarks"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="sticky bottom-0 z-40 bg-slate-100 font-semibold text-slate-900">
              <tr>
                <StickyFooterCell column={frozenColumns[0]} />
                <StickyFooterCell column={frozenColumns[1]} />
                <StickyFooterCell column={frozenColumns[2]} />
                <StickyFooterCell column={frozenColumns[3]} />
                <StickyFooterCell column={frozenColumns[4]} />
                <StickyFooterCell column={frozenColumns[5]} />
                <StickyFooterCell column={frozenColumns[6]} isLastFrozen>
                  Total
                </StickyFooterCell>
                <BlankTotalCell />
                <BlankTotalCell />
                <BlankTotalCell />
                <BlankTotalCell />
                <BlankTotalCell />
                <BlankTotalCell />
                <BlankTotalCell />
                <BlankTotalCell />
                <TotalCell value={tableTotals.supplyTotalCost} />
                <BlankTotalCell />
                <TotalCell value={tableTotals.installationTotalCost} />
                <BlankTotalCell />
                <BlankTotalCell />
                <BlankTotalCell />
                <TotalCell value={tableTotals.totalCost} />
                <BlankTotalCell />
                <TotalCell value={tableTotals.sellingRate} />
                <TotalCell value={tableTotals.sellingAmount} />
                <BlankTotalCell />
              </tr>
            </tfoot>
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

function StickyFooterCell({
  column,
  isLastFrozen = false,
  children,
}: {
  column: (typeof frozenColumns)[number]
  isLastFrozen?: boolean
  children?: React.ReactNode
}) {
  return (
    <td
      className={`sticky z-50 border-r border-t border-slate-300 bg-slate-100 px-2 py-3 font-semibold text-slate-900 ${
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

function TotalCell({ value }: { value: number }) {
  return (
    <td className="whitespace-nowrap border-t border-slate-300 px-2 py-3">
      {formatMoney(value)}
    </td>
  )
}

function BlankTotalCell() {
  return <td className="border-t border-slate-300 px-2 py-3" />
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

function ReadOnlyPercentCell({ value }: { value: number }) {
  return (
    <td className="px-2 py-3 text-slate-700">{formatMoney(value)}</td>
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
      ...items
        .filter((item) => !item.variationNumber)
        .map((item) => item.tenderNumber),
    ].filter(Boolean))
  )
}

function getDefaultRevisionNumber(
  items: BoqItem[],
  snapshots: CostingRevisionSnapshot[],
  tenderNumber: string,
  variationNumber = ''
) {
  const latestExistingRevision =
    getRevisionNumbersForTender(items, tenderNumber, variationNumber).at(-1) || ''
  const latestApprovedRevision = snapshots
    .filter(
      (snapshot) =>
        snapshot.tenderNumber === tenderNumber &&
        snapshot.status === 'approved' &&
        (snapshot.variationNumber || '') === variationNumber
    )
    .map((snapshot) => snapshot.revisionNumber)
    .sort(compareRevisionNumbers)
    .at(-1)

  if (!latestExistingRevision && !latestApprovedRevision) {
    return 'R0'
  }

  if (!latestApprovedRevision) {
    return latestExistingRevision || 'R0'
  }

  const nextApprovedRevision = incrementRevisionNumber(latestApprovedRevision)

  if (
    latestExistingRevision &&
    compareRevisionNumbers(latestExistingRevision, nextApprovedRevision) >= 0
  ) {
    return latestExistingRevision
  }

  return nextApprovedRevision
}

function incrementRevisionNumber(revisionNumber: string) {
  const matches = String(revisionNumber || '').match(/\d+/g)
  const nextNumber = matches ? Number(matches.at(-1)) + 1 : 0

  return `R${nextNumber}`
}

function getRowsForRevisionSelection(
  items: BoqItem[],
  tenderNumber: string,
  revisionNumber: string,
  variationNumber = ''
) {
  const existingRows = getRowsForTenderRevision(
    items,
    tenderNumber,
    revisionNumber,
    variationNumber
  )
  const hasExistingRows = existingRows.some(isSavedBoqRow)

  if (hasExistingRows) {
    return existingRows
  }

  const previousRevisionRows = getPreviousRevisionRows(
    items,
    tenderNumber,
    revisionNumber,
    variationNumber
  )

  if (previousRevisionRows.length > 0) {
    return cloneRowsForRevision(
      previousRevisionRows,
      tenderNumber,
      revisionNumber,
      variationNumber
    )
  }

  return existingRows
}

function getRowsForTenderRevision(
  items: BoqItem[],
  tenderNumber: string,
  revisionNumber: string,
  variationNumber = ''
) {
  const tenderRows = items
    .filter(
      (row) =>
        row.tenderNumber === tenderNumber &&
        row.revisionNumber === revisionNumber &&
        (row.variationNumber || '') === variationNumber
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
          variationNumber,
        },
      ]
}

function getPreviousRevisionRows(
  items: BoqItem[],
  tenderNumber: string,
  targetRevision: string,
  variationNumber = ''
) {
  const revisions = getRevisionNumbersForTender(items, tenderNumber, variationNumber)
  const normalizedTarget = String(targetRevision || '').trim()
  const previousRevision =
    revisions.filter((revision) =>
      compareRevisionNumbers(revision, normalizedTarget) < 0
    ).at(-1) ||
    revisions.filter((revision) => revision !== normalizedTarget).at(-1) ||
    ''

  return previousRevision
    ? getRowsForTenderRevision(items, tenderNumber, previousRevision, variationNumber)
    : []
}

function getRevisionDate(
  items: BoqItem[],
  tenderNumber: string,
  revisionNumber: string,
  variationNumber = ''
) {
  return (
    items.find(
      (item) =>
        item.tenderNumber === tenderNumber &&
        item.revisionNumber === revisionNumber &&
        (item.variationNumber || '') === variationNumber &&
        item.revisionDate
    )?.revisionDate || ''
  )
}

function getRevisionNumbersForTender(
  items: BoqItem[],
  tenderNumber: string,
  variationNumber = ''
) {
  return [...new Set(
    items
      .filter(
        (item) =>
          item.tenderNumber === tenderNumber &&
          (item.variationNumber || '') === variationNumber
      )
      .map((item) => String(item.revisionNumber || '').trim())
  )].sort(compareRevisionNumbers)
}

function compareRevisionNumbers(left: string, right: string) {
  const leftMatch = left.match(/\d+/g)
  const rightMatch = right.match(/\d+/g)
  const leftNumber = leftMatch ? Number(leftMatch.at(-1)) : -1
  const rightNumber = rightMatch ? Number(rightMatch.at(-1)) : -1

  if (leftNumber !== rightNumber) {
    return leftNumber - rightNumber
  }

  return left.localeCompare(right)
}

function cloneRowsForRevision(
  sourceRows: BoqItem[],
  tenderNumber: string,
  revisionNumber: string,
  variationNumber = ''
) {
  return sourceRows.map((row, index) => ({
    ...row,
    id: createId('boq'),
    sn: String(index + 1),
    tenderNumber,
    revisionNumber,
    revisionDate: null,
    variationNumber,
  }))
}

function getRevisionLabel(revisionNumber: string) {
  return revisionNumber ? revisionNumber : 'Current Revision'
}

function buildCostingDetailsHref({
  mode,
  tenderNumber,
  boqId,
  projectNumber,
  projectName,
  variationNumber,
  revisionNumber,
}: {
  mode: 'original' | 'variation'
  tenderNumber: string
  boqId: string | number
  projectNumber: string
  projectName: string
  variationNumber: string
  revisionNumber: string
}) {
  const basePath =
    mode === 'variation'
      ? '/contract/variation-costing'
      : '/estimation/costing'
  const params = new URLSearchParams({
    boqId: String(boqId),
  })

  if (mode === 'variation') {
    if (projectNumber) {
      params.set('projectNumber', projectNumber)
    }

    if (projectName) {
      params.set('projectName', projectName)
    }

    if (tenderNumber) {
      params.set('tenderNumber', tenderNumber)
    }

    if (variationNumber) {
      params.set('variationNumber', variationNumber)
    }

    if (revisionNumber) {
      params.set('revisionNumber', revisionNumber)
    }
  }

  return `${basePath}/${encodeURIComponent(tenderNumber)}?${params.toString()}`
}

function getTenderProjectName(tenderLogs: TenderLog[], tenderNumber: string) {
  return tenderLogs.find((tender) => tender.tenderNumber === tenderNumber)?.projectName || ''
}

function getVariationNumbersForProject(
  variationLogs: ContractVariationLog[],
  projectNumber: string
) {
  return Array.from(
    new Set(
      variationLogs
        .filter((log) => log.projectNumber === projectNumber)
        .map((log) => normalizeVariationNumber(log.rfvNumber))
        .filter(Boolean)
    )
  ).sort(compareVariationNumbers)
}

function getVariationRowDefaults(
  items: BoqItem[],
  tenderNumber: string,
  variationNumber: string
) {
  const originalRows = getRowsForTenderRevision(
    items.filter((item) => !item.variationNumber),
    tenderNumber,
    getRevisionNumbersForTender(items, tenderNumber).at(-1) || 'R0',
    ''
  )
  const firstOriginalRow = originalRows.find(
    (row) => row.description || row.clientsBoq || row.quantity || row.unit
  )

  return {
    tenderNumber,
    variationNumber,
    prelimsPercent: Number(firstOriginalRow?.prelimsPercent || 0),
    markup: Number(firstOriginalRow?.markup || 0),
  }
}

function applyVariationDefaultsToRow(
  row: BoqItem,
  defaults:
    | {
        tenderNumber: string
        variationNumber: string
        prelimsPercent: number
        markup: number
      }
    | null
) {
  if (!defaults) {
    return row
  }

  return {
    ...row,
    tenderNumber: defaults.tenderNumber || row.tenderNumber,
    variationNumber: defaults.variationNumber || row.variationNumber,
    prelimsPercent: Number(row.prelimsPercent || defaults.prelimsPercent || 0),
    markup: Number(row.markup || defaults.markup || 0),
  }
}

function applyVariationDefaultsToRows(
  rows: BoqItem[],
  items: BoqItem[],
  tenderNumber: string,
  variationNumber: string
) {
  const defaults = getVariationRowDefaults(items, tenderNumber, variationNumber)

  return rows.map((row) =>
    applyVariationDefaultsToRow(
      {
        ...row,
        tenderNumber: tenderNumber || row.tenderNumber,
        variationNumber: variationNumber || row.variationNumber,
      },
      defaults
    )
  )
}

function upsertCostingSnapshot(
  snapshots: CostingRevisionSnapshot[],
  snapshot: CostingRevisionSnapshot
) {
  const remaining = snapshots.filter((item) => item.id !== snapshot.id)

  return [...remaining, snapshot].sort((left, right) => {
    if (left.tenderNumber !== right.tenderNumber) {
      return left.tenderNumber.localeCompare(right.tenderNumber)
    }

    return compareRevisionNumbers(left.revisionNumber, right.revisionNumber)
  })
}

async function copyRevisionCostings({
  sourceRows,
  targetRows,
  currentCostings,
}: {
  sourceRows: BoqItem[]
  targetRows: BoqItem[]
  currentCostings: TenderCosting[]
}) {
  const copyTasks = targetRows.map(async (targetRow) => {
    const sourceRow =
      sourceRows.find((row) => String(row.sn) === String(targetRow.sn)) ||
      sourceRows.find(
        (row) => row.description.trim() && row.description === targetRow.description
      )

    if (!sourceRow) {
      return null
    }

    const sourceCosting = currentCostings.find(
      (costing) => String(costing.boqItemId) === String(sourceRow.id)
    )

    if (!sourceCosting) {
      return null
    }

    return saveTenderCosting({
      ...sourceCosting,
      id: 0,
      boqItemId: targetRow.id,
      tenderNumber: targetRow.tenderNumber,
      material: sourceCosting.material.map((item) => ({ ...item })),
      machining: sourceCosting.machining.map((item) => ({ ...item })),
      coating: sourceCosting.coating.map((item) => ({ ...item })),
      consumable: sourceCosting.consumable.map((item) => ({ ...item })),
      subcontract: sourceCosting.subcontract.map((item) => ({ ...item })),
      productionLabour: Object.fromEntries(
        Object.entries(sourceCosting.productionLabour).map(([stage, value]) => [
          stage,
          { ...value },
        ])
      ) as TenderCosting['productionLabour'],
      installationLabour: { ...sourceCosting.installationLabour },
    })
  })

  return (await Promise.all(copyTasks)).filter(Boolean)
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

function getTableTotals(
  rows: BoqItem[],
  costings: TenderCosting[],
  masterItems: MasterListItem[]
) {
  return rows.reduce(
    (totals, row) => {
      const summary = getRowSummary(row, costings, masterItems)

      if (!summary) return totals

      return {
        materialUnitCost:
          totals.materialUnitCost + summary.materialUnitCost,
        productionLabourUnitCost:
          totals.productionLabourUnitCost + summary.productionLabourUnitCost,
        machiningUnitCost:
          totals.machiningUnitCost + summary.machiningUnitCost,
        coatingUnitCost:
          totals.coatingUnitCost + summary.coatingUnitCost,
        consumableUnitCost:
          totals.consumableUnitCost + summary.consumableUnitCost,
        subcontractUnitCost:
          totals.subcontractUnitCost + summary.subcontractUnitCost,
        installationLabourUnitCost:
          totals.installationLabourUnitCost + summary.installationLabourUnitCost,
        supplyUnitCost:
          totals.supplyUnitCost + summary.supplyUnitCost,
        supplyTotalCost:
          totals.supplyTotalCost + summary.supplyTotalCost,
        installationUnitCost:
          totals.installationUnitCost + summary.installationUnitCost,
        installationTotalCost:
          totals.installationTotalCost + summary.installationTotalCost,
        unitCost: totals.unitCost + summary.unitCost,
        totalCost: totals.totalCost + summary.totalCost,
        sellingRate: totals.sellingRate + summary.sellingRate,
        sellingAmount: totals.sellingAmount + summary.sellingAmount,
      }
    },
    {
      materialUnitCost: 0,
      productionLabourUnitCost: 0,
      machiningUnitCost: 0,
      coatingUnitCost: 0,
      consumableUnitCost: 0,
      subcontractUnitCost: 0,
      installationLabourUnitCost: 0,
      supplyUnitCost: 0,
      supplyTotalCost: 0,
      installationUnitCost: 0,
      installationTotalCost: 0,
      unitCost: 0,
      totalCost: 0,
      sellingRate: 0,
      sellingAmount: 0,
    }
  )
}

function getCommonValuesForRows(rows: BoqItem[]): CommonValues {
  const firstRow = rows[0]

  return firstRow
    ? {
        prelimsPercent: Number(firstRow.prelimsPercent || 0),
        fohPercent: Number(firstRow.fohPercent || 0),
        commitmentsPercent: Number(firstRow.commitmentsPercent || 0),
        contingenciesPercent: Number(firstRow.contingenciesPercent || 0),
        markup: Number(firstRow.markup || 0),
      }
    : createEmptyCommonValues()
}

function applyCommonValuesToRow(row: BoqItem, commonValues: CommonValues): BoqItem {
  return {
    ...row,
    prelimsPercent: commonValues.prelimsPercent,
    fohPercent: commonValues.fohPercent,
    commitmentsPercent: commonValues.commitmentsPercent,
    contingenciesPercent: commonValues.contingenciesPercent,
    markup: commonValues.markup,
  }
}

function applyCommonValuesToRows(rows: BoqItem[], commonValues: CommonValues) {
  return rows.map((row) => applyCommonValuesToRow(row, commonValues))
}

function isNumericBoqField(field: keyof BoqItem): field is NumericBoqField {
  return ['quantity', 'freightCustomDutyPercent', 'prelimsPercent', 'markup'].includes(field)
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
