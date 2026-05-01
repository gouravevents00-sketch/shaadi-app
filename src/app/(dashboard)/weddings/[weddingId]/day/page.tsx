import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DayClient from './DayClient'

export default async function DayPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const sc = createServiceClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]
  const todayStart = today + 'T00:00:00+00:00'
  const todayEnd   = today + 'T23:59:59+00:00'

  const [
    { data: wedding },
    { data: todayEvents },
    { data: allEvents },
    { data: checklistItems },
    { data: vendors },
    { data: guests },
    { data: guestEvents },
    { data: arrivals },
    { data: roomCheckIns },
    { data: fbCounts },
  ] = await Promise.all([
    supabase.from('weddings').select('bride_name, groom_name, wedding_date, primary_city').eq('id', weddingId).single(),
    supabase.from('events').select('*').eq('wedding_id', weddingId).eq('date', today).order('start_time'),
    supabase.from('events').select('id, name, date').eq('wedding_id', weddingId).order('date'),
    supabase.from('checklist_items')
      .select('id, title, category, status, due_date, assignee')
      .eq('wedding_id', weddingId)
      .neq('status', 'done')
      .or(`due_date.lte.${today},due_date.is.null`)
      .order('due_date', { ascending: true }),
    supabase.from('vendors')
      .select('id, name, category, phone, status')
      .eq('wedding_id', weddingId)
      .in('status', ['confirmed', 'booked']),
    supabase.from('guests').select('id, name, phone, is_vip, rsvp_submitted_at, needs_pickup').eq('wedding_id', weddingId),
    supabase.from('guest_events').select('guest_id, event_id')
      .in('event_id', (await supabase.from('events').select('id').eq('wedding_id', weddingId).eq('date', today)).data?.map(e => e.id) ?? []),
    // Arrivals: guests arriving today
    sc.from('arrivals')
      .select('*, guests(id, name, phone, is_vip)')
      .eq('wedding_id', weddingId)
      .gte('arrival_time', todayStart)
      .lte('arrival_time', todayEnd)
      .order('arrival_time'),
    // Room check-ins today
    sc.from('room_allocations')
      .select('*, guests(id, name, phone), rooms(room_number, type, floor)')
      .eq('check_in', today)
      .in('room_id',
        (await sc.from('rooms').select('id').eq('wedding_id', weddingId)).data?.map((r: { id: string }) => r.id) ?? []
      ),
    // F&B counts for today's events
    sc.from('fb_counts')
      .select('*, events(name)')
      .eq('wedding_id', weddingId)
      .in('event_id',
        (await sc.from('events').select('id').eq('wedding_id', weddingId).eq('date', today)).data?.map((e: { id: string }) => e.id) ?? []
      ),
  ])

  return (
    <DayClient
      weddingId={weddingId}
      wedding={wedding ?? { bride_name: '', groom_name: '', wedding_date: null, primary_city: null }}
      today={today}
      todayEvents={todayEvents ?? []}
      allEvents={allEvents ?? []}
      checklistItems={(checklistItems ?? []).filter(i => i.due_date === today || i.due_date < today || !i.due_date)}
      vendors={vendors ?? []}
      guests={guests ?? []}
      guestEvents={guestEvents ?? []}
      arrivals={(arrivals ?? []) as ArrivalRecord[]}
      roomCheckIns={(roomCheckIns ?? []) as RoomCheckIn[]}
      fbCounts={(fbCounts ?? []) as FbRecord[]}
    />
  )
}

export type ArrivalRecord = {
  id: string; mode: string; flight_train_no: string | null
  arrival_time: string | null; pickup_required: boolean; status: string
  guests: { id: string; name: string; phone: string | null; is_vip: boolean } | null
}

export type RoomCheckIn = {
  id: string; check_in: string; check_out: string; kit_given: boolean
  guests: { id: string; name: string; phone: string | null } | null
  rooms: { room_number: string; type: string; floor: string | null } | null
}

export type FbRecord = {
  id: string; meal_type: string; veg: number; non_veg: number; jain: number; other: number
  events: { name: string } | null
}
