import SectionLinksPage from '@/components/section-links-page'

export default function ReportsPage() {
  return (
    <SectionLinksPage
      title="Reports"
      links={[
        {
          label: 'Cashflow',
          href: '/reports/cashflow',
          roles: ['accountant', 'manager', 'admin'],
        },
        {
          label: 'PCR',
          href: '/reports/pcr',
          roles: ['admin'],
        },
        {
          label: 'Cost Ledger',
          href: '/reports/cost-ledger',
          roles: ['accountant', 'manager', 'admin'],
        },
        {
          label: 'BUR',
          href: '/reports/bur',
          roles: ['admin'],
        },
        {
          label: 'VAT Summary',
          href: '/reports/vat',
          roles: ['accountant', 'manager', 'admin'],
        },
        {
          label: 'Corporate Tax',
          href: '/reports/corporate-tax',
          roles: ['accountant', 'manager', 'admin'],
        },
        {
          label: 'SOA',
          href: '/reports/soa',
          roles: ['accountant', 'manager', 'admin'],
        },
        {
          label: 'GL Period Closing',
          href: '/reports/gl-period-closing',
          roles: ['accountant', 'manager', 'admin'],
        },
      ]}
    />
  )
}
