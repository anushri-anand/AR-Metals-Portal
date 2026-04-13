import SectionLinksPage from '@/components/section-links-page'

export default function ProcurementPage() {
  return (
    <SectionLinksPage
      title="Procurement"
      links={[
        { label: 'Purchase Order', href: '/procurement/purchase-order' },
        { label: 'Vendor Data', href: '/procurement/vendor-data' },
        { label: 'Payment', href: '/procurement/payment' },
        { label: 'Cashflow', href: '/procurement/cashflow' },
      ]}
    />
  )
}
