import PurchaseOrderEntryForm from '../../_components/purchase-order-entry-form'

export default function AssetPurchaseOrderEntryPage() {
  return (
    <PurchaseOrderEntryForm
      title="Asset Purchase Order Entry"
      description="Enter asset purchase order details, item-wise amounts, and depreciation details."
      successMessage="Asset purchase order saved successfully."
      includeDepreciation
    />
  )
}
