import SectionLinksPage from '@/components/section-links-page'

export default function VariationLogPage() {
  return (
    <SectionLinksPage
      title="Variation Log"
      links={[
        { label: 'Entry', href: '/contract/variation-log/entry' },
        { label: 'View', href: '/contract/variation-log/view' },
        { label: 'Status', href: '/contract/variation-log/status' },
      ]}
    />
  )
}

