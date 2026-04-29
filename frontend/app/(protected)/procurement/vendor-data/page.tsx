import SectionLinksPage from '@/components/section-links-page'

export default function VendorDataPage() {
  return (
    <SectionLinksPage
      title="Vendor Data"
      links={[
        { label: 'Entry', href: '/procurement/vendor-data/entry' },
        { label: 'Update', href: '/procurement/vendor-data/update' },
        { label: 'View', href: '/procurement/vendor-data/view' },
      ]}
    />
  )
}
