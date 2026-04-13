import SectionLinksPage from '@/components/section-links-page'

export default function AssetPurchaseOrderPage() {
  return (
    <SectionLinksPage
      title="Asset Purchase Order"
      links={[
        { label: 'Entry', href: '/procurement/purchase-order/asset/entry' },
        { label: 'View', href: '/procurement/purchase-order/asset/view' },
      ]}
    />
  )
}
