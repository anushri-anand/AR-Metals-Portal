import SectionLinksPage from '@/components/section-links-page'

export default function EstimationPage() {
  return (
    <SectionLinksPage
      title="Estimation"
      links={[
        {
          label: 'Client Data',
          href: '/estimation/client-data',
          roles: ['production_assistant', 'estimator', 'manager', 'admin'],
        },
        {
          label: 'Tender Log',
          href: '/estimation/tender-log',
          roles: ['production_assistant', 'estimator', 'manager', 'admin'],
        },
        {
          label: 'Master List',
          href: '/estimation/master-list',
          roles: ['estimator', 'manager', 'admin'],
        },
        {
          label: 'Costing',
          href: '/estimation/costing',
          roles: ['estimator', 'manager', 'admin'],
        },
        {
          label: 'Estimated Summary',
          href: '/estimation/estimated-summary',
          roles: ['estimator', 'manager', 'admin'],
        },
        {
          label: 'BOMAL',
          href: '/estimation/bomal',
          roles: ['estimator', 'manager', 'admin'],
        },
      ]}
    />
  )
}
