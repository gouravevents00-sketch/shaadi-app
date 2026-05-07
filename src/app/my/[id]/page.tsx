import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OverviewClient from './OverviewClient'

export default async function MyCelebrationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?next=/my/${id}`)

  const sc = createServiceClient()

  const [
    { data: celebration },
    { data: functions },
    { data: tasks },
    { data: guests },
    { data: budget },
    { data: vendors },
    { data: rooms },
  ] = await Promise.all([
    sc.from('celebrations').select('*').eq('id', id).eq('user_id', user.id).single(),
    sc.from('celebration_functions').select('id, name, date, start_time, end_time, venue_space, expected_count, sort_order').eq('celebration_id', id).order('date').order('sort_order'),
    sc.from('celebration_tasks').select('id, status, due_date, title, category').eq('celebration_id', id),
    sc.from('celebration_guests').select('id, rsvp_status').eq('celebration_id', id),
    sc.from('celebration_budget').select('id, estimated, actual, status').eq('celebration_id', id),
    sc.from('celebration_vendors').select('id, status, category').eq('celebration_id', id),
    sc.from('celebration_rooms').select('id').eq('celebration_id', id),
  ])

  if (!celebration) redirect('/celebrate/new')

  const plan = (celebration as { plan?: string }).plan ?? 'free'

  return (
    <OverviewClient
      id={id}
      celebration={celebration}
      plan={plan}
      functions={functions ?? []}
      tasks={tasks ?? []}
      guests={guests ?? []}
      budget={budget ?? []}
      vendors={vendors ?? []}
      roomCount={(rooms ?? []).length}
    />
  )
}
