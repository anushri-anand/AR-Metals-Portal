'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import {
  formatIndianMoney,
  formatIndianQuantity,
  toNumber,
} from '@/lib/number-format'

type PurchaseOrderItem = {
  line_number: number
  item_description: string
  quantity: string | number
  unit: string
  rate: string | number
}

type PurchaseOrderRecord = {
  id: number
  po_number: string
  supplier_name: string
  purchase_items: PurchaseOrderItem[]
}

type InventoryIssuanceRecord = {
  id: number
  po_number: string
  line_number: number
  quantity_issued: string | number
}

type InventoryStatusRow = {
  key: string
  poNumber: string
  supplierName: string
  itemDescription: string
  rate: number
  totalProcuredQuantity: number
  totalProcuredAmount: number
  quantityIssued: number
  totalAmountTransferred: number
  remainingQuantity: number
  remainingInventoryAmount: number
}

export default function InventoryStatusClient() {
  const [rows, setRows] = useState<InventoryStatusRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [stocksOnly, setStocksOnly] = useState(false)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [purchaseOrderData, issuanceData] = await Promise.all([
          fetchAPI('/procurement/purchase-order/?order_type=inventory&status=approved'),
          fetchAPI('/procurement/inventory-issuance/'),
        ])

        const inventoryOrders = Array.isArray(purchaseOrderData)
          ? (purchaseOrderData as PurchaseOrderRecord[])
          : []
        const issuances = Array.isArray(issuanceData)
          ? (issuanceData as InventoryIssuanceRecord[])
          : []

        const issuedQuantityByLine = new Map<string, number>()

        for (const issuance of issuances) {
          const key = `${issuance.po_number}::${issuance.line_number}`
          issuedQuantityByLine.set(
            key,
            (issuedQuantityByLine.get(key) || 0) + toNumber(issuance.quantity_issued)
          )
        }

        const nextRows = inventoryOrders
          .flatMap((order) =>
            (order.purchase_items || []).map((item) => {
              const key = `${order.po_number}::${item.line_number}`
              const totalProcuredQuantity = toNumber(item.quantity)
              const rate = toNumber(item.rate)
              const quantityIssued = issuedQuantityByLine.get(key) || 0
              const remainingQuantity = Math.max(
                totalProcuredQuantity - quantityIssued,
                0
              )

              return {
                key,
                poNumber: order.po_number,
                supplierName: order.supplier_name || '-',
                itemDescription: item.item_description || '-',
                rate,
                totalProcuredQuantity,
                totalProcuredAmount: totalProcuredQuantity * rate,
                quantityIssued,
                totalAmountTransferred: quantityIssued * rate,
                remainingQuantity,
                remainingInventoryAmount: remainingQuantity * rate,
              } satisfies InventoryStatusRow
            })
          )
          .sort((left, right) => {
            const poCompare = left.poNumber.localeCompare(right.poNumber)
            if (poCompare !== 0) {
              return poCompare
            }

            return left.itemDescription.localeCompare(right.itemDescription)
          })

        setRows(nextRows)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load inventory status.'
        )
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [])

  const filteredRows = useMemo(
    () => rows.filter((row) => (!stocksOnly ? true : row.remainingQuantity > 0)),
    [rows, stocksOnly]
  )

  const totals = useMemo(
    () =>
      filteredRows.reduce(
        (summary, row) => {
          summary.totalProcuredAmount += row.totalProcuredAmount
          summary.totalAmountTransferred += row.totalAmountTransferred
          summary.remainingInventoryAmount += row.remainingInventoryAmount
          return summary
        },
        {
          totalProcuredAmount: 0,
          totalAmountTransferred: 0,
          remainingInventoryAmount: 0,
        }
      ),
    [filteredRows]
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Inventory Status</h1>
        <p className="mt-2 text-slate-700">
          Review procured inventory, transferred quantity, and remaining stock amount.
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setStocksOnly((current) => !current)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              stocksOnly
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50'
            }`}
          >
            Stocks
          </button>
          <button
            type="button"
            onClick={() => setStocksOnly(false)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Show All
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-slate-700">Loading inventory status...</div>
        ) : (
          <div className="max-h-[72vh] overflow-auto">
            <table className="min-w-[1520px] w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
                <tr>
                  <HeaderCell>PO #</HeaderCell>
                  <HeaderCell>Supplier Name</HeaderCell>
                  <HeaderCell>Item Description</HeaderCell>
                  <HeaderCell>Rate</HeaderCell>
                  <HeaderCell>Total Procured Quantity</HeaderCell>
                  <HeaderCell>Total Procured Amount</HeaderCell>
                  <HeaderCell>Quantity Issued</HeaderCell>
                  <HeaderCell>Total Amount Transferred</HeaderCell>
                  <HeaderCell>Remaining Qty</HeaderCell>
                  <HeaderCell>Remaining Inventory Amount</HeaderCell>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length > 0 ? (
                  filteredRows.map((row) => (
                    <tr key={row.key}>
                      <BodyCell>{row.poNumber}</BodyCell>
                      <BodyCell>{row.supplierName}</BodyCell>
                      <BodyCell>{row.itemDescription}</BodyCell>
                      <BodyCell align="right">{formatIndianMoney(row.rate)}</BodyCell>
                      <BodyCell align="right">
                        {formatIndianQuantity(row.totalProcuredQuantity)}
                      </BodyCell>
                      <BodyCell align="right">
                        {formatIndianMoney(row.totalProcuredAmount)}
                      </BodyCell>
                      <BodyCell align="right">
                        {formatIndianQuantity(row.quantityIssued)}
                      </BodyCell>
                      <BodyCell align="right">
                        {formatIndianMoney(row.totalAmountTransferred)}
                      </BodyCell>
                      <BodyCell align="right">
                        {formatIndianQuantity(row.remainingQuantity)}
                      </BodyCell>
                      <BodyCell align="right">
                        {formatIndianMoney(row.remainingInventoryAmount)}
                      </BodyCell>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={10}
                      className="border border-slate-200 px-4 py-8 text-center text-slate-600"
                    >
                      No inventory rows found for the selected view.
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="sticky bottom-0 z-10 bg-slate-100">
                <tr>
                  <td className="border border-slate-200 px-4 py-3" />
                  <td className="border border-slate-200 px-4 py-3" />
                  <td className="border border-slate-200 px-4 py-3 text-right font-semibold text-slate-900">
                    Total
                  </td>
                  <td className="border border-slate-200 px-4 py-3" />
                  <td className="border border-slate-200 px-4 py-3" />
                  <td className="border border-slate-200 px-4 py-3 text-right font-semibold text-slate-900">
                    {formatIndianMoney(totals.totalProcuredAmount)}
                  </td>
                  <td className="border border-slate-200 px-4 py-3" />
                  <td className="border border-slate-200 px-4 py-3 text-right font-semibold text-slate-900">
                    {formatIndianMoney(totals.totalAmountTransferred)}
                  </td>
                  <td className="border border-slate-200 px-4 py-3" />
                  <td className="border border-slate-200 px-4 py-3 text-right font-semibold text-slate-900">
                    {formatIndianMoney(totals.remainingInventoryAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-r border-slate-200 px-4 py-3 font-semibold">
      {children}
    </th>
  )
}

function BodyCell({
  children,
  align = 'left',
}: {
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <td
      className={`border-b border-r border-slate-200 px-4 py-3 text-slate-800 ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </td>
  )
}
