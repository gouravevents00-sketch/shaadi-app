'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── F&B Counts ────────────────────────────────────────────────

export async function upsertFbCount(weddingId: string, eventId: string, data: {
  meal_type: string; veg: number; non_veg: number; jain: number; other: number; notes?: string
}) {
  const sc = createServiceClient()
  // Check if exists
  const { data: existing } = await sc.from('fb_counts')
    .select('id').eq('event_id', eventId).eq('meal_type', data.meal_type).maybeSingle()

  if (existing) {
    const { error } = await sc.from('fb_counts').update({
      veg: data.veg, non_veg: data.non_veg, jain: data.jain, other: data.other, notes: data.notes ?? null
    }).eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { createClient } = await import('@/lib/supabase/server')
    const { data: { user } } = await (await createClient()).auth.getUser()
    const { error } = await sc.from('fb_counts').insert({
      wedding_id: weddingId, event_id: eventId,
      meal_type: data.meal_type, veg: data.veg, non_veg: data.non_veg,
      jain: data.jain, other: data.other, notes: data.notes ?? null,
      counted_by: user?.id ?? null,
    })
    if (error) return { error: error.message }
  }
  revalidatePath(`/weddings/${weddingId}/events/${eventId}`)
  return { success: true }
}

// ─── Decor Items ───────────────────────────────────────────────

export async function createDecorItem(weddingId: string, eventId: string, title: string) {
  const sc = createServiceClient()
  const { data, error } = await sc.from('decor_items')
    .insert({ wedding_id: weddingId, event_id: eventId, title })
    .select('id').single()
  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/events/${eventId}`)
  return { id: data.id }
}

export async function updateDecorStatus(weddingId: string, itemId: string, status: string, issue_note?: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('decor_items').update({
    status,
    issue_note: issue_note ?? null,
    completed_at: status === 'done' ? new Date().toISOString() : null,
  }).eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/events/`)
  return { success: true }
}

export async function deleteDecorItem(weddingId: string, itemId: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('decor_items').delete().eq('id', itemId)
  if (error) return { error: error.message }
  return { success: true }
}
