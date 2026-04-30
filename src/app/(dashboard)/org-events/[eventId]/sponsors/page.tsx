import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SponsorsClient from './SponsorsClient'

export default async function SponsorsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const { data: sponsors } = await sc.from('org_sponsors').select('*').eq('org_event_id', eventId).order('created_at')

  return <SponsorsClient eventId={eventId} initialSponsors={sponsors ?? []} />
}
