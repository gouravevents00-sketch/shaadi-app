import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getShowFlow } from './actions'
import ShowFlowClient from './ShowFlowClient'

export default async function ShowFlowPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const [{ data: wedding }, { data: events }, { data: teamMembers }, cues] = await Promise.all([
    sc.from('weddings').select('bride_name, groom_name, wedding_date').eq('id', weddingId).single(),
    sc.from('events').select('id, name, date, start_time, end_time, venue').eq('wedding_id', weddingId).order('date').order('start_time'),
    sc.from('company_members')
      .select('user_id, role, profiles(full_name)')
      .eq('company_id',
        (await sc.from('weddings').select('company_id').eq('id', weddingId).single()).data?.company_id ?? ''
      ),
    getShowFlow(weddingId),
  ])

  const members = (teamMembers ?? []).map((m: { user_id: string; role: string; profiles: { full_name: string | null } | null | { full_name: string | null }[] }) => {
    const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
    return { userId: m.user_id, role: m.role, name: profile?.full_name ?? 'Team member' }
  })

  return (
    <ShowFlowClient
      weddingId={weddingId}
      wedding={wedding ?? { bride_name: null, groom_name: null, wedding_date: null }}
      events={events ?? []}
      teamMembers={members}
      initialCues={cues}
    />
  )
}
