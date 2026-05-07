import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FunctionHubClient from './FunctionHubClient'

export default async function FunctionHubPage({ params }: { params: Promise<{ id: string; fid: string }> }) {
  const { id, fid } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?next=/my/${id}/functions/${fid}`)

  const sc = createServiceClient()
  const [{ data: cel }, { data: fn }, { data: tasks }, { data: guests }, { data: vendors }] = await Promise.all([
    sc.from('celebrations').select('id, plan').eq('id', id).eq('user_id', user.id).single(),
    sc.from('celebration_functions').select('*').eq('id', fid).eq('celebration_id', id).single(),
    sc.from('celebration_tasks').select('*').eq('celebration_id', id).order('created_at'),
    sc.from('celebration_guests').select('id, name, phone, rsvp_status, guest_functions').eq('celebration_id', id).order('name'),
    sc.from('celebration_vendors').select('*').eq('celebration_id', id).order('name'),
  ])

  if (!cel) redirect('/celebrate/new')
  if (!fn) redirect(`/my/${id}`)

  const plan = (cel as { plan?: string }).plan ?? 'free'

  // Filter guests attending this function
  const attendingGuests = guests?.filter((g: { guest_functions: unknown }) => Array.isArray(g.guest_functions) && (g.guest_functions as string[]).includes(fid)) ?? []

  return (
    <FunctionHubClient
      celebrationId={id}
      plan={plan}
      fn={fn}
      tasks={tasks ?? []}
      attendingGuests={attendingGuests}
      allGuests={guests ?? []}
      vendors={vendors ?? []}
    />
  )
}
