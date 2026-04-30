import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GuestsClient from './GuestsClient'

export default async function GuestsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const { data: guests } = await sc.from('org_guests').select('*').eq('org_event_id', eventId).order('name')

  return <GuestsClient eventId={eventId} initialGuests={guests ?? []} />
}
