import SectionLinksPage from '@/components/section-links-page'

export default function ProjectDetailsPage() {
  return (
    <SectionLinksPage
      title="Project Details"
      links={[
        { label: 'Entry', href: '/production/project-details/entry' },
        { label: 'Update', href: '/production/project-details/update' },
        { label: 'View', href: '/production/project-details/view' },
      ]}
    />
  )
}
