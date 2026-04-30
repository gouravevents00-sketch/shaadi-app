'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getVerified(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!member) return { error: 'No access' as const }
  return { sc: createServiceClient() }
}

const PATH = (id: string) => `/org-events/${id}/accommodation`

export type RoomRow = {
  id: string; org_event_id: string; room_number: string; room_type: string | null
  floor: string | null; capacity: number | null; is_allocated: boolean; notes: string | null; created_at: string
}

export type AllocationRow = {
  id: string; room_id: string; guest_name: string; check_in: string | null
  check_out: string | null; notes: string | null; created_at: string
}

export async function createRoom(eventId: string, data: { room_number: string; room_type?: string; floor?: string; capacity?: number; notes?: string }) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { data: room, error } = await r.sc.from('org_rooms').insert({ org_event_id: eventId, ...data }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { id: room.id }
}

export async function updateRoom(eventId: string, roomId: string, data: Partial<Omit<RoomRow, 'id' | 'org_event_id' | 'created_at'>>) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_rooms').update(data).eq('id', roomId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function deleteRoom(eventId: string, roomId: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_rooms').delete().eq('id', roomId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function allocateRoom(roomId: string, eventId: string, data: { guest_name: string; check_in?: string; check_out?: string; notes?: string }) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { data: alloc, error } = await r.sc
    .from('org_room_allocations').insert({ room_id: roomId, ...data }).select('id').single()
  if (error) return { error: error.message }
  await r.sc.from('org_rooms').update({ is_allocated: true }).eq('id', roomId)
  revalidatePath(PATH(eventId))
  return { id: alloc.id }
}

export async function removeAllocation(roomId: string, allocId: string, eventId: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  await r.sc.from('org_room_allocations').delete().eq('id', allocId)
  // Check if any allocations remain
  const { data: remaining } = await r.sc.from('org_room_allocations').select('id').eq('room_id', roomId).limit(1)
  if (!remaining?.length) await r.sc.from('org_rooms').update({ is_allocated: false }).eq('id', roomId)
  revalidatePath(PATH(eventId))
  return { success: true }
}
