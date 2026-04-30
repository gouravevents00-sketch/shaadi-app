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

const PATH = (id: string) => `/org-events/${id}/budget`

export async function updateBudgetTotal(eventId: string, budget_total: number) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_events').update({ budget_total }).eq('id', eventId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function createCategory(eventId: string, data: { name: string; estimated: number }) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { data: cat, error } = await r.sc
    .from('org_budget_categories')
    .insert({ org_event_id: eventId, ...data, order: 0 })
    .select('id').single()
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { id: cat.id }
}

export async function updateCategory(eventId: string, catId: string, data: { name?: string; estimated?: number }) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_budget_categories').update(data).eq('id', catId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function deleteCategory(eventId: string, catId: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_budget_categories').delete().eq('id', catId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function createItem(eventId: string, data: { category_id: string; description: string }) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { data: item, error } = await r.sc
    .from('org_budget_items')
    .insert({ org_event_id: eventId, ...data, quoted: 0, paid: 0 })
    .select('id').single()
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { id: item.id }
}

export async function updateItem(eventId: string, itemId: string, data: {
  description?: string; quoted?: number; paid?: number; due_date?: string | null; notes?: string | null
}) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_budget_items').update(data).eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function deleteItem(eventId: string, itemId: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_budget_items').delete().eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function importFromChecklist(eventId: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  // Get distinct checklist categories
  const { data: items } = await r.sc
    .from('org_checklist_items')
    .select('category')
    .eq('org_event_id', eventId)
  if (!items?.length) return { error: 'No checklist items found' }
  const cats = [...new Set(items.map((i: { category: string }) => i.category))] as string[]
  // Get existing budget categories
  const { data: existing } = await r.sc
    .from('org_budget_categories')
    .select('name')
    .eq('org_event_id', eventId)
  const existingNames = new Set((existing ?? []).map((c: { name: string }) => c.name.toLowerCase()))
  const toCreate = cats.filter((c: string) => !existingNames.has(c.toLowerCase()))
  if (!toCreate.length) return { created: 0 }
  const { error } = await r.sc.from('org_budget_categories').insert(
    toCreate.map((name, i) => ({ org_event_id: eventId, name, estimated: 0, order: i }))
  )
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { created: toCreate.length }
}
