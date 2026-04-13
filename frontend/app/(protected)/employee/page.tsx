import SectionLinksPage from '@/components/section-links-page'

export default function EmployeePage() {
  return (
    <SectionLinksPage
      title="Employee"
      links={[
        { label: 'Personal Details', href: '/employee/personal-details' },
        { label: 'Time Sheet', href: '/employee/time-sheet' },
        { label: 'Salary', href: '/employee/salary' },
      ]}
    />
  )
}
