import SectionLinksPage from '@/components/section-links-page'

export default function ProjectPurchaseOrderPage() {
  return (
    <SectionLinksPage
      title="Project Purchase Order"
      links={[
        { label: 'Entry', href: '/procurement/purchase-order/project/entry' },
        { label: 'View', href: '/procurement/purchase-order/project/view' },
        {
          label: 'Actual Incurred Cost',
          href: '/procurement/purchase-order/project/actual-incurred-cost',
        },
      ]}
    />
  )
}
