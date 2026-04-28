import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CommsClient from './CommsClient'

export default async function CommsPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const [
    { data: wedding },
    { data: guests },
    { data: events },
    { data: comms },
  ] = await Promise.all([
    sc.from('weddings').select('bride_name, groom_name, wedding_date, primary_venue, primary_city').eq('id', weddingId).single(),
    sc.from('guests').select('id, name, phone, email, side, rsvp_status, is_vip').eq('wedding_id', weddingId).order('name'),
    sc.from('events').select('id, name, date, start_time, venue').eq('wedding_id', weddingId).order('date'),
    sc.from('communications').select('*').eq('wedding_id', weddingId).order('created_at', { ascending: false }).limit(50),
  ])

  return (
    <CommsClient
      weddingId={weddingId}
      wedding={wedding ?? { bride_name: '', groom_name: '', wedding_date: null, primary_venue: null, primary_city: null }}
      guests={guests ?? []}
      events={events ?? []}
      initialComms={comms ?? []}
    />
  )
}
