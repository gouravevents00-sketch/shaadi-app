import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ArtistsClient from './ArtistsClient'

export default async function ArtistsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const { data: artists } = await sc.from('org_artists').select('*').eq('org_event_id', eventId).order('created_at')

  return <ArtistsClient eventId={eventId} initialArtists={artists ?? []} />
}
