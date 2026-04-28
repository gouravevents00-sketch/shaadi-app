import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TimelineClient from './TimelineClient'

export default async function TimelinePage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const [{ data: events }, { data: items }] = await Promise.all([
    sc.from('events').select('id, name, date, start_time, end_time, venue').eq('wedding_id', weddingId).order('date').order('start_time' as never),
    sc.from('timeline_items').select('*').eq('wedding_id', weddingId).order('time'),
  ])

  return (
    <TimelineClient
      weddingId={weddingId}
      initialEvents={events ?? []}
      initialItems={items ?? []}
    />
  )
}
