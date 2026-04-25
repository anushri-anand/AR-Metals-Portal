import SectionLinksPage from '@/components/section-links-page'

export default function AssociatedCostPage() {
  return (
    <SectionLinksPage
      title="Associated Cost"
      links={[
        { label: 'Entry', href: '/employee/associated-cost/entry' },
        { label: 'Payment', href: '/employee/associated-cost/payment' },
        {
          label: 'Actual Incurred Cost',
          href: '/employee/associated-cost/actual-incurred-cost',
        },
      ]}
    />
  )
}
