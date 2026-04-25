import { VatSummaryCategoryKey } from '@/lib/vat-summary'
import VatCategoryDetailClient from './vat-category-detail-client'

type PageProps = {
  params: Promise<{ category: string }>
  searchParams: Promise<{ from?: string | string[]; to?: string | string[] }>
}

export default async function VatCategoryDetailPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const category = resolvedParams.category as VatSummaryCategoryKey
  const fromDate =
    typeof resolvedSearchParams.from === 'string'
      ? resolvedSearchParams.from
      : resolvedSearchParams.from?.[0] || ''
  const toDate =
    typeof resolvedSearchParams.to === 'string'
      ? resolvedSearchParams.to
      : resolvedSearchParams.to?.[0] || ''

  return (
    <VatCategoryDetailClient
      category={category}
      fromDate={fromDate}
      toDate={toDate}
    />
  )
}
