import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import InviteCardClient from './InviteCardClient'

export default async function InviteCardPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const { data: wedding } = await sc
    .from('weddings')
    .select('bride_name, groom_name, wedding_date, primary_venue, primary_city')
    .eq('id', weddingId)
    .single()

  const { data: events } = await sc
    .from('events')
    .select('id, name, date, start_time, venue, city')
    .eq('wedding_id', weddingId)
    .order('date')

  return (
    <InviteCardClient
      weddingId={weddingId}
      wedding={wedding ?? { bride_name: null, groom_name: null, wedding_date: null, primary_venue: null, primary_city: null }}
      events={events ?? []}
    />
  )
}
