'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'

type PurchaseOrderItem = {
  line_number: number
  item_description: string
}

type ProjectPurchaseOrder = {
  id: number
  po_number: string
  project_name: string
  project_number: string
  purchase_items: PurchaseOrderItem[]
}

type InventoryPurchaseOrder = {
  id: number
  po_number: string
  supplier_name: string
  purchase_items: PurchaseOrderItem[]
}

type InventoryIssuanceRecord = {
  id: number
  po_number: string
  line_number: number
  item_description: string
  project_name: string
  project_number: string
  quantity_issued: string | number
  rate: string | number
  amount: string | number
}

type AllocationRecord = {
  relevant_po_number: string
  relevant_line_number: number
  inventory_po_number: string
  inventory_line_number: number
  relevant_cost_percentage: string | number
}

type InventorySelection = {
  key: string
  inventoryPoNumber: string
  inventoryLineNumber: number
  projectName: string
  projectNumber: string
  itemDescription: string
  issuedQuantity: number
  issuedAmount: number
}

export default function InventoryRelevantCostClient() {
  const [inventoryPurchaseOrders, setInventoryPurchaseOrders] = useState<InventoryPurchaseOrder[]>([])
  const [projectPurchaseOrders, setProjectPurchaseOrders] = useState<ProjectPurchaseOrder[]>([])
  const [issuances, setIssuances] = useState<InventoryIssuanceRecord[]>([])
  const [selectedInventoryPoNumber, setSelectedInventoryPoNumber] = useState('')
  const [selectedSupplierName, setSelectedSupplierName] = useState('')
  const [selectedRelevantPoNumber, setSelectedRelevantPoNumber] = useState('')
  const [selectedInventoryKey, setSelectedInventoryKey] = useState('')
  const [allocationInputs, setAllocationInputs] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [loadingAllocations, setLoadingAllocations] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [inventoryPoData, projectPoData, issuanceData] = await Promise.all([
          fetchAPI('/procurement/purchase-order/?order_type=inventory&status=approved'),
          fetchAPI('/procurement/purchase-order/?order_type=project&status=approved'),
          fetchAPI('/procurement/inventory-issuance/'),
        ])

        setInventoryPurchaseOrders(
          Array.isArray(inventoryPoData) ? (inventoryPoData as InventoryPurchaseOrder[]) : []
        )
        setProjectPurchaseOrders(
          Array.isArray(projectPoData) ? (projectPoData as ProjectPurchaseOrder[]) : []
        )
        setIssuances(Array.isArray(issuanceData) ? (issuanceData as InventoryIssuanceRecord[]) : [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load relevant cost data.')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const supplierOptions = useMemo(
    () =>
      Array.from(
        new Set(
          inventoryPurchaseOrders.map((purchaseOrder) => purchaseOrder.supplier_name || '').filter(Boolean)
        )
      ).sort((left, right) => left.localeCompare(right)),
    [inventoryPurchaseOrders]
  )

  const filteredInventoryPurchaseOrders = useMemo(() => {
    if (!selectedSupplierName) {
      return inventoryPurchaseOrders
    }

    return inventoryPurchaseOrders.filter(
      (purchaseOrder) => purchaseOrder.supplier_name === selectedSupplierName
    )
  }, [inventoryPurchaseOrders, selectedSupplierName])

  const selectedInventoryPo = useMemo(
    () =>
      inventoryPurchaseOrders.find((purchaseOrder) => purchaseOrder.po_number === selectedInventoryPoNumber) ||
      null,
    [inventoryPurchaseOrders, selectedInventoryPoNumber]
  )

  const availableRelevantPurchaseOrders = useMemo(() => {
    if (!selectedInventoryPo) {
      return []
    }

    const projectNumbers = new Set(
      issuances
        .filter((issuance) => issuance.po_number === selectedInventoryPo.po_number)
        .map((issuance) => issuance.project_number)
        .filter(Boolean)
    )

    return projectPurchaseOrders.filter((purchaseOrder) =>
      projectNumbers.has(purchaseOrder.project_number)
    )
  }, [issuances, projectPurchaseOrders, selectedInventoryPo])

  const selectedRelevantPo = useMemo(
    () =>
      availableRelevantPurchaseOrders.find(
        (purchaseOrder) => purchaseOrder.po_number === selectedRelevantPoNumber
      ) || null,
    [availableRelevantPurchaseOrders, selectedRelevantPoNumber]
  )

  const availableInventorySelections = useMemo(() => {
    if (!selectedInventoryPo || !selectedRelevantPo) {
      return []
    }

    const grouped = new Map<string, InventorySelection>()

    for (const issuance of issuances) {
      if (issuance.po_number !== selectedInventoryPo.po_number) {
        continue
      }

      if (issuance.project_number !== selectedRelevantPo.project_number) {
        continue
      }

      const key = `${issuance.po_number}::${issuance.line_number}`
      const existing = grouped.get(key)
      const issuedAmount = toNumber(issuance.amount)
      const issuedQuantity = toNumber(issuance.quantity_issued)

      if (existing) {
        existing.issuedAmount += issuedAmount
        existing.issuedQuantity += issuedQuantity
        continue
      }

      grouped.set(key, {
        key,
        inventoryPoNumber: issuance.po_number,
        inventoryLineNumber: Number(issuance.line_number),
        projectName: issuance.project_name || '',
        projectNumber: issuance.project_number || '',
        itemDescription: issuance.item_description || '',
        issuedQuantity,
        issuedAmount,
      })
    }

    return Array.from(grouped.values()).sort((left, right) =>
      `${left.inventoryPoNumber} ${left.itemDescription}`.localeCompare(
        `${right.inventoryPoNumber} ${right.itemDescription}`
      )
    )
  }, [issuances, selectedInventoryPo, selectedRelevantPo])

  const selectedInventory = useMemo(
    () => availableInventorySelections.find((item) => item.key === selectedInventoryKey) || null,
    [availableInventorySelections, selectedInventoryKey]
  )

  useEffect(() => {
    setSelectedRelevantPoNumber('')
    setSelectedInventoryKey('')
    setAllocationInputs({})
    setMessage('')
    setError('')
  }, [selectedInventoryPoNumber])

  useEffect(() => {
    setSelectedInventoryKey('')
    setAllocationInputs({})
    setMessage('')
    setError('')
  }, [selectedRelevantPoNumber])

  useEffect(() => {
    async function loadExistingAllocations() {
      if (!selectedRelevantPo || !selectedInventory) {
        setAllocationInputs({})
        return
      }

      setLoadingAllocations(true)
      setError('')

      try {
        const params = new URLSearchParams({
          relevant_po_number: selectedRelevantPo.po_number,
          inventory_po_number: selectedInventory.inventoryPoNumber,
          inventory_line_number: String(selectedInventory.inventoryLineNumber),
        })
        const data = await fetchAPI(`/procurement/inventory-relevant-cost/?${params.toString()}`)
        const nextInputs: Record<number, string> = {}

        for (const row of Array.isArray(data) ? (data as AllocationRecord[]) : []) {
          nextInputs[Number(row.relevant_line_number)] = String(row.relevant_cost_percentage || '')
        }

        setAllocationInputs(nextInputs)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load saved relevant cost.')
      } finally {
        setLoadingAllocations(false)
      }
    }

    void loadExistingAllocations()
  }, [selectedInventory, selectedRelevantPo])

  const totalRelevantPercentage = useMemo(
    () =>
      Object.values(allocationInputs).reduce((sum, value) => sum + toNumber(value), 0),
    [allocationInputs]
  )

  const totalTransferredAmount = useMemo(() => {
    const issuedAmount = selectedInventory?.issuedAmount || 0
    return issuedAmount * (totalRelevantPercentage / 100)
  }, [selectedInventory, totalRelevantPercentage])

  async function handleSave() {
    if (!selectedRelevantPo) {
      setError('Relevant PO is required.')
      return
    }

    if (!selectedInventoryPo) {
      setError('PO # is required.')
      return
    }

    if (!selectedInventory) {
      setError('Item is required.')
      return
    }

    if (totalRelevantPercentage > 100) {
      setError('Total Relevant Cost % cannot exceed 100.')
      return
    }

    setSaving(true)
    setMessage('')
    setError('')

    try {
      await fetchAPI('/procurement/inventory-relevant-cost/', {
        method: 'POST',
        body: JSON.stringify({
          relevant_po_number: selectedRelevantPo.po_number,
          inventory_po_number: selectedInventoryPo.po_number,
          inventory_line_number: selectedInventory.inventoryLineNumber,
          allocations: (selectedRelevantPo.purchase_items || []).map((item) => ({
            relevant_line_number: item.line_number,
            relevant_cost_percentage: allocationInputs[item.line_number] || '0',
          })),
        }),
      })

      setMessage('Relevant cost updated successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save relevant cost.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Update Relevant Cost</h1>
        <p className="mt-2 text-slate-700">
          Allocate inventory issued amount into the selected relevant project PO items.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="PO #">
            <select
              value={selectedInventoryPoNumber}
              onChange={(event) => {
                const nextPoNumber = event.target.value
                const selectedPurchaseOrder =
                  inventoryPurchaseOrders.find((purchaseOrder) => purchaseOrder.po_number === nextPoNumber) ||
                  null
                setSelectedInventoryPoNumber(nextPoNumber)
                setSelectedSupplierName(selectedPurchaseOrder?.supplier_name || '')
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              disabled={loading}
            >
              <option value="">{loading ? 'Loading inventory PO #' : 'Select inventory PO #'}</option>
              {filteredInventoryPurchaseOrders.map((purchaseOrder) => (
                <option key={purchaseOrder.id} value={purchaseOrder.po_number}>
                  {purchaseOrder.po_number}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Supplier">
            <select
              value={selectedSupplierName}
              onChange={(event) => {
                setSelectedSupplierName(event.target.value)
                setSelectedInventoryPoNumber('')
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              disabled={loading}
            >
              <option value="">{loading ? 'Loading suppliers...' : 'Select supplier'}</option>
              {supplierOptions.map((supplier) => (
                <option key={supplier} value={supplier}>
                  {supplier}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Relevant PO #">
            <select
              value={selectedRelevantPoNumber}
              onChange={(event) => setSelectedRelevantPoNumber(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              disabled={!selectedInventoryPo}
            >
              <option value="">
                {selectedInventoryPo ? 'Select relevant PO' : 'Select PO # first'}
              </option>
              {availableRelevantPurchaseOrders.map((purchaseOrder) => (
                <option key={purchaseOrder.id} value={purchaseOrder.po_number}>
                  {purchaseOrder.po_number}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Item">
            <select
              value={selectedInventoryKey}
              onChange={(event) => setSelectedInventoryKey(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              disabled={!selectedRelevantPo}
            >
              <option value="">
                {selectedRelevantPo ? 'Select issued inventory item' : 'Select relevant PO first'}
              </option>
              {availableInventorySelections.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.itemDescription}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {selectedRelevantPo ? (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <ReadOnlyField label="Supplier" value={selectedInventoryPo?.supplier_name || '-'} />
            <ReadOnlyField label="Project Name" value={selectedRelevantPo.project_name || '-'} />
            <ReadOnlyField label="Project #" value={selectedRelevantPo.project_number || '-'} />
            <ReadOnlyField label="Issued Amount" value={formatMoney(selectedInventory?.issuedAmount || 0)} />
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900">Relevant PO Items</h2>
          <p className="mt-2 text-sm text-slate-600">
            Displaying all items in the selected relevant PO.
          </p>
        </div>

        <div className="max-h-[70vh] overflow-auto">
          <table className="min-w-[980px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
              <tr>
                <HeaderCell>Line #</HeaderCell>
                <HeaderCell>Item Description</HeaderCell>
                <HeaderCell>Relevant Cost %</HeaderCell>
                <HeaderCell>Transferred Relevant Cost</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <BodyCell colSpan={4}>Loading relevant cost setup...</BodyCell>
                </tr>
              ) : !selectedRelevantPo ? (
                <tr>
                  <BodyCell colSpan={4}>Select a relevant PO to display its items.</BodyCell>
                </tr>
              ) : selectedRelevantPo.purchase_items.length > 0 ? (
                selectedRelevantPo.purchase_items.map((item) => {
                  const percentage = toNumber(allocationInputs[item.line_number])
                  const transferredAmount = (selectedInventory?.issuedAmount || 0) * (percentage / 100)

                  return (
                    <tr key={item.line_number} className="border-b border-slate-200">
                      <BodyCell>{item.line_number}</BodyCell>
                      <BodyCell>{item.item_description || '-'}</BodyCell>
                      <BodyCell>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={allocationInputs[item.line_number] || ''}
                          onChange={(event) =>
                            setAllocationInputs((prev) => ({
                              ...prev,
                              [item.line_number]: event.target.value,
                            }))
                          }
                          disabled={!selectedInventory || loadingAllocations}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          placeholder="Enter %"
                        />
                      </BodyCell>
                      <BodyCell className="text-right">
                        {formatMoney(transferredAmount)}
                      </BodyCell>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <BodyCell colSpan={4}>No items found in the selected relevant PO.</BodyCell>
                </tr>
              )}
            </tbody>
            {selectedRelevantPo ? (
              <tfoot className="sticky bottom-0 z-10 bg-slate-50 font-semibold">
                <tr>
                  <BodyCell className="text-right text-slate-900" colSpan={2}>
                    Total
                  </BodyCell>
                  <BodyCell className="text-right font-semibold text-slate-900">
                    {formatPercent(totalRelevantPercentage)}
                  </BodyCell>
                  <BodyCell className="text-right font-semibold text-slate-900">
                    {formatMoney(totalTransferredAmount)}
                  </BodyCell>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !selectedRelevantPo || !selectedInventory}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Relevant Cost'}
        </button>
        {message ? <p className="text-sm text-green-700">{message}</p> : null}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-800">{label}</label>
      {children}
    </div>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <input
        value={value}
        readOnly
        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-900"
      />
    </Field>
  )
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return <th className="border-b border-r border-slate-200 px-4 py-3 font-semibold">{children}</th>
}

function BodyCell({
  children,
  className = '',
  colSpan,
}: {
  children: React.ReactNode
  className?: string
  colSpan?: number
}) {
  return (
    <td
      className={`border-r border-slate-200 px-4 py-3 align-top text-slate-700 ${className}`}
      colSpan={colSpan}
    >
      {children}
    </td>
  )
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatMoney(value: number) {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatPercent(value: number) {
  return `${value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`
}
