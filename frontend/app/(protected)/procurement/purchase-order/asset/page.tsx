import SectionLinksPage from '@/components/section-links-page'

export default function AssetPurchaseOrderPage() {
  return (
    <SectionLinksPage
      title="Asset Purchase Order"
      links={[
        { label: 'Entry', href: '/procurement/purchase-order/asset/entry' },
        { label: 'View', href: '/procurement/purchase-order/asset/view' },
        { label: 'Deposits', href: '/procurement/purchase-order/asset/deposits' },
        { label: 'Asset Status', href: '/procurement/purchase-order/asset/status' },
        {
          label: 'Actual Incurred Cost',
          href: '/procurement/purchase-order/asset/actual-incurred-cost',
        },
      ]}
    />
  )
}
