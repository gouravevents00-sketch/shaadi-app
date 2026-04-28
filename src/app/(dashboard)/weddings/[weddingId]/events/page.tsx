import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EventsClient from './EventsClient'

export default async function EventsPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: events }, { data: wedding }] = await Promise.all([
    supabase.from('events').select('*').eq('wedding_id', weddingId)
      .order('date', { ascending: true }).order('start_time', { ascending: true }),
    supabase.from('weddings').select('primary_venue, primary_city').eq('id', weddingId).single(),
  ])

  return (
    <EventsClient
      weddingId={weddingId}
      initialEvents={events ?? []}
      defaultVenue={wedding?.primary_venue ?? ''}
      defaultCity={wedding?.primary_city ?? ''}
    />
  )
}
