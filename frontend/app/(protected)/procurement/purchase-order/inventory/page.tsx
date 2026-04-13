import SectionLinksPage from '@/components/section-links-page'

export default function InventoryPurchaseOrderPage() {
  return (
    <SectionLinksPage
      title="Inventory Purchase Order"
      links={[
        { label: 'Entry', href: '/procurement/purchase-order/inventory/entry' },
        { label: 'Issuance', href: '/procurement/purchase-order/inventory/issuance' },
        { label: 'View', href: '/procurement/purchase-order/inventory/view' },
      ]}
    />
  )
}
