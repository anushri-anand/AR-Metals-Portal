import Link from 'next/link'

type SectionLink = {
  label: string
  href: string
}

export default function SectionLinksPage({
  title,
  description,
  links,
}: {
  title: string
  description?: string
  links: SectionLink[]
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-slate-700">
          {description || 'Choose an option below.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:border-slate-300 hover:shadow-md transition"
          >
            <h2 className="text-lg font-semibold text-slate-900">{link.label}</h2>
            <p className="mt-2 text-sm text-slate-600">Open {link.label}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
