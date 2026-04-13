import TenderCostingClient from './tender-costing-client'

type PageProps = {
  params: Promise<{ tenderNumber: string }>
  searchParams: Promise<{ boqId?: string | string[] }>
}

export default async function TenderCostingPage({
  params,
  searchParams,
}: PageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const boqId =
    typeof resolvedSearchParams.boqId === 'string'
      ? resolvedSearchParams.boqId
      : resolvedSearchParams.boqId?.[0] || ''

  return (
    <TenderCostingClient
      tenderNumber={decodeURIComponent(resolvedParams.tenderNumber)}
      boqItemId={boqId}
    />
  )
}
