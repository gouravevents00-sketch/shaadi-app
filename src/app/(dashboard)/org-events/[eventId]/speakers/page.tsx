import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import SpeakersClient from './SpeakersClient'

export default async function SpeakersPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: speakers } = await supabase
    .from('speakers')
    .select('*')
    .eq('org_event_id', eventId)
    .order('name')

  // Derive base URL for self-fill links
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const proto = headersList.get('x-forwarded-proto') ?? 'http'
  const baseUrl = `${proto}://${host}`

  return (
    <SpeakersClient
      eventId={eventId}
      initialSpeakers={speakers ?? []}
      baseUrl={baseUrl}
    />
  )
}
