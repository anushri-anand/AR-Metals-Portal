import PurchaseOrderViewClient from '../../_components/purchase-order-view-client'

export default function InventoryPurchaseOrderViewPage() {
  return (
    <PurchaseOrderViewClient
      orderType="inventory"
      title="Inventory PO Log"
    />
  )
}
