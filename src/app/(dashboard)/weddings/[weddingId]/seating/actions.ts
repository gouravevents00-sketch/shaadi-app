'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getVerified(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  return { sc: createServiceClient() }
}

const PATH = (id: string) => `/weddings/${id}/seating`

export async function createTable(weddingId: string, data: { name: string; capacity: number; event_id?: string | null }) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { data: t, error } = await r.sc.from('seating_tables')
    .insert({ wedding_id: weddingId, name: data.name, capacity: data.capacity, event_id: data.event_id ?? null })
    .select('id').single()
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { id: t.id }
}

export async function updateTable(weddingId: string, tableId: string, data: { name?: string; capacity?: number }) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('seating_tables').update(data).eq('id', tableId)
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { success: true }
}

export async function deleteTable(weddingId: string, tableId: string) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('seating_tables').delete().eq('id', tableId)
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { success: true }
}

export async function assignGuest(weddingId: string, tableId: string, guestId: string) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  // Remove any existing assignment for this guest in this wedding's tables
  await r.sc.from('seating_assignments')
    .delete()
    .in('table_id',
      (await r.sc.from('seating_tables').select('id').eq('wedding_id', weddingId)).data?.map((t: { id: string }) => t.id) ?? []
    )
    .eq('guest_id', guestId)
  const { error } = await r.sc.from('seating_assignments').insert({ table_id: tableId, guest_id: guestId })
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { success: true }
}

export async function unassignGuest(weddingId: string, tableId: string, guestId: string) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('seating_assignments').delete()
    .eq('table_id', tableId).eq('guest_id', guestId)
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { success: true }
}
