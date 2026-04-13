import AppShell from '@/components/app-shell'
import ProtectedClient from '@/components/protected-client'

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProtectedClient>
      <AppShell>{children}</AppShell>
    </ProtectedClient>
  )
}
