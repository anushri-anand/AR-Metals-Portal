import SectionLinksPage from '@/components/section-links-page'

export default function EstimationPage() {
  return (
    <SectionLinksPage
      title="Estimation"
      links={[
        { label: 'Client Data', href: '/estimation/client-data' },
        { label: 'Tender Log', href: '/estimation/tender-log' },
        { label: 'Master List', href: '/estimation/master-list' },
        { label: 'Costing', href: '/estimation/costing' },
      ]}
    />
  )
}
