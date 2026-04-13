import SectionLinksPage from '@/components/section-links-page'

export default function MasterListPage() {
  return (
    <SectionLinksPage
      title="Master List"
      links={[
        { label: 'Entry', href: '/estimation/master-list/entry' },
        { label: 'View', href: '/estimation/master-list/view' },
      ]}
    />
  )
}
