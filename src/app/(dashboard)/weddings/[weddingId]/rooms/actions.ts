'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getVerifiedUser(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const { data: access } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .single()
  if (!access) return { error: 'No access' as const }

  return { user, serviceClient: createServiceClient() }
}

// ─── Bulk room creation ──────────────────────────────────────────

export async function bulkCreateRooms(weddingId: string, rooms: Array<{
  room_number: string
  type: string
  capacity: number
  floor: string | null
  notes: string | null
}>) {
  const result = await getVerifiedUser(weddingId)
  if ('error' in result) return { error: result.error }

  const { error } = await result.serviceClient
    .from('rooms')
    .insert(rooms.map(r => ({ wedding_id: weddingId, ...r })))

  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/rooms`)
  return { success: true, count: rooms.length }
}

// ─── Single room CRUD ────────────────────────────────────────────

export async function updateRoom(weddingId: string, roomId: string, formData: {
  room_number: string
  type: string
  capacity: number
  floor: string | null
  notes: string | null
}) {
  const result = await getVerifiedUser(weddingId)
  if ('error' in result) return { error: result.error }

  const { error } = await result.serviceClient
    .from('rooms')
    .update(formData)
    .eq('id', roomId)

  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/rooms`)
  return { success: true }
}

export async function deleteRoom(weddingId: string, roomId: string) {
  const result = await getVerifiedUser(weddingId)
  if ('error' in result) return { error: result.error }

  const { error } = await result.serviceClient
    .from('rooms')
    .delete()
    .eq('id', roomId)

  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/rooms`)
  return { success: true }
}

// ─── Allocations ─────────────────────────────────────────────────

export async function allocateGuest(weddingId: string, roomId: string, data: {
  guest_id: string
  check_in: string
  check_out: string
}) {
  const result = await getVerifiedUser(weddingId)
  if ('error' in result) return { error: result.error }

  const { data: alloc, error } = await result.serviceClient
    .from('room_allocations')
    .insert({ room_id: roomId, ...data })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/rooms`)
  return { id: alloc.id }
}

export async function removeAllocation(weddingId: string, allocationId: string) {
  const result = await getVerifiedUser(weddingId)
  if ('error' in result) return { error: result.error }

  const { error } = await result.serviceClient
    .from('room_allocations')
    .delete()
    .eq('id', allocationId)

  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/rooms`)
  return { success: true }
}

export async function markKitGiven(weddingId: string, allocationId: string, given: boolean) {
  const result = await getVerifiedUser(weddingId)
  if ('error' in result) return { error: result.error }

  const { error } = await result.serviceClient
    .from('room_allocations')
    .update({
      kit_given: given,
      kit_given_at: given ? new Date().toISOString() : null,
    })
    .eq('id', allocationId)

  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/rooms`)
  return { success: true }
}

export async function markIdCollected(weddingId: string, allocationId: string, collected: boolean) {
  const result = await getVerifiedUser(weddingId)
  if ('error' in result) return { error: result.error }
  const { error } = await result.serviceClient
    .from('room_allocations')
    .update({ id_collected: collected, id_collected_at: collected ? new Date().toISOString() : null })
    .eq('id', allocationId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function markKeyIssued(weddingId: string, allocationId: string, issued: boolean) {
  const result = await getVerifiedUser(weddingId)
  if ('error' in result) return { error: result.error }
  const { error } = await result.serviceClient
    .from('room_allocations')
    .update({ key_issued: issued, key_issued_at: issued ? new Date().toISOString() : null })
    .eq('id', allocationId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function markWelcomeKit(weddingId: string, allocationId: string, given: boolean) {
  const result = await getVerifiedUser(weddingId)
  if ('error' in result) return { error: result.error }
  const { error } = await result.serviceClient
    .from('room_allocations')
    .update({ welcome_kit: given, welcome_kit_at: given ? new Date().toISOString() : null })
    .eq('id', allocationId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function markRoomCheckin(weddingId: string, allocationId: string, checkedIn: boolean) {
  const result = await getVerifiedUser(weddingId)
  if ('error' in result) return { error: result.error }
  const { error } = await result.serviceClient
    .from('room_allocations')
    .update({ checked_in_at: checkedIn ? new Date().toISOString() : null })
    .eq('id', allocationId)
  if (error) return { error: error.message }
  return { success: true }
}

// ─── Floor maps ───────────────────────────────────────────────────

export async function saveRoomMap(weddingId: string, label: string, mapData: string) {
  const result = await getVerifiedUser(weddingId)
  if ('error' in result) return { error: result.error }

  const { data, error } = await result.serviceClient
    .from('room_maps')
    .insert({ wedding_id: weddingId, label, map_data: mapData })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/rooms`)
  return { id: data.id }
}

export async function deleteRoomMap(weddingId: string, mapId: string) {
  const result = await getVerifiedUser(weddingId)
  if ('error' in result) return { error: result.error }

  const { error } = await result.serviceClient
    .from('room_maps')
    .delete()
    .eq('id', mapId)

  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/rooms`)
  return { success: true }
}
