export default function PlaceholderPage({
    title,
    description,
  }: {
    title: string
    description?: string
  }) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-slate-700">
          {description || 'This page will be rebuilt in the new structure.'}
        </p>
      </div>
    )
  }
  