import SectionLinksPage from '@/components/section-links-page'

export default function ReportsPage() {
  return (
    <SectionLinksPage
      title="Reports"
      links={[
        { label: 'Cashflow', href: '/reports/cashflow' },
        { label: 'PCR', href: '/reports/pcr' },
        { label: 'Cost Ledger', href: '/reports/cost-ledger' },
        { label: 'BUR', href: '/reports/bur' },
        { label: 'VAT Summary', href: '/reports/vat' },
        { label: 'Corporate Tax', href: '/reports/corporate-tax' },
        { label: 'SOA', href: '/reports/soa' },
        { label: 'GL Period Closing', href: '/reports/gl-period-closing' },
      ]}
    />
  )
}
