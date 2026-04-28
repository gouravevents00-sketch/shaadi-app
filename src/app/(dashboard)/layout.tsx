import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/shared/DashboardShell'
import { Toaster } from '@/components/ui/sonner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  const { data: membership } = await supabase
    .from('company_members').select('role, companies(id, name, logo_url)').eq('user_id', user.id).single()

  const rawCompany = membership?.companies
  const company = (Array.isArray(rawCompany) ? rawCompany[0] : rawCompany) as { id: string; name: string; logo_url: string | null } | null

  return (
    <>
      <DashboardShell user={profile} company={company} role={membership?.role ?? null}>
        {children}
      </DashboardShell>
      <Toaster richColors position="top-right" />
    </>
  )
}
