import PurchaseOrderEntryForm from '../../_components/purchase-order-entry-form'

export default function ProjectPurchaseOrderEntryPage() {
  return (
    <PurchaseOrderEntryForm
      title="Project Purchase Order Entry"
      successMessage="Project purchase order saved successfully."
      orderType="project"
    />
  )
}
