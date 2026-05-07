import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ExportsClient from './ExportsClient'

export default async function ExportsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?next=/my/${id}/exports`)

  const sc = createServiceClient()
  const [{ data: cel }, { data: guests }, { data: budget }, { data: vendors }, { data: functions }] = await Promise.all([
    sc.from('celebrations').select('id').eq('id', id).eq('user_id', user.id).single(),
    sc.from('celebration_guests').select('id, name, phone, rsvp_status, room_id, dietary').eq('celebration_id', id).order('name'),
    sc.from('celebration_budget').select('id, category, description, estimated, actual, status').eq('celebration_id', id).order('created_at'),
    sc.from('celebration_vendors').select('id, name, phone, category, contact_name, total_amount, advance_paid, status').eq('celebration_id', id).order('name'),
    sc.from('celebration_functions').select('id, name, date, start_time, end_time, venue_space, expected_count').eq('celebration_id', id).order('date'),
  ])

  if (!cel) redirect('/celebrate/new')

  return (
    <ExportsClient
      guests={guests ?? []}
      budget={budget ?? []}
      vendors={vendors ?? []}
      functions={functions ?? []}
    />
  )
}
