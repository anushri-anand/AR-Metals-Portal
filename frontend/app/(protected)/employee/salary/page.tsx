import SectionLinksPage from '@/components/section-links-page'

export default function SalaryPage() {
  return (
    <SectionLinksPage
      title="Salary"
      links={[
        { label: 'Payroll', href: '/employee/salary/payroll' },
        { label: 'Advance', href: '/employee/salary/advance' },
      ]}
    />
  )
}
