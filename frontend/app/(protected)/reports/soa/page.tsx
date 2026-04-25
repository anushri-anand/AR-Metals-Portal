import SectionLinksPage from '@/components/section-links-page'

export default function SoaPage() {
  return (
    <SectionLinksPage
      title="SOA"
      links={[
        { label: 'Supplier', href: '/reports/soa/supplier' },
        { label: 'Client', href: '/reports/soa/client' },
      ]}
    />
  )
}

