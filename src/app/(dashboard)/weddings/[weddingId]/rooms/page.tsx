import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RoomsClient from './RoomsClient'

export default async function RoomsPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()

  const [roomsRes, guestsRes, weddingRes, mapsRes] = await Promise.all([
    sc
      .from('rooms')
      .select(`
        id, room_number, type, capacity, floor, notes,
        room_allocations (
          id, check_in, check_out, kit_given, kit_given_at,
          guests ( id, name, family_members )
        )
      `)
      .eq('wedding_id', weddingId)
      .order('room_number'),
    sc
      .from('guests')
      .select('id, name, side, family_members, arrival_date, departure_date, rsvp_submitted_at')
      .eq('wedding_id', weddingId)
      .order('name'),
    sc
      .from('weddings')
      .select('date_from, date_to, wedding_date')
      .eq('id', weddingId)
      .single(),
    // room_maps table — graceful if it doesn't exist yet
    sc
      .from('room_maps')
      .select('id, label, map_data, created_at')
      .eq('wedding_id', weddingId)
      .order('created_at'),
  ])

  return (
    <RoomsClient
      weddingId={weddingId}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialRooms={(roomsRes.data ?? []) as any[]}
      allGuests={guestsRes.data ?? []}
      wedding={weddingRes.data}
      initialMaps={mapsRes.data ?? []}
    />
  )
}
