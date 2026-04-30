import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CommsClient from './CommsClient'

export default async function CommsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const { data: event } = await sc.from('org_events').select('id, name').eq('id', eventId).single()
  if (!event) redirect('/dashboard')

  const [
    { data: delegates },
    { data: guests },
    { data: volunteers },
    { data: logs },
  ] = await Promise.all([
    sc.from('delegates')
      .select('id, name, phone, email, is_vip, checked_in, dietary, organization')
      .eq('org_event_id', eventId).order('name'),
    sc.from('org_guests')
      .select('id, name, phone, email, is_vvip, checked_in, category')
      .eq('org_event_id', eventId).order('name'),
    sc.from('org_volunteers')
      .select('id, name, phone, email, role, zone, checked_in')
      .eq('org_event_id', eventId).order('name'),
    sc.from('org_comms_log')
      .select('id, channel, audience_label, recipient_count, message, created_at')
      .eq('org_event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  return (
    <CommsClient
      eventId={eventId}
      eventName={event.name}
      delegates={delegates ?? []}
      guests={guests ?? []}
      volunteers={volunteers ?? []}
      logs={logs ?? []}
    />
  )
}
