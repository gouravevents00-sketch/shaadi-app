import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Star, Phone, Mail, Users } from 'lucide-react'
import Guest360Client from './Guest360Client'

export default async function Guest360Page({
  params,
}: {
  params: Promise<{ weddingId: string; guestId: string }>
}) {
  const { weddingId, guestId } = await params
  const sc = createServiceClient()

  const [{ data: guest }, { data: events }, { data: guestEvents }, { data: arrival }, { data: rooms }, { data: roomAlloc }] = await Promise.all([
    sc.from('guests').select('*').eq('id', guestId).single(),
    sc.from('events').select('id, name, date, type').eq('wedding_id', weddingId).order('date').order('start_time'),
    sc.from('guest_events').select('event_id, rsvp_status').eq('guest_id', guestId),
    sc.from('arrivals').select('*').eq('guest_id', guestId).maybeSingle(),
    sc.from('rooms').select('id, room_number, type, floor').eq('wedding_id', weddingId).order('room_number'),
    sc.from('room_allocations').select('*, rooms(room_number, type, floor)').eq('guest_id', guestId).maybeSingle(),
  ])

  if (!guest) notFound()

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <Link href={`/weddings/${weddingId}/guests`} className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to guests
      </Link>

      <div className="flex items-start gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
          <span className="text-rose-700 text-lg font-semibold">{guest.name[0]}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-stone-900">{guest.name}</h1>
            {guest.is_vip && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-stone-400">
            {guest.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" />{guest.phone}</span>}
            {guest.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{guest.email}</span>}
            {guest.plus_count > 0 && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />+{guest.plus_count}</span>}
          </div>
        </div>
      </div>

      <Guest360Client
        weddingId={weddingId}
        guest={guest}
        events={(events ?? []) as WeddingEvent[]}
        guestEvents={(guestEvents ?? []) as { event_id: string; rsvp_status: string }[]}
        arrival={arrival as ArrivalData | null}
        rooms={(rooms ?? []) as Room[]}
        roomAlloc={roomAlloc as RoomAlloc | null}
      />
    </div>
  )
}

export type WeddingEvent = { id: string; name: string; date: string; type: string }
export type ArrivalData = {
  id: string; mode: string; flight_train_no: string | null
  arrival_time: string | null; pickup_required: boolean; status: string
}
export type Room = { id: string; room_number: string; type: string; floor: string | null }
export type RoomAlloc = {
  id: string; room_id: string; check_in: string; check_out: string
  rooms: { room_number: string; type: string; floor: string | null } | null
}
