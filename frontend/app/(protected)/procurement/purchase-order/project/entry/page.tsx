import PurchaseOrderEntryForm from '../../_components/purchase-order-entry-form'

export default function ProjectPurchaseOrderEntryPage() {
  return (
    <PurchaseOrderEntryForm
      title="Project Purchase Order Entry"
      description="Enter project purchase order details and item-wise amounts."
      successMessage="Project purchase order saved successfully."
    />
  )
}
