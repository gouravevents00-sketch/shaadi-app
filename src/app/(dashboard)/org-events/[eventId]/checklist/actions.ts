'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getVerified(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!member) return { error: 'No access' as const }
  return { sc: createServiceClient(), supabase }
}

const PATH = (id: string) => `/org-events/${id}/checklist`

export async function createItem(eventId: string, data: {
  title: string; category: string; due_date: string | null; notes: string | null
}) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { data: item, error } = await r.sc
    .from('org_checklist_items')
    .insert({ org_event_id: eventId, ...data, status: 'pending', order: 0 })
    .select('id')
    .single()
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { id: item.id }
}

export async function updateItem(eventId: string, itemId: string, data: {
  title?: string; category?: string; status?: string
  due_date?: string | null; notes?: string | null
}) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_checklist_items').update(data).eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function deleteItem(eventId: string, itemId: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_checklist_items').delete().eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function loadTemplateItems(eventId: string, eventType: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }

  // Fetch system templates for this event type
  const { data: templates, error: tErr } = await r.sc
    .from('checklist_templates')
    .select('title, category, order')
    .eq('event_type', eventType)
    .is('company_id', null)
    .order('order')

  if (tErr) return { error: tErr.message }
  if (!templates?.length) return { error: 'No templates found for this event type' }

  // Delete existing items first
  await r.sc.from('org_checklist_items').delete().eq('org_event_id', eventId)

  // Insert template items
  const { error: insErr } = await r.sc.from('org_checklist_items').insert(
    templates.map((t: { title: string; category: string }, i: number) => ({
      org_event_id: eventId,
      title: t.title,
      category: t.category,
      status: 'pending',
      order: i,
    }))
  )
  if (insErr) return { error: insErr.message }
  revalidatePath(PATH(eventId))
  return { success: true, count: templates.length }
}

export async function bulkCreateItems(eventId: string, items: Array<{ title: string; category: string }>) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_checklist_items').insert(
    items.map((item, i) => ({ org_event_id: eventId, ...item, status: 'pending', order: i }))
  )
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true, count: items.length }
}
