import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TimelineClient from './TimelineClient'

export default async function TimelinePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const [{ data: items }, { data: sessions }] = await Promise.all([
    sc.from('org_timeline_items').select('*').eq('org_event_id', eventId).order('time'),
    sc.from('agenda_sessions').select('id').eq('org_event_id', eventId).limit(1),
  ])

  return <TimelineClient eventId={eventId} initialItems={items ?? []} hasAgenda={(sessions?.length ?? 0) > 0} />
}
