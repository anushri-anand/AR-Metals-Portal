import SectionLinksPage from '@/components/section-links-page'

export default function ProductionPage() {
  return (
    <SectionLinksPage
      title="Production"
      links={[
        { label: 'Time Allocation', href: '/production/time-allocation' },
        { label: 'Status', href: '/production/status' },
      ]}
    />
  )
}
