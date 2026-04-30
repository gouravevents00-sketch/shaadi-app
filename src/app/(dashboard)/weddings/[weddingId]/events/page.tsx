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
    supabase.from('weddings').select('primary_venue, primary_city, date_from, date_to, wedding_date').eq('id', weddingId).single(),
  ])

  // Build quick-date chips from the wedding date range
  const quickDates: { label: string; value: string }[] = []
  const from = wedding?.date_from ?? wedding?.wedding_date
  const to = wedding?.date_to ?? wedding?.wedding_date
  if (from) {
    const cur = new Date(from + 'T00:00:00')
    const end = new Date((to ?? from) + 'T00:00:00')
    while (cur <= end) {
      quickDates.push({
        label: cur.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        value: cur.toISOString().slice(0, 10),
      })
      cur.setDate(cur.getDate() + 1)
    }
  }

  return (
    <EventsClient
      weddingId={weddingId}
      initialEvents={events ?? []}
      defaultVenue={wedding?.primary_venue ?? ''}
      defaultCity={wedding?.primary_city ?? ''}
      defaultDate={from ?? ''}
      quickDates={quickDates}
    />
  )
}
