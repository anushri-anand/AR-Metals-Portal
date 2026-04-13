import SectionLinksPage from '@/components/section-links-page'

export default function TenderLogPage() {
  return (
    <SectionLinksPage
      title="Tender Log"
      links={[
        { label: 'Entry', href: '/estimation/tender-log/entry' },
        { label: 'View', href: '/estimation/tender-log/view' },
      ]}
    />
  )
}
