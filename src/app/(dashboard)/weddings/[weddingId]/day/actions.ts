'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ── Incidents ────────────────────────────────────────────────

export async function createIncident(weddingId: string, data: {
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
}) {
  const user = await getUser()
  if (!user) return { error: 'Not authenticated' }
  const sc = createServiceClient()
  const { data: row, error } = await sc.from('incidents').insert({
    wedding_id: weddingId,
    reported_by: user.id,
    status: 'open',
    ...data,
  }).select('id, title, description, severity, status, created_at').single()
  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/day`)
  return row
}

export async function resolveIncident(weddingId: string, incidentId: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('incidents')
    .update({ status: 'resolved', resolved_at: new Date().toISOString() })
    .eq('id', incidentId)
  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/day`)
  return { ok: true }
}

export async function assignIncident(weddingId: string, incidentId: string, userId: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('incidents')
    .update({ assigned_to: userId, status: 'assigned' })
    .eq('id', incidentId)
  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/day`)
  return { ok: true }
}

// ── F&B Counts ───────────────────────────────────────────────

export async function saveFbCount(weddingId: string, data: {
  event_id: string
  meal_type: string
  veg: number
  non_veg: number
  jain: number
  other: number
  notes?: string
}) {
  const user = await getUser()
  if (!user) return { error: 'Not authenticated' }
  const sc = createServiceClient()
  const { data: row, error } = await sc.from('fb_counts').insert({
    wedding_id: weddingId,
    counted_by: user.id,
    ...data,
  }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/day`)
  return { id: row.id }
}

// ── Staff Tasks ──────────────────────────────────────────────

export async function createStaffTask(weddingId: string, data: {
  title: string
  description?: string
  category: string
  assigned_to?: string | null
  assigned_name?: string | null
  due_date?: string | null
  due_time?: string | null
  priority: string
  event_id?: string | null
}) {
  const user = await getUser()
  if (!user) return { error: 'Not authenticated' }
  const sc = createServiceClient()
  const { data: row, error } = await sc.from('staff_tasks').insert({
    wedding_id: weddingId,
    created_by: user.id,
    status: 'pending',
    ...data,
  }).select('*').single()
  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/team`)
  return row
}

export async function updateStaffTaskStatus(weddingId: string, taskId: string, status: string) {
  const sc = createServiceClient()
  const patch: Record<string, unknown> = { status }
  if (status === 'done') patch.completed_at = new Date().toISOString()
  const { error } = await sc.from('staff_tasks').update(patch).eq('id', taskId)
  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/team`)
  return { ok: true }
}

export async function deleteStaffTask(weddingId: string, taskId: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('staff_tasks').delete().eq('id', taskId)
  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/team`)
  return { ok: true }
}
