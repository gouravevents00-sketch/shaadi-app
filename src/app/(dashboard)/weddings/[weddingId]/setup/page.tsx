import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SetupWizardClient from './SetupWizardClient'

export default async function SetupWizardPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const { data: userData } = await supabase.from('users').select('id').eq('id', user.id).single()
  const { data: membership } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()

  const { data: wedding } = await sc
    .from('weddings')
    .select('id, bride_name, groom_name, date_from, date_to, wedding_date, primary_venue, primary_city, budget_total, company_id')
    .eq('id', weddingId)
    .single()

  if (!wedding) redirect('/dashboard')

  // Build date chips from wedding date range
  const quickDates: { label: string; value: string }[] = []
  const from = wedding.date_from ?? wedding.wedding_date
  const to = wedding.date_to ?? wedding.wedding_date
  if (from) {
    const cur = new Date(from + 'T00:00:00')
    const end = new Date((to ?? from) + 'T00:00:00')
    while (cur <= end) {
      quickDates.push({
        label: cur.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        value: cur.toISOString().slice(0, 10),
      })
      cur.setDate(cur.getDate() + 1)
    }
  }

  return (
    <SetupWizardClient
      weddingId={weddingId}
      wedding={wedding}
      defaultDate={from ?? ''}
      quickDates={quickDates}
      companyId={membership?.company_id ?? wedding.company_id ?? ''}
      userId={userData?.id ?? user.id}
    />
  )
}
