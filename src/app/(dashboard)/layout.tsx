import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/shared/DashboardShell'
import { Toaster } from '@/components/ui/sonner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single()
  const { data: membership } = await supabase
    .from('company_members')
    .select('role, companies(id, name, logo_url, is_personal)')
    .eq('user_id', user.id)
    .single()

  const rawCompany = membership?.companies
  const company = (Array.isArray(rawCompany) ? rawCompany[0] : rawCompany) as {
    id: string; name: string; logo_url: string | null; is_personal: boolean | null
  } | null

  const isPersonal = company?.is_personal === true

  // Block B2C (personal) users from agency dashboard entirely
  if (isPersonal && company?.id) {
    const sc = createServiceClient()
    const { data: pw } = await sc.from('weddings').select('id').eq('company_id', company.id).limit(1).maybeSingle()
    if (pw?.id) {
      // Find the celebration linked to this wedding (celebration has the /my/[id] route)
      const { data: cel } = await sc.from('celebrations').select('id').eq('wedding_id', pw.id).maybeSingle()
      redirect(cel?.id ? `/my/${cel.id}` : '/celebrate/new')
    } else {
      redirect('/celebrate/new')
    }
  }

  // For self-planners: find their wedding so nav can link directly (unreachable after redirect above, kept for type safety)
  const personalWeddingId: string | null = null

  return (
    <>
      <DashboardShell
        user={profile}
        company={company}
        role={membership?.role ?? null}
        isPersonal={isPersonal}
        personalWeddingId={personalWeddingId}
      >
        {children}
      </DashboardShell>
      <Toaster richColors position="top-right" />
    </>
  )
}
