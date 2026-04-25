import SectionLinksPage from '@/components/section-links-page'

export default function ReportsCashflowPage() {
  return (
    <SectionLinksPage
      title="Cashflow"
      links={[
        { label: 'View', href: '/reports/cashflow/view' },
        {
          label: 'Dividend / Investment',
          href: '/reports/cashflow/dividend-investment',
        },
      ]}
    />
  )
}
