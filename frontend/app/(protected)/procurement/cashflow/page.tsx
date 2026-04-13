import SectionLinksPage from '@/components/section-links-page'

export default function CashflowPage() {
  return (
    <SectionLinksPage
      title="Cashflow"
      links={[
        { label: 'Update Forecast', href: '/procurement/cashflow/update-forecast' },
        { label: 'View', href: '/procurement/cashflow/view' },
      ]}
    />
  )
}
