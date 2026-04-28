import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GuestsClient from './GuestsClient'

export default async function GuestsPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: guests }, { data: events }, { data: guestEvents }] = await Promise.all([
    supabase.from('guests').select('*').eq('wedding_id', weddingId).order('name'),
    supabase.from('events').select('id, name, date, start_time, type').eq('wedding_id', weddingId).order('date').order('start_time'),
    supabase.from('guest_events').select('guest_id, event_id, rsvp_status')
      .in('event_id', (await supabase.from('events').select('id').eq('wedding_id', weddingId)).data?.map(e => e.id) ?? []),
  ])

  return (
    <GuestsClient
      weddingId={weddingId}
      initialGuests={guests ?? []}
      events={events ?? []}
      guestEvents={guestEvents ?? []}
    />
  )
}
