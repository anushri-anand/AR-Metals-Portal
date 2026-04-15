'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  BoqItem,
  EstimateItem,
  EstimateItemWithWastage,
  LabourHours,
  ProductionLabourDetails,
  LabourStageName,
  MasterListItem,
  TenderCosting,
  calculateCostSummary,
  createEmptyEstimateItem,
  createEmptyEstimateItemWithWastage,
  createEmptyTenderCosting,
  formatMoney,
  getBoqItems,
  getEstimateItemAmount,
  getEstimateItemsAmount,
  getEstimateItemsWithWastageAmount,
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
            createEmptyTenderCosting(
              selectedBoqItem.id,
              selectedBoqItem.tenderNumber
            )
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

  function updateSimpleSectionItem(
    section: SimpleSectionName,
    index: number,
    field: keyof EstimateItem,
    value: string
  ) {
    setCosting((prev) => {
      if (!prev) return prev

      return {
        ...prev,
        [section]: prev[section].map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]: field === 'quantity' ? Number(value || 0) : value,
              }
            : item
        ),
      }
    })
  }

  function addSimpleSectionItem(section: SimpleSectionName) {
    setCosting((prev) =>
      prev
        ? {
            ...prev,
            [section]: [...prev[section], createEmptyEstimateItem()],
          }
        : prev
    )
  }

  function updateWastageSectionItem(
    section: WastageSectionName,
    index: number,
    field: keyof EstimateItemWithWastage,
    value: string
  ) {
    setCosting((prev) => {
      if (!prev) return prev

      return {
        ...prev,
        [section]: prev[section].map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                [field]:
                  field === 'quantity' || field === 'wastagePercent'
                    ? Number(value || 0)
                    : value,
              }
            : item
        ),
      }
    })
  }

  function addWastageSectionItem(section: WastageSectionName) {
    setCosting((prev) =>
      prev
        ? {
            ...prev,
            [section]: [...prev[section], createEmptyEstimateItemWithWastage()],
          }
        : prev
    )
  }

  function updateProductionLabourSection(
    stage: LabourStageName,
    field: keyof LabourHours,
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
            [field]: Number(value || 0),
          },
        },
      }
    })
  }

  function updateInstallationLabourSection(
    field: keyof LabourHours,
    value: string
  ) {
    setCosting((prev) => {
      if (!prev) return prev

      return {
        ...prev,
        installationLabour: {
          ...prev.installationLabour,
          [field]: Number(value || 0),
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

      <MultiWastageSection
        title="Material"
        values={costing.material}
        masterItems={masterItems}
        onChange={(index, field, value) =>
          updateWastageSectionItem('material', index, field, value)
        }
        onAdd={() => addWastageSectionItem('material')}
      />

      <LabourSection
        title="Production Labour"
        value={costing.productionLabour}
        masterItems={masterItems}
        onChange={(stage, field, value) =>
          updateProductionLabourSection(stage, field, value)
        }
      />

      <MultiSimpleSection
        title="Machining"
        values={costing.machining}
        masterItems={masterItems}
        onChange={(index, field, value) =>
          updateSimpleSectionItem('machining', index, field, value)
        }
        onAdd={() => addSimpleSectionItem('machining')}
      />

      <MultiSimpleSection
        title="Coating"
        values={costing.coating}
        masterItems={masterItems}
        onChange={(index, field, value) =>
          updateSimpleSectionItem('coating', index, field, value)
        }
        onAdd={() => addSimpleSectionItem('coating')}
      />

      <MultiWastageSection
        title="Consumable"
        values={costing.consumable}
        masterItems={masterItems}
        onChange={(index, field, value) =>
          updateWastageSectionItem('consumable', index, field, value)
        }
        onAdd={() => addWastageSectionItem('consumable')}
      />

      <MultiSimpleSection
        title="Subcontract"
        values={costing.subcontract}
        masterItems={masterItems}
        onChange={(index, field, value) =>
          updateSimpleSectionItem('subcontract', index, field, value)
        }
        onAdd={() => addSimpleSectionItem('subcontract')}
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

function MultiWastageSection({
  title,
  values,
  masterItems,
  onChange,
  onAdd,
}: {
  title: string
  values: EstimateItemWithWastage[]
  masterItems: MasterListItem[]
  onChange: (
    index: number,
    field: keyof EstimateItemWithWastage,
    value: string
  ) => void
  onAdd: () => void
}) {
  const unitCost = getEstimateItemsWithWastageAmount(values, masterItems)

  return (
    <Section title={title} unitCost={unitCost}>
      <div className="space-y-4">
        {values.map((value, index) => {
          const masterItem = getMasterItem(masterItems, value.itemId)
          const quantityIncWastage = getEstimateItemWithWastageQuantity(value)
          const lineUnitCost = getEstimateItemWithWastageAmount(value, masterItems)

          return (
            <div key={`${title}-${index}`} className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">Item {index + 1}</h3>
              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Item">
                  <MasterItemSelect
                    value={value.itemId}
                    masterItems={masterItems}
                    onChange={(nextValue) => onChange(index, 'itemId', nextValue)}
                  />
                </Field>
                <Field label="Qty">
                  <NumberInput
                    value={value.quantity || ''}
                    onChange={(nextValue) =>
                      onChange(index, 'quantity', nextValue)
                    }
                    placeholder="Qty"
                  />
                </Field>
                <Field label="Wastage (%)">
                  <NumberInput
                    value={value.wastagePercent || ''}
                    onChange={(nextValue) =>
                      onChange(index, 'wastagePercent', nextValue)
                    }
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
                <ReadOnlyField
                  label="PO Ref #"
                  value={masterItem?.poRefNumber || ''}
                />
                <ReadOnlyField
                  label="Unit Cost"
                  value={lineUnitCost ? formatMoney(lineUnitCost) : ''}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Add Item
        </button>
      </div>
    </Section>
  )
}

function MultiSimpleSection({
  title,
  values,
  masterItems,
  onChange,
  onAdd,
}: {
  title: string
  values: EstimateItem[]
  masterItems: MasterListItem[]
  onChange: (index: number, field: keyof EstimateItem, value: string) => void
  onAdd: () => void
}) {
  const unitCost = getEstimateItemsAmount(values, masterItems)

  return (
    <Section title={title} unitCost={unitCost}>
      <div className="space-y-4">
        {values.map((value, index) => {
          const masterItem = getMasterItem(masterItems, value.itemId)
          const lineUnitCost = getEstimateItemAmount(value, masterItems)

          return (
            <div key={`${title}-${index}`} className="rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900">Item {index + 1}</h3>
              <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                <Field label="Item">
                  <MasterItemSelect
                    value={value.itemId}
                    masterItems={masterItems}
                    onChange={(nextValue) => onChange(index, 'itemId', nextValue)}
                  />
                </Field>
                <Field label="Qty">
                  <NumberInput
                    value={value.quantity || ''}
                    onChange={(nextValue) =>
                      onChange(index, 'quantity', nextValue)
                    }
                    placeholder="Qty"
                  />
                </Field>
                <ReadOnlyField label="Unit" value={masterItem?.unit || ''} />
                <ReadOnlyField
                  label="Rate"
                  value={masterItem ? formatMoney(masterItem.rate) : ''}
                />
                <ReadOnlyField
                  label="PO Ref #"
                  value={masterItem?.poRefNumber || ''}
                />
                <ReadOnlyField
                  label="Unit Cost"
                  value={lineUnitCost ? formatMoney(lineUnitCost) : ''}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={onAdd}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Add Item
        </button>
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
  onChange: (stage: LabourStageName, field: keyof LabourHours, value: string) => void
}) {
  const unitCost = getProductionLabourUnitCost(value, masterItems)

  return (
    <Section title={title} unitCost={unitCost}>
      <div className="space-y-4">
        {labourStageNames.map((stage) => (
          <div key={stage} className="rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900">{stage}</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Skilled Labour (Hours)">
                <NumberInput
                  value={value[stage].skilledHours || ''}
                  onChange={(nextValue) =>
                    onChange(stage, 'skilledHours', nextValue)
                  }
                  placeholder="Hours"
                />
              </Field>
              <Field label="Semi-Skilled Labour (Hours)">
                <NumberInput
                  value={value[stage].semiSkilledHours || ''}
                  onChange={(nextValue) =>
                    onChange(stage, 'semiSkilledHours', nextValue)
                  }
                  placeholder="Hours"
                />
              </Field>
              <Field label="Helper (Hours)">
                <NumberInput
                  value={value[stage].helperHours || ''}
                  onChange={(nextValue) =>
                    onChange(stage, 'helperHours', nextValue)
                  }
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
  value: LabourHours
  masterItems: MasterListItem[]
  onChange: (field: keyof LabourHours, value: string) => void
}) {
  const unitCost = getInstallationLabourUnitCost(value, masterItems)

  return (
    <Section title={title} unitCost={unitCost}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Field label="Skilled Labour (Hours)">
          <NumberInput
            value={value.skilledHours || ''}
            onChange={(nextValue) => onChange('skilledHours', nextValue)}
            placeholder="Hours"
          />
        </Field>
        <Field label="Semi-Skilled Labour (Hours)">
          <NumberInput
            value={value.semiSkilledHours || ''}
            onChange={(nextValue) => onChange('semiSkilledHours', nextValue)}
            placeholder="Hours"
          />
        </Field>
        <Field label="Helper (Hours)">
          <NumberInput
            value={value.helperHours || ''}
            onChange={(nextValue) => onChange('helperHours', nextValue)}
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
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputValue = query || selectedItem?.itemDescription || ''

  const filteredItems = masterItems
    .filter((item) =>
      item.itemDescription.toLowerCase().includes(inputValue.toLowerCase())
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
        value={inputValue}
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
              className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
            >
              <div className="font-medium text-slate-900">
                {item.itemDescription}
              </div>
              <div className="text-xs text-slate-500">
                {item.unit} | {formatMoney(item.rate)}
              </div>
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
      <p className="mt-2 text-xl font-semibold text-slate-900">
        {formatMoney(value)}
      </p>
    </div>
  )
}
