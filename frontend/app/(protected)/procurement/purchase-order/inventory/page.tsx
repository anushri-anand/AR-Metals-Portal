import SectionLinksPage from '@/components/section-links-page'

export default function InventoryPurchaseOrderPage() {
  return (
    <SectionLinksPage
      title="Inventory Purchase Order"
      links={[
        { label: 'Entry', href: '/procurement/purchase-order/inventory/entry' },
        {
          label: 'Update Relevant Cost',
          href: '/procurement/purchase-order/inventory/relevant-cost',
        },
        { label: 'Issuance', href: '/procurement/purchase-order/inventory/issuance' },
        {
          label: 'Inventory Status',
          href: '/procurement/purchase-order/inventory/status',
        },
        {
          label: 'Actual Incurred Cost',
          href: '/procurement/purchase-order/inventory/actual-incurred-cost',
        },
        { label: 'PO Log', href: '/procurement/purchase-order/inventory/view' },
      ]}
    />
  )
}
