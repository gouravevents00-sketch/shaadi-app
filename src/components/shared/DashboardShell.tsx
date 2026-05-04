'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { PrivacyProvider } from '@/contexts/PrivacyContext'
import DashboardNav from './DashboardNav'
import AiAssistant from './AiAssistant'

interface Props {
  user: { name: string; email: string } | null
  company: { id: string; name: string; logo_url: string | null } | null
  role: string | null
  isPersonal?: boolean
  personalWeddingId?: string | null
  children: React.ReactNode
}

export default function DashboardShell({ user, company, role, isPersonal, personalWeddingId, children }: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <PrivacyProvider>
      <div className="min-h-screen bg-stone-50 flex">
        {/* Desktop sidebar */}
        <div className="hidden lg:block flex-shrink-0">
          <DashboardNav
            user={user} company={company} role={role}
            isPersonal={isPersonal} personalWeddingId={personalWeddingId}
          />
        </div>

        {/* Mobile overlay */}
        {mobileNavOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="absolute inset-0 bg-black/40" onClick={() => setMobileNavOpen(false)} />
            <div className="relative z-10 flex-shrink-0">
              <DashboardNav
                user={user} company={company} role={role}
                isPersonal={isPersonal} personalWeddingId={personalWeddingId}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto min-w-0">
          {/* Mobile top bar */}
          <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-stone-200 flex items-center gap-3 px-4 py-3">
            <button onClick={() => setMobileNavOpen(true)} className="p-1.5 rounded-lg hover:bg-stone-100">
              <Menu className="w-5 h-5 text-stone-600" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-rose-700 flex items-center justify-center">
                <span className="text-white text-xs font-bold">✦</span>
              </div>
              <span className="text-sm font-semibold text-stone-900">
                {isPersonal ? 'My Wedding' : (company?.name || 'UtsavOS')}
              </span>
            </div>
          </div>
          {children}
        </main>
      </div>
      <AiAssistant />
    </PrivacyProvider>
  )
}
