import SectionLinksPage from '@/components/section-links-page'

export default function PurchaseOrderPage() {
  return (
    <SectionLinksPage
      title="Purchase Order"
      links={[
        { label: 'Project', href: '/procurement/purchase-order/project' },
        { label: 'Asset', href: '/procurement/purchase-order/asset' },
        { label: 'Inventory', href: '/procurement/purchase-order/inventory' },
        { label: 'Petty Cash', href: '/procurement/purchase-order/petty-cash' },
      ]}
    />
  )
}
