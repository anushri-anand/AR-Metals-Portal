import SectionLinksPage from '@/components/section-links-page'

export default function TimeSheetPage() {
  return (
    <SectionLinksPage
      title="Time Sheet"
      links={[
        { label: 'Time Entry', href: '/employee/time-sheet/time-entry' },
        { label: 'Annual Leave', href: '/employee/time-sheet/annual-leave' },
        { label: 'View', href: '/employee/time-sheet/view' },
      ]}
    />
  )
}
