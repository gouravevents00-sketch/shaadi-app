import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LiveClient from './LiveClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function LivePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()

  const [
    { data: event },
    { data: delegates },
    { data: guests },
    { data: volunteers },
    { data: artists },
    { data: vendors },
    { data: rooms },
    { data: checklist },
    { data: timeline },
  ] = await Promise.all([
    sc.from('org_events').select('id, name, start_date, end_date, venue, city, status, sub_type').eq('id', eventId).single(),
    sc.from('delegates').select('id, name, checked_in').eq('org_event_id', eventId),
    sc.from('org_guests').select('id, name, is_vvip, checked_in, requires_escort, requires_vehicle').eq('org_event_id', eventId),
    sc.from('org_volunteers').select('id, name, role, zone, checked_in').eq('org_event_id', eventId),
    sc.from('org_artists').select('id, name, act_type, performance_slot, arrival_time').eq('org_event_id', eventId),
    sc.from('org_vendors').select('id, name, category').eq('org_event_id', eventId),
    sc.from('org_rooms').select('id, room_number, room_type, is_allocated').eq('org_event_id', eventId),
    sc.from('org_checklist_items').select('id, task, category, status').eq('org_event_id', eventId),
    sc.from('org_timeline_items').select('id, time, end_time, activity, category, owner').eq('org_event_id', eventId).order('time').limit(10),
  ])

  return (
    <LiveClient
      eventId={eventId}
      event={event}
      delegates={delegates ?? []}
      guests={guests ?? []}
      volunteers={volunteers ?? []}
      artists={artists ?? []}
      vendors={vendors ?? []}
      rooms={rooms ?? []}
      checklist={checklist ?? []}
      timeline={timeline ?? []}
    />
  )
}
