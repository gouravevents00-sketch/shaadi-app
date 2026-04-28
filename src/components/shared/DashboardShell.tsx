'use client'

import { PrivacyProvider } from '@/contexts/PrivacyContext'
import DashboardNav from './DashboardNav'

interface Props {
  user: { name: string; email: string } | null
  company: { id: string; name: string; logo_url: string | null } | null
  role: string | null
  children: React.ReactNode
}

export default function DashboardShell({ user, company, role, children }: Props) {
  return (
    <PrivacyProvider>
      <div className="min-h-screen bg-stone-50 flex">
        <DashboardNav user={user} company={company} role={role} />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </PrivacyProvider>
  )
}
