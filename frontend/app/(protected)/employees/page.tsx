import Link from 'next/link'

export default function EmployeesPage() {
  const items = [
    {
      title: 'Add Work Entry',
      href: '/employees/add-work-entry',
      description: 'Create daily work entries for employees against project items.',
    },
    {
      title: 'Update Hours',
      href: '/employees/update-hours',
      description: 'Fill in pending hours for work entries that were saved earlier.',
    },
    {
      title: 'View Labour Status',
      href: '/employees/view-labour-status',
      description: 'View labour records with filters and total hours summary.',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold mb-2 text-slate-900">Employees</h1>
        <p className="text-slate-700">
          Manage work entry, pending hour updates, and labour status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md transition"
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h2>
            <p className="text-slate-700 text-sm">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
