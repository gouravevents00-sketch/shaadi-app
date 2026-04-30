import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AccommodationClient from './AccommodationClient'

export default async function AccommodationPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const [{ data: rooms }, { data: roomIds }] = await Promise.all([
    sc.from('org_rooms').select('*').eq('org_event_id', eventId).order('room_number'),
    sc.from('org_rooms').select('id').eq('org_event_id', eventId),
  ])

  const ids = (roomIds ?? []).map((r: { id: string }) => r.id)
  const { data: allocations } = ids.length
    ? await sc.from('org_room_allocations').select('*').in('room_id', ids)
    : { data: [] }

  return <AccommodationClient eventId={eventId} initialRooms={rooms ?? []} initialAllocations={allocations ?? []} />
}
