'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const PATH = (wId: string, gId: string) => `/weddings/${wId}/guests/${gId}`

export async function updateGuestField(weddingId: string, guestId: string, data: Record<string, string | number | boolean | null>): Promise<{ error: string } | { success: true }> {
  const sc = createServiceClient()
  const { error } = await sc.from('guests').update(data).eq('id', guestId)
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId, guestId))
  revalidatePath(`/weddings/${weddingId}/guests`)
  return { success: true }
}

export async function toggleGuestEvent(weddingId: string, guestId: string, eventId: string, rsvpStatus: string) {
  const sc = createServiceClient()
  const { data: existing } = await sc.from('guest_events')
    .select('id, rsvp_status').eq('guest_id', guestId).eq('event_id', eventId).maybeSingle()

  if (existing) {
    if (rsvpStatus === 'remove') {
      await sc.from('guest_events').delete().eq('id', existing.id)
    } else {
      await sc.from('guest_events').update({ rsvp_status: rsvpStatus }).eq('id', existing.id)
    }
  } else if (rsvpStatus !== 'remove') {
    await sc.from('guest_events').insert({ guest_id: guestId, event_id: eventId, rsvp_status: rsvpStatus })
  }
  revalidatePath(PATH(weddingId, guestId))
  return { success: true }
}

export async function upsertArrival(weddingId: string, guestId: string, data: {
  mode: string; flight_train_no?: string; arrival_time?: string; pickup_required: boolean; status: string
}) {
  const sc = createServiceClient()
  const { data: existing } = await sc.from('arrivals')
    .select('id').eq('guest_id', guestId).maybeSingle()

  if (existing) {
    await sc.from('arrivals').update({ ...data }).eq('id', existing.id)
  } else {
    await sc.from('arrivals').insert({ wedding_id: weddingId, guest_id: guestId, ...data })
  }
  revalidatePath(PATH(weddingId, guestId))
  return { success: true }
}

export async function assignRoom(weddingId: string, guestId: string, roomId: string, checkIn: string, checkOut: string) {
  const sc = createServiceClient()
  // Remove existing
  await sc.from('room_allocations').delete().eq('guest_id', guestId)
  // Assign new
  if (roomId) {
    const { error } = await sc.from('room_allocations').insert({
      room_id: roomId, guest_id: guestId, check_in: checkIn, check_out: checkOut
    })
    if (error) return { error: error.message }
  }
  revalidatePath(PATH(weddingId, guestId))
  return { success: true }
}
