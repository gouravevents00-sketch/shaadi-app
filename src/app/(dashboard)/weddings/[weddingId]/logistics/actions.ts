'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Vehicles ────────────────────────────────────────────────────

export async function createVehicle(
  weddingId: string,
  data: { number: string; type: string; driver_name: string; driver_phone: string; capacity: number }
) {
  const sc = createServiceClient()
  const { data: row, error } = await sc.from('vehicles').insert({ wedding_id: weddingId, ...data }).select().single()
  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/logistics`)
  return row
}

export async function updateVehicle(
  weddingId: string,
  vehicleId: string,
  data: Partial<{ number: string; type: string; driver_name: string; driver_phone: string; capacity: number }>
) {
  const sc = createServiceClient()
  const { error } = await sc.from('vehicles').update(data).eq('id', vehicleId)
  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/logistics`)
  return { ok: true }
}

export async function deleteVehicle(weddingId: string, vehicleId: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('vehicles').delete().eq('id', vehicleId)
  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/logistics`)
  return { ok: true }
}

// ── Pickups ─────────────────────────────────────────────────────

export async function createPickup(
  weddingId: string,
  data: {
    guest_id: string
    vehicle_id: string | null
    type: string
    scheduled_time: string
    from_location: string
    to_location: string
    notes: string | null
  }
) {
  const sc = createServiceClient()
  const { data: row, error } = await sc.from('pickups').insert({ wedding_id: weddingId, ...data }).select().single()
  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/logistics`)
  return row
}

export async function updatePickup(
  weddingId: string,
  pickupId: string,
  data: Partial<{
    vehicle_id: string | null
    status: string
    actual_time: string | null
    notes: string | null
    scheduled_time: string
    from_location: string
    to_location: string
  }>
) {
  const sc = createServiceClient()
  const { error } = await sc.from('pickups').update(data).eq('id', pickupId)
  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/logistics`)
  return { ok: true }
}

export async function deletePickup(weddingId: string, pickupId: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('pickups').delete().eq('id', pickupId)
  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/logistics`)
  return { ok: true }
}

// ── Arrivals ────────────────────────────────────────────────────

export async function upsertArrival(
  weddingId: string,
  data: {
    id?: string
    guest_id: string
    event_id: string | null
    mode: string
    flight_train_no: string | null
    arrival_time: string | null
    pickup_required: boolean
    status: string
  }
) {
  const sc = createServiceClient()
  if (data.id) {
    const { id, ...rest } = data
    const { error } = await sc.from('arrivals').update(rest).eq('id', id)
    if (error) return { error: error.message }
  } else {
    const { error } = await sc.from('arrivals').insert({ wedding_id: weddingId, ...data })
    if (error) return { error: error.message }
  }
  revalidatePath(`/weddings/${weddingId}/logistics`)
  return { ok: true }
}

export async function deleteArrival(weddingId: string, arrivalId: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('arrivals').delete().eq('id', arrivalId)
  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/logistics`)
  return { ok: true }
}
