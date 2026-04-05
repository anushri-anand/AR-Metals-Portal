import Link from 'next/link'

export default function ReportsPage() {
  const items = [
    {
      title: 'Analytics',
      href: '/reports/analytics',
      description: 'View production analytics for a selected project item.',
    },
    {
      title: 'MH Cost Allocation',
      href: '/reports/mh-cost-allocation',
      description: 'View man-hour cost allocation by employee and project.',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold mb-2 text-slate-900">Reports</h1>
        <p className="text-slate-700">
          View analytics and management reports.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
