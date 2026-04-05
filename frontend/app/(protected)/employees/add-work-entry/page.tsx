import WorkEntryForm from './work-entry-form'
import RoleGuard from '@/components/role-guard'

export default function AddWorkEntryPage() {
  return (
    <RoleGuard allowedRoles={['user']}>
      <WorkEntryForm />
    </RoleGuard>
  )
}