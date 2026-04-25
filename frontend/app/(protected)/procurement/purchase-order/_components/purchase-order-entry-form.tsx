'use client'

import { useEffect, useMemo, useState } from 'react'
import ProjectSelectFields from '@/components/project-select-fields'
import { fetchAPI } from '@/lib/api'
import {
  getAccountCodeOptions,
  getDefaultAccountCode,
  normalizeAccountCode,
  requiresManualAccountCode,
} from '@/lib/account-codes'
import { findNextDocumentNumber } from '@/lib/document-numbering'
import { openPurchaseOrderPreview } from '@/lib/purchase-order-preview'

type VendorOption = {
  id: number
  supplier_name: string
  contact_person_name: string
  mobile_number: string
  company_telephone: string
  country: string
  city: string
}

type PurchaseOrderItem = {
  item: string
  quantity: string
  unit: string
  currency: string
  rate: string
  rateAed: string
  vatPercent: string
  vatAmount: string
  amount: string
  amountAed: string
  depreciationPeriodYears: string
  depreciationStartDate: string
  depreciationEndDate: string
}

type FormState = {
  poNumber: string
  projectNumber: string
  projectName: string
  costCode: string
  accountCode: string
  poDateOriginal: string
  poDateRevised: string
  poRevNumber: string
  supplierName: string
  numberOfItems: string
  exchangeRate: string
  modeOfPayment: string
  remarks: string
}

type PurchaseOrderEntryFormProps = {
  title: string
  description: string
  successMessage: string
  orderType: 'project' | 'asset' | 'inventory'
  includeDepreciation?: boolean
  includeProjectFields?: boolean
}

const costCodeOptions = [
  'Material',
  'Machining',
  'Coating',
  'Consumables',
  'Subcontracts',
  'Labour',
  'Freight&Customs',
  'Prelims',
  'FOH',
  'Commitments',
  'Contingency',
] as const

const modeOfPaymentOptions = ['Cheque', 'Cash', 'Transfer', 'Card'] as const

const initialForm: FormState = {
  poNumber: '',
  projectNumber: '',
  projectName: '',
  costCode: '',
  accountCode: '',
  poDateOriginal: '',
  poDateRevised: '',
  poRevNumber: 'R0',
  supplierName: '',
  numberOfItems: '',
  exchangeRate: '',
  modeOfPayment: '',
  remarks: '',
}

function createEmptyItem(): PurchaseOrderItem {
  return {
    item: '',
    quantity: '',
    unit: '',
    currency: '',
    rate: '',
    rateAed: '0.00',
    vatPercent: '',
    vatAmount: '0.00',
    amount: '0.00',
    amountAed: '0.00',
    depreciationPeriodYears: '',
    depreciationStartDate: '',
    depreciationEndDate: '',
  }
}

function normalizeItemState(item?: Partial<PurchaseOrderItem>): PurchaseOrderItem {
  return {
    ...createEmptyItem(),
    ...item,
  }
}

export default function PurchaseOrderEntryForm({
  title,
  description,
  successMessage,
  orderType,
  includeDepreciation = false,
  includeProjectFields = true,
}: PurchaseOrderEntryFormProps) {
  const [vendors, setVendors] = useState<VendorOption[]>([])
  const [existingPoNumbers, setExistingPoNumbers] = useState<string[]>([])
  const [form, setForm] = useState<FormState>(initialForm)
  const [items, setItems] = useState<PurchaseOrderItem[]>([])
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loadingVendors, setLoadingVendors] = useState(true)
  const [activeAction, setActiveAction] = useState<'save' | 'submit' | null>(null)

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [vendorData, purchaseOrders] = await Promise.all([
          fetchAPI('/procurement/vendor-data/'),
          fetchAPI('/procurement/purchase-order/'),
        ])

        setVendors(vendorData)
        const nextPoNumbers = Array.isArray(purchaseOrders)
          ? purchaseOrders.map((order) => String(order.po_number || ''))
          : []
        setExistingPoNumbers(nextPoNumbers)
        setForm((prev) =>
          prev.poNumber
            ? prev
            : {
                ...prev,
                poNumber: findNextDocumentNumber(nextPoNumbers, 'PO'),
              }
        )
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load suppliers.')
      } finally {
        setLoadingVendors(false)
      }
    }

    void loadInitialData()
  }, [])

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.supplier_name === form.supplierName) || null,
    [vendors, form.supplierName]
  )
  const accountCodeOptions = useMemo(
    () => getAccountCodeOptions(form.costCode),
    [form.costCode]
  )

  const normalizedItems = useMemo(() => {
    return items.map((item) => {
      const normalizedItem = normalizeItemState(item)
      const amount = getItemAmount(normalizedItem)
      const exchangeRate = toNumber(form.exchangeRate)
      const rateAed = toNumber(normalizedItem.rate) * exchangeRate
      const amountAed = amount * exchangeRate
      const vatAmount = amountAed * (toNumber(normalizedItem.vatPercent) / 100)

      return {
        ...normalizedItem,
        rateAed: rateAed.toFixed(2),
        vatAmount: vatAmount.toFixed(2),
        amount: amount.toFixed(2),
        amountAed: amountAed.toFixed(2),
      }
    })
  }, [form.exchangeRate, items])

  const poAmountValue = useMemo(() => {
    return normalizedItems.reduce((total, item) => total + toNumber(item.amountAed), 0)
  }, [normalizedItems])

  const vatAedValue = useMemo(() => {
    return normalizedItems.reduce((total, item) => total + toNumber(item.vatAmount), 0)
  }, [normalizedItems])

  const poAmountIncVatAed = useMemo(() => {
    return poAmountValue + vatAedValue
  }, [poAmountValue, vatAedValue])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target

    if (name === 'costCode') {
      setForm((prev) => ({
        ...prev,
        costCode: value,
        accountCode: getDefaultAccountCode(value),
      }))
      return
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  function handleProjectChange(value: {
    projectNumber: string
    projectName: string
  }) {
    setForm((prev) => ({
      ...prev,
      projectNumber: value.projectNumber,
      projectName: value.projectName,
    }))
  }

  function handleNumberOfItemsChange(value: string) {
    const itemCount = Math.max(0, Math.trunc(toNumber(value)))

    setForm((prev) => ({
      ...prev,
      numberOfItems: value,
    }))

    setItems((prev) =>
      itemCount > 0
        ? Array.from({ length: itemCount }, (_, index) => normalizeItemState(prev[index]))
        : []
    )
  }

  function handleItemChange(
    index: number,
    field: keyof PurchaseOrderItem,
    value: string
  ) {
    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item

        const nextItem = {
          ...item,
          [field]: value,
        }

        if (
          includeDepreciation &&
          (field === 'depreciationPeriodYears' || field === 'depreciationStartDate')
        ) {
          nextItem.depreciationEndDate = calculateDepreciationEndDate(
            field === 'depreciationStartDate' ? value : nextItem.depreciationStartDate,
            field === 'depreciationPeriodYears' ? value : nextItem.depreciationPeriodYears
          )
        }

        return nextItem
      })
    )
  }

  function validateFormState() {
    if (!form.poNumber.trim()) {
      throw new Error('PO # is required.')
    }

    if (includeProjectFields) {
      if (!form.projectNumber.trim()) {
        throw new Error('Project # is required.')
      }

      if (!form.projectName.trim()) {
        throw new Error('Project Name is required.')
      }
    }

    if (!form.costCode) {
      throw new Error('Cost Code is required.')
    }

    if (!normalizeAccountCode(form.costCode, form.accountCode)) {
      throw new Error(
        requiresManualAccountCode(form.costCode)
          ? 'Account Code is required when Cost Code is FOH.'
          : 'Account Code is required.'
      )
    }

    if (!form.poDateOriginal) {
      throw new Error('Original PO date is required.')
    }

    if (!selectedVendor) {
      throw new Error('Please select a supplier from Vendor Data.')
    }

    if (!form.modeOfPayment) {
      throw new Error('Mode of payment is required.')
    }

    if (!form.exchangeRate || toNumber(form.exchangeRate) <= 0) {
      throw new Error('Exchange rate must be greater than 0.')
    }

    if (!normalizedItems.length) {
      throw new Error('Please add at least one line item.')
    }

    normalizedItems.forEach((item, index) => {
      const rowLabel = `Item ${index + 1}`

      if (!item.item.trim()) {
        throw new Error(`${rowLabel}: Item is required.`)
      }

      if (!item.quantity || toNumber(item.quantity) <= 0) {
        throw new Error(`${rowLabel}: Quantity must be greater than 0.`)
      }

      if (!item.unit.trim()) {
        throw new Error(`${rowLabel}: Unit is required.`)
      }

      if (!item.rate || toNumber(item.rate) < 0) {
        throw new Error(`${rowLabel}: Unit Price is required.`)
      }

      if (!item.currency.trim()) {
        throw new Error(`${rowLabel}: Currency is required.`)
      }

      if (!item.vatPercent.trim()) {
        throw new Error(`${rowLabel}: VAT % is required. Enter 0 if VAT does not apply.`)
      }

      if (toNumber(item.vatPercent) < 0) {
        throw new Error(`${rowLabel}: VAT % cannot be negative.`)
      }

      if (includeDepreciation && item.depreciationPeriodYears.trim()) {
        if (!item.depreciationStartDate) {
          throw new Error(`${rowLabel}: Depreciation Start Date is required.`)
        }
      }
    })
  }

  function buildPayload(status: 'draft' | 'submitted') {
    validateFormState()
    const normalizedAccountCode = normalizeAccountCode(form.costCode, form.accountCode)

    return {
      po_number: form.poNumber.trim(),
      order_type: orderType,
      status,
      project_number: includeProjectFields ? form.projectNumber.trim() : '',
      project_name: includeProjectFields ? form.projectName.trim() : '',
      cost_code: form.costCode,
      po_date_original: form.poDateOriginal,
      po_date_revised: form.poDateRevised || null,
      po_rev_number: form.poRevNumber.trim(),
      supplier_name: selectedVendor?.supplier_name || '',
      line_items: normalizedItems.map((item) => ({
        item: item.item.trim(),
        account_code: normalizedAccountCode,
        quantity: formatQuantity(item.quantity),
        unit: item.unit.trim(),
        currency: item.currency.trim(),
        exchange_rate: formatExchangeRate(form.exchangeRate),
        rate: formatDecimal(item.rate),
        rate_aed: item.rateAed,
        vat_percent: formatDecimal(item.vatPercent),
        vat: item.vatAmount,
        amount: item.amount,
        amount_aed: item.amountAed,
        depreciation_period_years: includeDepreciation
          ? item.depreciationPeriodYears.trim()
          : '',
        depreciation_start_date:
          includeDepreciation && item.depreciationStartDate
            ? item.depreciationStartDate
            : '',
        depreciation_end_date:
          includeDepreciation && item.depreciationEndDate ? item.depreciationEndDate : '',
      })),
      vat_aed: vatAedValue.toFixed(2),
      mode_of_payment: form.modeOfPayment,
      remarks: form.remarks.trim(),
    }
  }

  function buildPreviewData() {
    validateFormState()

    return {
      poNumber: form.poNumber.trim(),
      poDateOriginal: form.poDateOriginal,
      supplier: {
        supplierName: selectedVendor?.supplier_name || '',
        contactPersonName: selectedVendor?.contact_person_name || '',
        mobileNumber: selectedVendor?.mobile_number || '',
        companyTelephone: selectedVendor?.company_telephone || '',
        country: selectedVendor?.country || '',
        city: selectedVendor?.city || '',
      },
      items: normalizedItems.map((item) => ({
        item: item.item,
        quantity: item.quantity,
        unit: item.unit,
        currency: item.currency,
        rate: item.rate,
        vatPercent: item.vatPercent,
        vatAmount: ((toNumber(item.amount) * toNumber(item.vatPercent)) / 100).toFixed(2),
        vat: ((toNumber(item.amount) * toNumber(item.vatPercent)) / 100).toFixed(2),
        amount: item.amount,
      })),
      remarks: form.remarks,
      modeOfPayment: form.modeOfPayment,
      poAmount: normalizedItems
        .reduce((total, item) => total + toNumber(item.amount), 0)
        .toFixed(2),
      vatAed: normalizedItems
        .reduce(
          (total, item) =>
            total + (toNumber(item.amount) * toNumber(item.vatPercent)) / 100,
          0
        )
        .toFixed(2),
      poAmountIncVatAed: normalizedItems
        .reduce(
          (total, item) =>
            total +
            toNumber(item.amount) +
            (toNumber(item.amount) * toNumber(item.vatPercent)) / 100,
          0
        )
        .toFixed(2),
      currency: normalizedItems.find((item) => item.currency.trim())?.currency || 'AED',
    }
  }

  async function handleSave() {
    setMessage('')
    setError('')
    setActiveAction('save')

    try {
      const savedOrder = await fetchAPI('/procurement/purchase-order/entry/', {
        method: 'POST',
        body: JSON.stringify(buildPayload('draft')),
      })

      const nextPoNumbers = [
        ...existingPoNumbers.filter((value) => value !== savedOrder.po_number),
        String(savedOrder.po_number || ''),
      ]
      setExistingPoNumbers(nextPoNumbers)
      setForm((prev) => ({
        ...prev,
        poNumber: findNextDocumentNumber(nextPoNumbers, 'PO'),
        poRevNumber: 'R0',
      }))
      setMessage(successMessage)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save purchase order.')
    } finally {
      setActiveAction(null)
    }
  }

  async function handleSubmit() {
    setMessage('')
    setError('')
    setActiveAction('submit')

    try {
      const savedOrder = await fetchAPI('/procurement/purchase-order/entry/', {
        method: 'POST',
        body: JSON.stringify(buildPayload('submitted')),
      })

      const nextPoNumbers = [
        ...existingPoNumbers.filter((value) => value !== savedOrder.po_number),
        String(savedOrder.po_number || ''),
      ]
      setExistingPoNumbers(nextPoNumbers)
      setForm((prev) => ({
        ...prev,
        poNumber: findNextDocumentNumber(nextPoNumbers, 'PO'),
        poRevNumber: 'R0',
      }))
      setMessage('Purchase order submitted to admin for approval.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit purchase order.')
    } finally {
      setActiveAction(null)
    }
  }

  function handleDraftPreview() {
    setMessage('')
    setError('')

    try {
      openPurchaseOrderPreview(buildPreviewData(), { autoPrint: false })
      setMessage('Draft PDF preview opened.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open draft preview.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-slate-700">{description}</p>
        <p className="mt-3 text-sm text-slate-500">
          `Save` keeps the PO as draft, `Draft` opens the PDF preview, and `Submit`
          sends it to admin approval.
        </p>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>

      <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Field label="PO #">
            <input
              name="poNumber"
              value={form.poNumber}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter PO number"
              required
            />
          </Field>

          {includeProjectFields ? (
            <ProjectSelectFields
              projectNumber={form.projectNumber}
              projectName={form.projectName}
              onChange={handleProjectChange}
            />
          ) : null}

          <Field label="Cost Code">
            <select
              name="costCode"
              value={form.costCode}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            >
              <option value="">Select cost code</option>
              {costCodeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Account Code">
            <select
              name="accountCode"
              value={form.accountCode}
              onChange={handleChange}
              disabled={!form.costCode || !requiresManualAccountCode(form.costCode)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 disabled:bg-slate-50 disabled:text-slate-500"
              required
            >
              <option value="">
                {form.costCode
                  ? requiresManualAccountCode(form.costCode)
                    ? 'Select account code'
                    : 'Auto selected from cost code'
                  : 'Select cost code first'}
              </option>
              {accountCodeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <Field label="PO Date - Original">
            <input
              type="date"
              name="poDateOriginal"
              value={form.poDateOriginal}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            />
          </Field>

          <Field label="PO Date - Revised">
            <input
              type="date"
              name="poDateRevised"
              value={form.poDateRevised}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            />
          </Field>

          <Field label="PO Rev #">
            <input
              name="poRevNumber"
              value={form.poRevNumber}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter revision number"
            />
          </Field>

          <Field label="Supplier Name">
            <select
              name="supplierName"
              value={form.supplierName}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
              disabled={loadingVendors}
            >
              <option value="">
                {loadingVendors ? 'Loading suppliers...' : 'Select supplier'}
              </option>
              {vendors.map((vendor) => (
                <option key={vendor.id} value={vendor.supplier_name}>
                  {vendor.supplier_name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Number of Items">
            <input
              type="number"
              min="1"
              value={form.numberOfItems}
              onChange={(e) => handleNumberOfItemsChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter number of items"
              required
            />
          </Field>
        </div>

        {selectedVendor ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
              Supplier Details
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-4 text-sm text-slate-700 md:grid-cols-2 xl:grid-cols-3">
              <div>Contact: {selectedVendor.contact_person_name || '-'}</div>
              <div>Mobile: {selectedVendor.mobile_number || '-'}</div>
              <div>Company Tel: {selectedVendor.company_telephone || '-'}</div>
              <div>Country: {selectedVendor.country || '-'}</div>
              <div>City: {selectedVendor.city || '-'}</div>
            </div>
          </div>
        ) : null}

        {items.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="max-h-[55vh] overflow-auto">
              <table className="min-w-[1290px] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100 text-left text-slate-700">
                  <tr>
                    <TableHead className="w-[280px]">Item Description</TableHead>
                    <TableHead className="w-[120px]">Quantity</TableHead>
                    <TableHead className="w-[120px]">Unit</TableHead>
                    <TableHead className="w-[120px]">Currency</TableHead>
                    <TableHead className="w-[140px]">Unit Price</TableHead>
                    <TableHead className="w-[150px]">Amount</TableHead>
                    <TableHead className="w-[150px]">Amount - AED</TableHead>
                    <TableHead className="w-[110px]">VAT %</TableHead>
                    <TableHead className="w-[130px]">VAT Amount</TableHead>
                    {includeDepreciation ? (
                      <>
                        <TableHead className="w-[170px]">Depreciation Period (Year)</TableHead>
                        <TableHead className="w-[170px]">Depreciation Start Date</TableHead>
                        <TableHead className="w-[170px]">Depreciation End Date</TableHead>
                      </>
                    ) : null}
                  </tr>
                </thead>
                <tbody>
                  {normalizedItems.map((item, index) => (
                    <tr key={`po-item-${index}`} className="border-b border-slate-200">
                      <TableCell>
                        <input
                          value={item.item}
                          onChange={(e) => handleItemChange(index, 'item', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          placeholder={`Item description ${index + 1}`}
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="number"
                          step="any"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(index, 'quantity', e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          value={item.unit}
                          onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          placeholder="Unit"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          value={item.currency}
                          onChange={(e) => handleItemChange(index, 'currency', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          placeholder="Currency"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="number"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          value={item.amount}
                          readOnly
                          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          value={item.amountAed}
                          readOnly
                          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.vatPercent}
                          onChange={(e) =>
                            handleItemChange(index, 'vatPercent', e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                          placeholder="VAT %"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          value={item.vatAmount}
                          readOnly
                          className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
                        />
                      </TableCell>
                      {includeDepreciation ? (
                        <>
                          <TableCell>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={item.depreciationPeriodYears}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  'depreciationPeriodYears',
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="date"
                              value={item.depreciationStartDate}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  'depreciationStartDate',
                                  e.target.value
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              value={item.depreciationEndDate}
                              readOnly
                              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
                            />
                          </TableCell>
                        </>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Exc. Rate">
            <input
              type="number"
              step="0.0001"
              min="0"
              name="exchangeRate"
              value={form.exchangeRate}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              placeholder="Enter exchange rate"
              required
            />
          </Field>

          <Field label="PO Amount">
            <input
              value={poAmountValue.toFixed(2)}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <Field label="VAT - AED">
            <input
              value={vatAedValue.toFixed(2)}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <Field label="PO Amount Inc VAT - AED">
            <input
              value={poAmountIncVatAed.toFixed(2)}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
            />
          </Field>

          <Field label="Mode of Payment">
            <select
              name="modeOfPayment"
              value={form.modeOfPayment}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
              required
            >
              <option value="">Select mode of payment</option>
              {modeOfPaymentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </Field>

          <div className="md:col-span-2 xl:col-span-3">
            <Field label="Remarks">
              <textarea
                name="remarks"
                value={form.remarks}
                onChange={handleChange}
                className="min-h-[120px] w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
                placeholder="Enter remarks"
              />
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={activeAction !== null}
            className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {activeAction === 'save' ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={handleDraftPreview}
            className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-slate-50"
          >
            Draft
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={activeAction !== null}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {activeAction === 'submit' ? 'Submitting...' : 'Submit'}
          </button>
        </div>
        {message && <p className="text-sm text-green-700">{message}</p>}
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
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-800">{label}</span>
      {children}
    </label>
  )
}

function TableHead({
  className = '',
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <th className={`border-b border-r border-slate-200 px-4 py-3 font-semibold ${className}`}>
      {children}
    </th>
  )
}

function TableCell({ children }: { children: React.ReactNode }) {
  return <td className="border-r border-slate-200 px-4 py-3 align-top">{children}</td>
}

function toNumber(value: string | number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function formatDecimal(value: string | number) {
  return toNumber(value).toFixed(2)
}

function formatQuantity(value: string | number) {
  const raw = String(value ?? '').trim()

  if (!raw) return '0'

  const parsed = Number(raw)

  if (!Number.isFinite(parsed)) return '0'

  return raw
    .replace(/(\.\d*?[1-9])0+$/, '$1')
    .replace(/\.0+$/, '')
}

function formatExchangeRate(value: string | number) {
  return toNumber(value).toFixed(4)
}

function getItemAmount(item: Pick<PurchaseOrderItem, 'quantity' | 'rate'>) {
  return toNumber(item.quantity) * toNumber(item.rate)
}

function calculateDepreciationEndDate(startDate: string, years: string) {
  const parsedYears = Math.trunc(toNumber(years))

  if (!startDate || parsedYears <= 0) {
    return ''
  }

  const date = new Date(`${startDate}T00:00:00`)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  date.setFullYear(date.getFullYear() + parsedYears)
  date.setDate(date.getDate() - 1)
  return formatDateInputValue(date)
}

function formatDateInputValue(value: Date) {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}
