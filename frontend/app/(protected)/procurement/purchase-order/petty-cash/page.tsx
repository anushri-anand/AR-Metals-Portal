import SectionLinksPage from '@/components/section-links-page'

export default function PettyCashPage() {
  return (
    <SectionLinksPage
      title="Petty Cash"
      links={[
        { label: 'Entry', href: '/procurement/purchase-order/petty-cash/entry' },
        {
          label: 'Actual Incurred Cost',
          href: '/procurement/purchase-order/petty-cash/actual-incurred-cost',
        },
      ]}
    />
  )
}
