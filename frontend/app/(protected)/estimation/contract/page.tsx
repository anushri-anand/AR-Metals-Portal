import SectionLinksPage from '@/components/section-links-page'

export default function ContractPage() {
  return (
    <SectionLinksPage
      title="Contract"
      links={[
        { label: 'Revenue', href: '/estimation/contract/revenue' },
        { label: 'Variation Log', href: '/estimation/contract/variation-log' },
        { label: 'Payment Log', href: '/estimation/contract/payment-log' },
      ]}
    />
  )
}
