import SectionLinksPage from '@/components/section-links-page'

export default function InventoryIssuancePage() {
  return (
    <SectionLinksPage
      title="Inventory Issuance"
      links={[
        {
          label: 'Entry',
          href: '/procurement/purchase-order/inventory/issuance/entry',
        },
        {
          label: 'Issuance Log',
          href: '/procurement/purchase-order/inventory/issuance/log',
        },
      ]}
    />
  )
}
