'use client'

import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '@/lib/api'
import { openPurchaseOrderPreview } from '@/lib/purchase-order-preview'

type PurchaseOrderStatus = 'draft' | 'submitted' | 'approved'

type PurchaseItem = {
  line_number: number
  item_description: string
  quantity: string | number
  unit: string
  currency?: string
  source_rate?: string | number
  rate: string | number
  vat_percent?: string | number
  source_amount?: string | number
  vat?: string | number
  amount?: string | number
}

type PurchaseOrderRecord = {
  id: number
  order_type: 'project' | 'asset' | 'inventory'
  status: PurchaseOrderStatus
  po_number: string
  project_number: string
  project_name: string
  po_date_original: string
  po_rev_number: string
  supplier_name: string
  supplier_contact_person_name: string
  supplier_mobile_number: string
  supplier_company_telephone: string
  supplier_country: string
  supplier_city: string
  purchase_items: PurchaseItem[]
  mode_of_payment: string
  remarks: string
  po_amount: string | number
  vat_aed: string | number
  po_amount_inc_vat_aed: string | number
  pdf_filename: string
  submitted_at: string | null
  approved_at: string | null
}

type PurchaseOrderViewClientProps = {
  orderType: 'project' | 'asset' | 'inventory'
  title: string
}

type MeResponse = {
  role: string
}

export default function PurchaseOrderViewClient({
  orderType,
  title,
}: PurchaseOrderViewClientProps) {
  const [orders, setOrders] = useState<PurchaseOrderRecord[]>([])
  const [userRole, setUserRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [approvingId, setApprovingId] = useState<number | null>(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError('')

      try {
        const [purchaseOrders, me] = await Promise.all([
          fetchAPI(`/procurement/purchase-order/?order_type=${orderType}`),
          fetchAPI('/accounts/me/'),
        ])

        setOrders(
          (purchaseOrders || []).filter(
            (order: PurchaseOrderRecord) => order.status !== 'draft'
          )
        )
        setUserRole((me as MeResponse)?.role || '')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load purchase orders.')
      } finally {
        setLoading(false)
      }
    }

    void loadData()
  }, [orderType])

  const submittedOrders = useMemo(
    () => orders.filter((order) => order.status === 'submitted'),
    [orders]
  )

  const approvedOrders = useMemo(
    () => orders.filter((order) => order.status === 'approved'),
    [orders]
  )

  const isAdmin = userRole === 'admin'

  function handlePreview(order: PurchaseOrderRecord) {
    openPurchaseOrderPreview({
      poNumber: order.po_number,
      poDateOriginal: order.po_date_original,
      supplier: {
        supplierName: order.supplier_name,
        contactPersonName: order.supplier_contact_person_name,
        mobileNumber: order.supplier_mobile_number,
        companyTelephone: order.supplier_company_telephone,
        country: order.supplier_country,
        city: order.supplier_city,
      },
      items: (order.purchase_items || []).map((item) => ({
        item: item.item_description,
        quantity: item.quantity,
        unit: item.unit,
        currency: item.currency,
        rate: item.source_rate ?? item.rate,
        vatPercent: item.vat_percent,
        vatAmount:
          ((Number((item.source_amount ?? item.amount) || 0) * Number(item.vat_percent || 0)) /
            100).toFixed(2),
        vat:
          ((Number((item.source_amount ?? item.amount) || 0) * Number(item.vat_percent || 0)) /
            100).toFixed(2),
        amount: item.source_amount ?? item.amount,
      })),
      remarks: order.remarks,
      modeOfPayment: order.mode_of_payment,
      poAmount: (order.purchase_items || []).reduce(
        (total, item) => total + Number((item.source_amount ?? item.amount) || 0),
        0
      ),
      vatAed: (order.purchase_items || []).reduce(
        (total, item) =>
          total +
          (Number((item.source_amount ?? item.amount) || 0) * Number(item.vat_percent || 0)) /
            100,
        0
      ),
      poAmountIncVatAed:
        (order.purchase_items || []).reduce(
          (total, item) =>
            total +
            Number((item.source_amount ?? item.amount) || 0) +
            (Number((item.source_amount ?? item.amount) || 0) * Number(item.vat_percent || 0)) /
              100,
          0
        ),
      currency:
        order.purchase_items.find((item) => String(item.currency || '').trim())?.currency ||
        'AED',
    })
  }

  async function handleApprove(orderId: number) {
    setApprovingId(orderId)
    setMessage('')
    setError('')

    try {
      const approvedOrder = await fetchAPI(`/procurement/purchase-order/${orderId}/approve/`, {
        method: 'POST',
      })

      setOrders((prev) =>
        prev.map((order) => (order.id === orderId ? approvedOrder : order))
      )
      setMessage('Purchase order approved and moved to the View section.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve purchase order.')
    } finally {
      setApprovingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-slate-900">
          Submitted purchase orders wait for admin approval. Approved purchase
          orders stay here with PDF preview under the PO number file name.
        </p>
        {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-slate-900">
          Loading purchase orders...
        </div>
      ) : null}

      {!loading && isAdmin ? (
        <OrderTableSection
          title="Submitted For Approval"
          emptyMessage="No submitted purchase orders are waiting for approval."
          orders={submittedOrders}
          actionLabel={approvingId ? 'Approving...' : 'Approve'}
          onAction={handleApprove}
          actionDisabledId={approvingId}
          onPreview={handlePreview}
        />
      ) : null}

      {!loading ? (
        <OrderTableSection
          title="Approved Purchase Orders"
          emptyMessage="No approved purchase orders found yet."
          orders={approvedOrders}
          onPreview={handlePreview}
        />
      ) : null}
    </div>
  )
}

function OrderTableSection({
  title,
  emptyMessage,
  orders,
  onPreview,
  onAction,
  actionLabel = 'Approve',
  actionDisabledId,
}: {
  title: string
  emptyMessage: string
  orders: PurchaseOrderRecord[]
  onPreview: (order: PurchaseOrderRecord) => void
  onAction?: (orderId: number) => void
  actionLabel?: string
  actionDisabledId?: number | null
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      {orders.length === 0 ? (
        <div className="p-6 text-sm text-slate-900">{emptyMessage}</div>
      ) : (
        <div className="max-h-[60vh] overflow-auto">
          <table className="min-w-[1240px] border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-900">
              <tr>
                <HeaderCell>PO #</HeaderCell>
                <HeaderCell>PDF</HeaderCell>
                <HeaderCell>Project #</HeaderCell>
                <HeaderCell>Project Name</HeaderCell>
                <HeaderCell>Supplier</HeaderCell>
                <HeaderCell>PO Date</HeaderCell>
                <HeaderCell>Rev #</HeaderCell>
                <HeaderCell>PO Amount</HeaderCell>
                <HeaderCell>VAT AED</HeaderCell>
                <HeaderCell>Total AED</HeaderCell>
                <HeaderCell>Status</HeaderCell>
                <HeaderCell>Submitted</HeaderCell>
                <HeaderCell>Approved</HeaderCell>
                <HeaderCell>Actions</HeaderCell>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b border-slate-200">
                  <BodyCell>{order.po_number}</BodyCell>
                  <BodyCell>{order.pdf_filename}</BodyCell>
                  <BodyCell>{order.project_number || '-'}</BodyCell>
                  <BodyCell>{order.project_name || '-'}</BodyCell>
                  <BodyCell>{order.supplier_name}</BodyCell>
                  <BodyCell>{formatDate(order.po_date_original)}</BodyCell>
                  <BodyCell>{order.po_rev_number || '-'}</BodyCell>
                  <BodyCell>{formatAmount(order.po_amount)}</BodyCell>
                  <BodyCell>{formatAmount(order.vat_aed)}</BodyCell>
                  <BodyCell>{formatAmount(order.po_amount_inc_vat_aed)}</BodyCell>
                  <BodyCell className="capitalize">{order.status}</BodyCell>
                  <BodyCell>{formatDateTime(order.submitted_at)}</BodyCell>
                  <BodyCell>{formatDateTime(order.approved_at)}</BodyCell>
                  <BodyCell>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onPreview(order)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-900 hover:bg-slate-50"
                      >
                        Preview PDF
                      </button>
                      {onAction ? (
                        <button
                          type="button"
                          onClick={() => onAction(order.id)}
                          disabled={actionDisabledId === order.id}
                          className="rounded-lg bg-slate-950 px-3 py-1.5 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {actionDisabledId === order.id ? actionLabel : 'Approve'}
                        </button>
                      ) : null}
                    </div>
                  </BodyCell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function HeaderCell({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-r border-slate-200 px-4 py-3 font-semibold text-slate-900">
      {children}
    </th>
  )
}

function BodyCell({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <td
      className={`border-r border-slate-200 px-4 py-3 align-top text-slate-900 ${className}`}
    >
      {children}
    </td>
  )
}

function formatAmount(value: string | number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed.toFixed(2) : '0.00'
}

function formatDate(value: string | null) {
  if (!value) return '-'
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB')
}

function formatDateTime(value: string | null) {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
