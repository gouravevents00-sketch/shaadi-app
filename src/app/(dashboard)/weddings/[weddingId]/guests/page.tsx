import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GuestsClient from './GuestsClient'

export default async function GuestsPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const sc = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: wedding }, { data: guests }, { data: events }, { data: guestEvents }] = await Promise.all([
    supabase.from('weddings').select('bride_name, groom_name, wedding_date, primary_city').eq('id', weddingId).single(),
    supabase.from('guests').select('*').eq('wedding_id', weddingId).order('name'),
    supabase.from('events').select('id, name, date, start_time, type').eq('wedding_id', weddingId).order('date').order('start_time'),
    supabase.from('guest_events').select('guest_id, event_id, rsvp_status')
      .in('event_id', (await supabase.from('events').select('id').eq('wedding_id', weddingId)).data?.map(e => e.id) ?? []),
  ])

  const guestIds = (guests ?? []).map((g: { id: string }) => g.id)
  const [{ data: arrivals }, { data: roomAllocs }, { data: rooms }] = await Promise.all([
    sc.from('arrivals').select('guest_id, mode, flight_train_no, arrival_time, pickup_required, status').eq('wedding_id', weddingId),
    guestIds.length > 0
      ? sc.from('room_allocations').select('guest_id, room_id, check_in, check_out, rooms(room_number, type, floor)').in('guest_id', guestIds)
      : Promise.resolve({ data: [] }),
    sc.from('rooms').select('id, room_number, type, floor').eq('wedding_id', weddingId).order('room_number'),
  ])

  return (
    <GuestsClient
      weddingId={weddingId}
      wedding={wedding ?? { bride_name: '', groom_name: '', wedding_date: null, primary_city: null }}
      initialGuests={guests ?? []}
      events={events ?? []}
      guestEvents={guestEvents ?? []}
      arrivals={(arrivals ?? []) as GuestArrival[]}
      roomAllocs={(roomAllocs ?? []) as GuestRoomAlloc[]}
      rooms={(rooms ?? []) as GuestRoom[]}
    />
  )
}

export type GuestArrival = {
  guest_id: string; mode: string; flight_train_no: string | null
  arrival_time: string | null; pickup_required: boolean; status: string
}
export type GuestRoomAlloc = {
  guest_id: string; room_id: string; check_in: string; check_out: string
  rooms: { room_number: string; type: string; floor: string | null } | null
}
export type GuestRoom = { id: string; room_number: string; type: string; floor: string | null }
