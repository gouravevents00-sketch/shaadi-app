import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GuestsClient from './GuestsClient'

export default async function GuestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?next=/my/${id}/guests`)

  const sc = createServiceClient()
  const [{ data: celebration }, { data: guests }, { data: functions }] = await Promise.all([
    sc.from('celebrations').select('id, plan, guest_count').eq('id', id).eq('user_id', user.id).single(),
    sc.from('celebration_guests').select('*').eq('celebration_id', id).order('created_at'),
    sc.from('celebration_functions').select('id, name, date, start_time').eq('celebration_id', id).order('date'),
  ])

  if (!celebration) redirect('/celebrate/new')
  const plan = (celebration as { plan?: string }).plan ?? 'free'

  return (
    <GuestsClient
      celebrationId={id}
      plan={plan}
      guestCount={(celebration as { guest_count: number }).guest_count ?? 0}
      initialGuests={guests ?? []}
      functions={functions ?? []}
    />
  )
}
