import SectionLinksPage from '@/components/section-links-page'

export default function ContractPage() {
  return (
    <SectionLinksPage
      title="Contract"
      links={[
        {
          label: 'Revenue and Budget',
          href: '/contract/revenue',
          roles: ['manager', 'admin'],
        },
        {
          label: 'Variation Log',
          href: '/contract/variation-log',
          roles: ['qs', 'manager', 'admin'],
        },
        {
          label: 'Variation Costing',
          href: '/contract/variation-costing',
          roles: ['estimator', 'manager', 'admin'],
        },
        {
          label: 'Payment Log',
          href: '/contract/payment-log',
          roles: ['accountant', 'qs', 'manager', 'admin'],
        },
      ]}
    />
  )
}
