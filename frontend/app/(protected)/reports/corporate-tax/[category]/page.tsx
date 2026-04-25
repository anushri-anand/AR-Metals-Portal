import CorporateTaxCategoryDetailClient from './corporate-tax-category-detail-client'

export default async function CorporateTaxCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>
  searchParams?: Promise<{ from?: string; to?: string }>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = (await searchParams) || {}

  return (
    <CorporateTaxCategoryDetailClient
      category={resolvedParams.category}
      fromDate={resolvedSearchParams.from || ''}
      toDate={resolvedSearchParams.to || ''}
    />
  )
}
