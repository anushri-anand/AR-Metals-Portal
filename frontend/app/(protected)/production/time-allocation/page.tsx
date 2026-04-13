import SectionLinksPage from '@/components/section-links-page'

export default function TimeAllocationPage() {
  return (
    <SectionLinksPage
      title="Time Allocation"
      links={[
        {
          label: 'Entry',
          href: '/production/time-allocation/entry',
        },
        {
          label: 'View',
          href: '/production/time-allocation/view',
        },
      ]}
    />
  )
}
