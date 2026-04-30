import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AgendaClient from './AgendaClient'

export default async function AgendaPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: sessions }, { data: speakers }] = await Promise.all([
    supabase
      .from('agenda_sessions')
      .select('*, session_speakers(speaker_id, role, speaker:speakers(id, name, title, organization))')
      .eq('org_event_id', eventId)
      .order('start_time'),
    supabase
      .from('speakers')
      .select('id, name, title, organization')
      .eq('org_event_id', eventId)
      .order('name'),
  ])

  return (
    <AgendaClient
      eventId={eventId}
      initialSessions={sessions ?? []}
      speakers={speakers ?? []}
    />
  )
}
