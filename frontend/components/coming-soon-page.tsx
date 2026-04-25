export default function ComingSoonPage({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-slate-700">
          {description || 'This report section is ready for the next setup step.'}
        </p>
      </div>
    </div>
  )
}
