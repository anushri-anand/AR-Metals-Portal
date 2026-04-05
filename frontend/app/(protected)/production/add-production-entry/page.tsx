import ProductionEntryForm from './production-entry-form'
import RoleGuard from '@/components/role-guard'

export default function AddProductionEntryPage() {
  return (
    <RoleGuard allowedRoles={['user']}>
      <ProductionEntryForm />
    </RoleGuard>
  )
}