import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VolunteersClient from './VolunteersClient'

export default async function VolunteersPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const { data: volunteers } = await sc.from('org_volunteers').select('*').eq('org_event_id', eventId).order('name')

  return <VolunteersClient eventId={eventId} initialVolunteers={volunteers ?? []} />
}
