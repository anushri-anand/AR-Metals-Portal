import UpdateHoursClient from './update-hours-client'
import RoleGuard from '@/components/role-guard'

export default function UpdateHoursPage() {
  return (
    <RoleGuard allowedRoles={['user']}>
      <UpdateHoursClient />
    </RoleGuard>
  )
}