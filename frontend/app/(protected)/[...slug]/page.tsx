import PlaceholderPage from '@/components/placeholder-page'

function formatSegment(segment: string) {
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

export default async function PlaceholderRoute({
  params,
}: {
  params: Promise<{ slug: string[] }>
}) {
  const { slug } = await params
  const title = slug.map(formatSegment).join(' / ')

  return (
    <PlaceholderPage
      title={title}
      description="This page is part of the new rebuild. Functionality will be added later."
    />
  )
}
