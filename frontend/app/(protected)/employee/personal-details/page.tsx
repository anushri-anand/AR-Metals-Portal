import SectionLinksPage from '@/components/section-links-page'

export default function PersonalDetailsPage() {
  return (
    <SectionLinksPage
      title="Personal Details"
      links={[
        { label: 'Entry', href: '/employee/personal-details/entry' },
        { label: 'Update', href: '/employee/personal-details/update' },
        { label: 'View', href: '/employee/personal-details/view' },
      ]}
    />
  )
}
