'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getVerified(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const { data: access } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!access) return { error: 'No access' as const }
  return { sc: createServiceClient() }
}

const PATH = (id: string) => `/weddings/${id}/budget`
const norm = (s: string) => s.trim().toLowerCase()

// ─── Categories ───────────────────────────────────────────────────

export async function createCategory(weddingId: string, data: { name: string; estimated: number }) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { data: cat, error } = await r.sc.from('budget_categories')
    .insert({ wedding_id: weddingId, ...data }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { id: cat.id }
}

export async function bulkCreateCategories(weddingId: string, cats: { name: string; estimated: number; order: number }[]) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const rows = cats.map(c => ({ wedding_id: weddingId, name: c.name, estimated: c.estimated, order: c.order }))
  const { error } = await r.sc.from('budget_categories').insert(rows)
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { created: rows.length }
}

export async function updateCategory(weddingId: string, catId: string, data: { name?: string; estimated?: number }) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('budget_categories').update(data).eq('id', catId)
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { success: true }
}

export async function deleteCategory(weddingId: string, catId: string) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('budget_categories').delete().eq('id', catId)
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { success: true }
}

// ─── Deduplicate categories (merge same-name dupes) ────────────────

export async function deduplicateCategories(weddingId: string) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { sc } = r

  const { data: cats } = await sc.from('budget_categories').select('id, name').eq('wedding_id', weddingId)
  if (!cats || cats.length === 0) return { success: true, removed: 0 }

  // Group by normalized name
  const groups: Record<string, { id: string; name: string }[]> = {}
  for (const c of cats) {
    const key = norm(c.name)
    if (!groups[key]) groups[key] = []
    groups[key].push(c)
  }

  let removed = 0
  for (const dupes of Object.values(groups)) {
    if (dupes.length <= 1) continue
    // Keep the first, migrate items from dupes to keeper, delete dupes
    const keeper = dupes[0]
    const toRemove = dupes.slice(1).map(d => d.id)
    // Move budget_items to keeper
    await sc.from('budget_items').update({ category_id: keeper.id }).in('category_id', toRemove)
    // Delete dupe categories
    await sc.from('budget_categories').delete().in('id', toRemove)
    removed += toRemove.length
  }

  revalidatePath(PATH(weddingId))
  return { success: true, removed }
}

// ─── Import from checklist + events ───────────────────────────────

export async function importFromChecklist(weddingId: string) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { sc } = r

  const [{ data: checklistItems }, { data: events }, { data: existingCats }] = await Promise.all([
    sc.from('checklist_items').select('category').eq('wedding_id', weddingId),
    sc.from('events').select('id').eq('wedding_id', weddingId),
    sc.from('budget_categories').select('name').eq('wedding_id', weddingId),
  ])

  const existingNorms = new Set((existingCats ?? []).map((c: { name: string }) => norm(c.name)))

  const newCats: string[] = []
  const seen = new Set<string>()

  // Checklist categories — deduped by normalized name
  for (const item of checklistItems ?? []) {
    const key = norm(item.category)
    if (!existingNorms.has(key) && !seen.has(key)) {
      seen.add(key)
      newCats.push(item.category)
    }
  }

  // Events & Functions
  const evKey = norm('Events & Functions')
  if ((events ?? []).length > 0 && !existingNorms.has(evKey) && !seen.has(evKey)) {
    newCats.push('Events & Functions')
  }

  if (newCats.length === 0) return { success: true, created: 0 }

  const { error } = await sc.from('budget_categories')
    .insert(newCats.map((name, i) => ({ wedding_id: weddingId, name, estimated: 0, order: i })))
  if (error) return { error: error.message }

  revalidatePath(PATH(weddingId))
  return { success: true, created: newCats.length }
}

// ─── Sync budget categories from vendors ──────────────────────────

export async function syncFromVendors(weddingId: string) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { sc } = r

  const [{ data: vendors }, { data: existingCats }] = await Promise.all([
    sc.from('vendors').select('category, total_amount').eq('wedding_id', weddingId),
    sc.from('budget_categories').select('id, name, estimated').eq('wedding_id', weddingId),
  ])

  if (!vendors || vendors.length === 0) return { success: true, created: 0, updated: 0 }

  type ExistingCat = { id: string; name: string; estimated: number }
  const existingMap = new Map<string, ExistingCat>((existingCats ?? []).map((c: ExistingCat) => [norm(c.name), c]))

  // Sum vendor totals per category
  const vendorTotals: Record<string, number> = {}
  for (const v of vendors) {
    const key = norm(v.category)
    vendorTotals[key] = (vendorTotals[key] ?? 0) + Number(v.total_amount)
  }

  let created = 0, updated = 0
  const catOrder = (existingCats ?? []).length

  for (const [key, total] of Object.entries(vendorTotals)) {
    const existing = existingMap.get(key)
    if (existing) {
      // Update estimated if it's still 0 (not manually set)
      if (existing.estimated === 0 && total > 0) {
        await sc.from('budget_categories').update({ estimated: total }).eq('id', existing.id)
        updated++
      }
    } else {
      // Find the original-cased category name from vendors
      const originalName = vendors.find((v: { category: string }) => norm(v.category) === key)?.category ?? key
      await sc.from('budget_categories').insert({
        wedding_id: weddingId, name: originalName, estimated: total, order: catOrder + created
      })
      created++
    }
  }

  revalidatePath(PATH(weddingId))
  return { success: true, created, updated }
}

// ─── Items ────────────────────────────────────────────────────────

export async function createItem(weddingId: string, data: {
  category_id: string; description: string
  estimated: number; quoted: number; paid: number; due_date: string | null
}) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { data: item, error } = await r.sc.from('budget_items')
    .insert({ wedding_id: weddingId, ...data }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { id: item.id }
}

export async function updateItem(weddingId: string, itemId: string, data: {
  description?: string; estimated?: number; quoted?: number; paid?: number; due_date?: string | null
}) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('budget_items').update(data).eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { success: true }
}

export async function deleteItem(weddingId: string, itemId: string) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('budget_items').delete().eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { success: true }
}
