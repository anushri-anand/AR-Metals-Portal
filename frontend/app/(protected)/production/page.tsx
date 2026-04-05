import Link from 'next/link'

export default function ProductionPage() {
  const items = [
    {
      title: 'Add Production Entry',
      href: '/production/add-production-entry',
      description: 'Record daily production quantities for each project item.',
    },
    {
      title: 'Delivery Entry',
      href: '/production/delivery-entry',
      description: 'Record delivery notes and delivered quantities.',
    },
    {
      title: 'View Production Status',
      href: '/production/view-production-status',
      description: 'View total production and delivery status with filters.',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold mb-2 text-slate-900">Production</h1>
        <p className="text-slate-700">
          Manage production entry, delivery entry, and production status.
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
