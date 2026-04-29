import SectionLinksPage from '@/components/section-links-page'

export default function ClientDataPage() {
  return (
    <SectionLinksPage
      title="Client Data"
      links={[
        { label: 'Entry', href: '/estimation/client-data/entry' },
        { label: 'Update', href: '/estimation/client-data/update' },
        { label: 'View', href: '/estimation/client-data/view' },
      ]}
    />
  )
}
