import PurchaseOrderEntryForm from '../../_components/purchase-order-entry-form'

export default function InventoryPurchaseOrderEntryPage() {
  return (
    <PurchaseOrderEntryForm
      title="Inventory Purchase Order Entry"
      successMessage="Inventory purchase order saved successfully."
      orderType="inventory"
      includeProjectFields={false}
    />
  )
}
