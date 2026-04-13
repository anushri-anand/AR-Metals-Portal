'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  BoqItem,
  EstimateItem,
  EstimateItemWithWastage,
  LabourValue,
  ProductionLabourDetails,
  LabourStageName,
  MasterListItem,
  TenderCosting,
  calculateCostSummary,
  createEmptyTenderCosting,
  formatMoney,
  getBoqItems,
  getEstimateItemAmount,
  getEstimateItemWithWastageAmount,
  getEstimateItemWithWastageQuantity,
  getInstallationLabourUnitCost,
  getMasterItem,
  getMasterListItems,
  getProductionLabourUnitCost,
  getTenderCosting,
  labourStageNames,
  saveTenderCosting,
} from '@/lib/estimation-storage'

type SimpleSectionName = 'machining' | 'coating' | 'subcontract'
type WastageSectionName = 'material' | 'consumable'

export default function TenderCostingClient({
  tenderNumber,
  boqItemId,
}: {
  tenderNumber: string
  boqItemId: string
}) {
  const router = useRouter()
  const [boqItem, setBoqItem] = useState<BoqItem | null>(null)
  const [masterItems, setMasterItems] = useState<MasterListItem[]>([])
  const [costing, setCosting] = useState<TenderCosting | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadData() {
      try {
        const [savedBoqItems, savedMasterItems] = await Promise.all([
          getBoqItems(),
          getMasterListItems(),
        ])
        const selectedBoqItem =
          savedBoqItems.find((item) => String(item.id) === String(boqItemId)) ||
          savedBoqItems.find((item) => item.tenderNumber === tenderNumber) ||
          null

        if (!selectedBoqItem) {
          setError('Tender row not found. Please enter the tender item first.')
          return
        }

        const savedCosting = await getTenderCosting(selectedBoqItem.id)

        setBoqItem(selectedBoqItem)
        setMasterItems(savedMasterItems)
        setCosting(
          savedCosting ||
            createEmptyTenderCosting(selectedBoqItem.id, selectedBoqItem.tenderNumber)
        )
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load tender costing.'
        )
      }
    }

    loadData()
  }, [boqItemId, tenderNumber])

  const summary =
    boqItem && costing
      ? calculateCostSummary({
          boqQuantity: boqItem.quantity,
          costing,
          freightCustomDutyPercent: boqItem.freightCustomDutyPercent,
          prelimsPercent: boqItem.prelimsPercent,
          fohPercent: boqItem.fohPercent,
          commitmentsPercent: boqItem.commitmentsPercent,
          contingenciesPercent: boqItem.contingenciesPercent,
          markup: boqItem.markup,
          masterItems,
        })
      : null

  function updateSimpleSection(
    section: SimpleSectionName,
    field: keyof EstimateItem,
    value: string
  ) {
    setCosting((prev) =>
      prev
        ? {
            ...prev,
            [section]: {
              ...prev[section],
              [field]: field === 'quantity' ? Number(value || 0) : value,
            },
          }
        : prev
    )
  }

  function updateWastageSection(
    section: WastageSectionName,
    field: keyof EstimateItemWithWastage,
    value: string
  ) {
    setCosting((prev) =>
      prev
        ? {
            ...prev,
            [section]: {
              ...prev[section],
              [field]:
                field === 'quantity' || field === 'wastagePercent'
                  ? Number(value || 0)
                  : value,
            },
          }
        : prev
    )
  }

  function updateProductionLabourSection(
    stage: LabourStageName,
    field: keyof LabourValue,
    value: string
  ) {
    setCosting((prev) => {
      if (!prev) return prev

      return {
        ...prev,
        productionLabour: {
          ...prev.productionLabour,
          [stage]: {
            ...prev.productionLabour[stage],
            [field]: field === 'hours' ? Number(value || 0) : value,
          },
        },
      }
    })
  }

  function updateInstallationLabourSection(field: keyof LabourValue, value: string) {
    setCosting((prev) => {
      if (!prev) return prev

      return {
        ...prev,
        installationLabour: {
          ...prev.installationLabour,
          [field]: field === 'hours' ? Number(value || 0) : value,
        },
      }
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!boqItem || !costing) return

    try {
      await saveTenderCosting({
        ...costing,
        boqItemId: boqItem.id,
        tenderNumber: boqItem.tenderNumber,
      })
      router.push('/estimation/costing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save costing.')
    }
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-red-800">
        {error}
      </div>
    )
  }

  if (!boqItem || !costing) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-700 shadow-sm">
        Loading tender costing...
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">
          Costing - {boqItem.description || 'Tender Item'}
        </h1>
        <p className="mt-2 text-slate-700">
          {boqItem.description} | Qty: {boqItem.quantity || 0} {boqItem.unit}
        </p>
        {masterItems.length === 0 && (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Add items in Estimation - Master List first, then select them here.
          </p>
        )}
      </div>

      <MaterialSection
        title="Material"
        value={costing.material}
        masterItems={masterItems}
        onChange={(field, value) =>
          updateWastageSection('material', field, value)
        }
      />

      <LabourSection
        title="Production Labour"
        value={costing.productionLabour}
        masterItems={masterItems}
        onChange={(stage, field, value) =>
          updateProductionLabourSection(stage, field, value)
        }
      />

      <SimpleCostSection
        title="Machining"
        value={costing.machining}
        masterItems={masterItems}
        onChange={(field, value) =>
          updateSimpleSection('machining', field, value)
        }
      />

      <SimpleCostSection
        title="Coating"
        value={costing.coating}
        masterItems={masterItems}
        onChange={(field, value) => updateSimpleSection('coating', field, value)}
      />

      <MaterialSection
        title="Consumable"
        value={costing.consumable}
        masterItems={masterItems}
        onChange={(field, value) =>
          updateWastageSection('consumable', field, value)
        }
      />

      <SimpleCostSection
        title="Subcontract"
        value={costing.subcontract}
        masterItems={masterItems}
        onChange={(field, value) =>
          updateSimpleSection('subcontract', field, value)
        }
      />

      <InstallationLabourSection
        title="Installation Labour"
        value={costing.installationLabour}
        masterItems={masterItems}
        onChange={(field, value) => updateInstallationLabourSection(field, value)}
      />

      {summary && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Summary</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryCard
              label="Supply Unit Cost"
              value={summary.supplyUnitCost}
            />
            <SummaryCard
              label="Supply Total Cost"
              value={summary.supplyTotalCost}
            />
            <SummaryCard
              label="Installation Unit Cost"
              value={summary.installationUnitCost}
            />
            <SummaryCard
              label="Installation Total Cost"
              value={summary.installationTotalCost}
            />
            <SummaryCard label="Total Unit Cost" value={summary.unitCost} />
            <SummaryCard label="Total Cost" value={summary.totalCost} />
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800"
        >
          Save Costing
        </button>
        <button
          type="button"
          onClick={() => router.push('/estimation/costing')}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Back to Costing
        </button>
      </div>
    </form>
  )
}

function MaterialSection({
  title,
  value,
  masterItems,
  onChange,
}: {
  title: string
  value: EstimateItemWithWastage
  masterItems: MasterListItem[]
  onChange: (field: keyof EstimateItemWithWastage, value: string) => void
}) {
  const masterItem = getMasterItem(masterItems, value.itemId)
  const quantityIncWastage = getEstimateItemWithWastageQuantity(value)
  const unitCost = getEstimateItemWithWastageAmount(value, masterItems)

  return (
    <Section title={title} unitCost={unitCost}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Item">
          <MasterItemSelect
            value={value.itemId}
            masterItems={masterItems}
            onChange={(nextValue) => onChange('itemId', nextValue)}
          />
        </Field>
        <Field label="Qty">
          <NumberInput
            value={value.quantity || ''}
            onChange={(nextValue) => onChange('quantity', nextValue)}
            placeholder="Qty"
          />
        </Field>
        <Field label="Wastage (%)">
          <NumberInput
            value={value.wastagePercent || ''}
            onChange={(nextValue) => onChange('wastagePercent', nextValue)}
            placeholder="Wastage %"
          />
        </Field>
        <ReadOnlyField
          label="Qty Inc Wastage"
          value={quantityIncWastage ? formatMoney(quantityIncWastage) : ''}
        />
        <ReadOnlyField label="Unit" value={masterItem?.unit || ''} />
        <ReadOnlyField
          label="Rate"
          value={masterItem ? formatMoney(masterItem.rate) : ''}
        />
        <ReadOnlyField label="PO Ref #" value={masterItem?.poRefNumber || ''} />
        <ReadOnlyField
          label="Unit Cost"
          value={unitCost ? formatMoney(unitCost) : ''}
        />
      </div>
    </Section>
  )
}

function SimpleCostSection({
  title,
  value,
  masterItems,
  onChange,
}: {
  title: string
  value: EstimateItem
  masterItems: MasterListItem[]
  onChange: (field: keyof EstimateItem, value: string) => void
}) {
  const masterItem = getMasterItem(masterItems, value.itemId)
  const unitCost = getEstimateItemAmount(value, masterItems)

  return (
    <Section title={title} unitCost={unitCost}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Item">
          <MasterItemSelect
            value={value.itemId}
            masterItems={masterItems}
            onChange={(nextValue) => onChange('itemId', nextValue)}
          />
        </Field>
        <Field label="Qty">
          <NumberInput
            value={value.quantity || ''}
            onChange={(nextValue) => onChange('quantity', nextValue)}
            placeholder="Qty"
          />
        </Field>
        <ReadOnlyField label="Unit" value={masterItem?.unit || ''} />
        <ReadOnlyField
          label="Rate"
          value={masterItem ? formatMoney(masterItem.rate) : ''}
        />
        <ReadOnlyField label="PO Ref #" value={masterItem?.poRefNumber || ''} />
        <ReadOnlyField
          label="Unit Cost"
          value={unitCost ? formatMoney(unitCost) : ''}
        />
      </div>
    </Section>
  )
}

function LabourSection({
  title,
  value,
  masterItems,
  onChange,
}: {
  title: string
  value: ProductionLabourDetails
  masterItems: MasterListItem[]
  onChange: (
    stage: LabourStageName,
    field: keyof LabourValue,
    value: string
  ) => void
}) {
  const unitCost = getProductionLabourUnitCost(value, masterItems)

  return (
    <Section title={title} unitCost={unitCost}>
      <div className="space-y-4">
        {labourStageNames.map((stage) => (
          <div key={stage} className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">{stage}</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Item">
                <MasterItemSelect
                  value={value[stage].itemId}
                  masterItems={masterItems}
                  onChange={(nextValue) => onChange(stage, 'itemId', nextValue)}
                />
              </Field>
              <Field label="Hours">
                <NumberInput
                  value={value[stage].hours || ''}
                  onChange={(nextValue) => onChange(stage, 'hours', nextValue)}
                  placeholder="Hours"
                />
              </Field>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

function InstallationLabourSection({
  title,
  value,
  masterItems,
  onChange,
}: {
  title: string
  value: LabourValue
  masterItems: MasterListItem[]
  onChange: (field: keyof LabourValue, value: string) => void
}) {
  const unitCost = getInstallationLabourUnitCost(value, masterItems)

  return (
    <Section title={title} unitCost={unitCost}>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Field label="Item">
          <MasterItemSelect
            value={value.itemId}
            masterItems={masterItems}
            onChange={(nextValue) => onChange('itemId', nextValue)}
          />
        </Field>
        <Field label="Hours">
          <NumberInput
            value={value.hours || ''}
            onChange={(nextValue) => onChange('hours', nextValue)}
            placeholder="Hours"
          />
        </Field>
      </div>
    </Section>
  )
}

function Section({
  title,
  unitCost,
  children,
}: {
  title: string
  unitCost: number
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
          Unit Cost: {formatMoney(unitCost)}
        </p>
      </div>
      {children}
    </section>
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

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <Field label={label}>
      <input
        value={value}
        readOnly
        className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-slate-700"
      />
    </Field>
  )
}

function MasterItemSelect({
  value,
  masterItems,
  onChange,
}: {
  value: string | number
  masterItems: MasterListItem[]
  onChange: (value: string) => void
}) {
  const selectedItem = getMasterItem(masterItems, value)
  const [query, setQuery] = useState(selectedItem?.itemDescription || '')
  const [isOpen, setIsOpen] = useState(false)
  const filteredItems = masterItems
    .filter((item) =>
      item.itemDescription.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 8)

  function handleBlur() {
    window.setTimeout(() => {
      const exactMatch = masterItems.find(
        (item) => item.itemDescription.toLowerCase() === query.toLowerCase()
      )

      if (exactMatch) {
        onChange(String(exactMatch.id))
        setQuery(exactMatch.itemDescription)
      }

      setIsOpen(false)
    }, 120)
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          const nextQuery = e.target.value
          setQuery(nextQuery)
          setIsOpen(true)

          if (!nextQuery) {
            onChange('')
          }
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
        placeholder="Type to search item"
      />
      {isOpen && filteredItems.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={() => {
                onChange(String(item.id))
                setQuery(item.itemDescription)
                setIsOpen(false)
              }}
              className="block w-full px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-50"
            >
              {item.itemDescription}
            </button>
          ))}
        </div>
      )}
    </div>
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
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
      placeholder={placeholder}
    />
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-sm text-slate-600">{label}</p>
      <p className="mt-1 text-lg font-semibold text-slate-900">
        {formatMoney(value)}
      </p>
    </div>
  )
}
