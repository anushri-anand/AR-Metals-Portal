import PurchaseOrderEntryForm from '../../_components/purchase-order-entry-form'

export default function InventoryPurchaseOrderEntryPage() {
  return (
    <PurchaseOrderEntryForm
      title="Inventory Purchase Order Entry"
      description="Enter inventory purchase order details and item-wise amounts."
      successMessage="Inventory purchase order saved successfully."
      includeProjectFields={false}
    />
  )
}
