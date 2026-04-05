import DeliveryEntryForm from './delivery-entry-form'
import RoleGuard from '@/components/role-guard'

export default function DeliveryEntryPage() {
  return (
    <RoleGuard allowedRoles={['user']}>
      <DeliveryEntryForm />
    </RoleGuard>
  )
}
