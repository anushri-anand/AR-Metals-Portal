import SectionLinksPage from '@/components/section-links-page'

export default function ProductionStatusPage() {
  return (
    <SectionLinksPage
      title="Status"
      links={[
        { label: 'Work Completion', href: '/production/status/work-completion' },
        { label: 'Delivery', href: '/production/status/delivery' },
        { label: 'View', href: '/production/status/view' },
      ]}
    />
  )
}
