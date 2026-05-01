'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GuestRow {
  name: string
  phone: string
  email: string
  side: string
  is_vip: boolean
  dietary: string
  dietary_notes: string
  family_group: string
  notes: string
}

export interface VendorRow {
  category: string
  name: string
  contact_name: string
  phone: string
  email: string
  status: string
  total_amount: number
  paid_amount: number
  notes: string
}

export interface BudgetRow {
  category: string
  item: string
  estimated: number
  actual: number
  vendor_name: string
  notes: string
}

export interface ImportPackResult {
  guests:  { imported: number; updated: number; skipped: number; errors: string[] }
  vendors: { imported: number; updated: number; skipped: number; errors: string[] }
  budget:  { imported: number; updated: number; skipped: number; errors: string[] }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAccess(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!member) return null
  const sc = createServiceClient()
  const { data: wedding } = await sc.from('weddings').select('id').eq('id', weddingId).eq('company_id', member.company_id).single()
  if (!wedding) return null
  return sc
}

/** Strip ₹, commas, spaces then parse — handles Indian formats like "1,50,000" */
function parseAmount(v: unknown): number {
  if (typeof v === 'number') return isNaN(v) ? 0 : v
  const cleaned = String(v ?? '').replace(/[₹,\s]/g, '').trim()
  const n = parseFloat(cleaned)
  return isNaN(n) ? 0 : n
}

const VALID_SIDES    = ['bride', 'groom', 'both', 'shared', 'neutral']
const VALID_DIETARY  = ['veg', 'non_veg', 'jain', 'other']
const VALID_STATUSES = ['enquired', 'confirmed', 'booked', 'cancelled', 'paid']

function normSide(v: string)    { const s = v.toLowerCase().trim(); return VALID_SIDES.includes(s) ? s : 'both' }
function normDietary(v: string) { const s = v.toLowerCase().replace(/[\s-]/g, '_').trim(); return VALID_DIETARY.includes(s) ? s : 'veg' }
function normStatus(v: string)  { const s = v.toLowerCase().trim(); return VALID_STATUSES.includes(s) ? s : 'enquired' }

// ─── Bulk import guests (merge-safe) ──────────────────────────────────────────

async function importGuests(
  sc: ReturnType<typeof createServiceClient>,
  weddingId: string,
  rows: GuestRow[],
) {
  const errors: string[] = []
  let imported = 0, updated = 0, skipped = 0

  // Fetch existing guests for this wedding (phone + name for matching)
  const { data: existing } = await sc
    .from('guests')
    .select('id, name, phone')
    .eq('wedding_id', weddingId)

  // Build lookup maps
  const byPhone = new Map<string, string>()  // phone → id
  const byName  = new Map<string, string>()  // lower(name) → id
  for (const g of existing ?? []) {
    if (g.phone?.trim()) byPhone.set(g.phone.trim().replace(/\s/g, ''), g.id)
    byName.set(g.name.toLowerCase().trim(), g.id)
  }

  const toInsert: object[] = []
  const toUpdate: { id: string; data: object }[] = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!r.name?.trim()) {
      errors.push(`Guest row ${i + 2}: Name required — skipped`)
      skipped++
      continue
    }
    const normPhone = r.phone?.trim().replace(/\s/g, '') || null
    const payload = {
      wedding_id:    weddingId,
      name:          r.name.trim(),
      phone:         normPhone || null,
      email:         r.email?.trim() || null,
      side:          normSide(r.side ?? ''),
      is_vip:        ['yes','true','1'].includes(String(r.is_vip).toLowerCase()),
      dietary:       normDietary(r.dietary ?? ''),
      dietary_notes: r.dietary_notes?.trim() || null,
      family_group:  r.family_group?.trim() || null,
      notes:         r.notes?.trim() || null,
    }

    // Match: phone first, then name
    const existingId = (normPhone && byPhone.get(normPhone))
      || byName.get(r.name.toLowerCase().trim())

    if (existingId) {
      toUpdate.push({ id: existingId, data: payload })
    } else {
      toInsert.push(payload)
      // Pre-register in map so duplicates within same file are caught
      if (normPhone) byPhone.set(normPhone, '__pending__')
      byName.set(r.name.toLowerCase().trim(), '__pending__')
    }
  }

  // Batch insert new guests
  if (toInsert.length > 0) {
    const { data, error } = await sc.from('guests').insert(toInsert).select('id')
    if (error) errors.push(`Guest insert failed: ${error.message}`)
    else imported = data?.length ?? 0
  }

  // Batch update existing guests (sequential for safety, Supabase doesn't support bulk update natively)
  for (const { id, data } of toUpdate) {
    const { error } = await sc.from('guests').update(data).eq('id', id)
    if (!error) updated++
    else errors.push(`Guest update ${id}: ${error.message}`)
  }

  return { imported, updated, skipped, errors }
}

// ─── Bulk import vendors (merge-safe) ─────────────────────────────────────────

async function importVendors(
  sc: ReturnType<typeof createServiceClient>,
  weddingId: string,
  rows: VendorRow[],
) {
  const errors: string[] = []
  let imported = 0, updated = 0, skipped = 0

  const { data: existing } = await sc
    .from('vendors')
    .select('id, name, category')
    .eq('wedding_id', weddingId)

  // Match by lower(name) + lower(category)
  const byKey = new Map<string, string>()
  for (const v of existing ?? []) {
    byKey.set(`${v.name.toLowerCase().trim()}::${v.category.toLowerCase().trim()}`, v.id)
  }

  const toInsert: object[] = []
  const toUpdate: { id: string; data: object }[] = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!r.category?.trim()) { errors.push(`Vendor row ${i + 2}: Category required`); skipped++; continue }
    if (!r.name?.trim())     { errors.push(`Vendor row ${i + 2}: Vendor Name required`); skipped++; continue }

    const payload = {
      wedding_id:   weddingId,
      category:     r.category.trim(),
      name:         r.name.trim(),
      contact_name: r.contact_name?.trim() || null,
      phone:        r.phone?.trim() || null,
      email:        r.email?.trim() || null,
      status:       normStatus(r.status ?? ''),
      total_amount: parseAmount(r.total_amount),
      paid_amount:  parseAmount(r.paid_amount),
      notes:        r.notes?.trim() || null,
    }

    const key = `${r.name.toLowerCase().trim()}::${r.category.toLowerCase().trim()}`
    const existingId = byKey.get(key)

    if (existingId) {
      toUpdate.push({ id: existingId, data: payload })
    } else {
      toInsert.push(payload)
      byKey.set(key, '__pending__')
    }
  }

  if (toInsert.length > 0) {
    const { data, error } = await sc.from('vendors').insert(toInsert).select('id')
    if (error) errors.push(`Vendor insert failed: ${error.message}`)
    else imported = data?.length ?? 0
  }

  for (const { id, data } of toUpdate) {
    const { error } = await sc.from('vendors').update(data).eq('id', id)
    if (!error) updated++
    else errors.push(`Vendor update ${id}: ${error.message}`)
  }

  return { imported, updated, skipped, errors }
}

// ─── Bulk import budget (merge-safe, 2-step: category → items) ────────────────

async function importBudget(
  sc: ReturnType<typeof createServiceClient>,
  weddingId: string,
  rows: BudgetRow[],
) {
  const errors: string[] = []
  let imported = 0, updated = 0, skipped = 0

  if (!rows.length) return { imported, updated, skipped, errors }

  // Step 1: Fetch existing categories
  const { data: existingCats } = await sc
    .from('budget_categories')
    .select('id, name')
    .eq('wedding_id', weddingId)

  const catByName = new Map<string, string>() // lower(name) → id
  for (const c of existingCats ?? []) catByName.set(c.name.toLowerCase().trim(), c.id)

  // Step 2: Create missing categories
  const uniqueCatNames = [...new Set(rows.map(r => r.category.trim()).filter(Boolean))]
  for (const catName of uniqueCatNames) {
    const key = catName.toLowerCase()
    if (!catByName.has(key)) {
      const { data: newCat, error } = await sc
        .from('budget_categories')
        .insert({ wedding_id: weddingId, name: catName, estimated: 0, order: 0 })
        .select('id')
        .single()
      if (error) {
        errors.push(`Budget category "${catName}": ${error.message}`)
      } else if (newCat) {
        catByName.set(key, newCat.id)
      }
    }
  }

  // Step 3: Fetch existing budget items (by wedding_id + description) for dedup
  const { data: existingItems } = await sc
    .from('budget_items')
    .select('id, category_id, description')
    .eq('wedding_id', weddingId)

  const itemByKey = new Map<string, string>() // catId::lower(description) → id
  for (const it of existingItems ?? []) {
    itemByKey.set(`${it.category_id}::${it.description.toLowerCase().trim()}`, it.id)
  }

  // Step 4: Insert or update items
  const toInsert: object[] = []
  const toUpdate: { id: string; data: object }[] = []

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!r.category?.trim()) { errors.push(`Budget row ${i + 2}: Category required`); skipped++; continue }
    if (!r.item?.trim())     { errors.push(`Budget row ${i + 2}: Item required`); skipped++; continue }

    const catId = catByName.get(r.category.toLowerCase().trim())
    if (!catId) { errors.push(`Budget row ${i + 2}: Could not create category "${r.category}"`); skipped++; continue }

    const payload = {
      wedding_id:  weddingId,
      category_id: catId,
      description: r.item.trim(),
      estimated:   parseAmount(r.estimated),
      quoted:      parseAmount(r.actual),    // map actual → quoted (closest match in schema)
      paid:        0,
    }

    const key = `${catId}::${r.item.toLowerCase().trim()}`
    const existingId = itemByKey.get(key)

    if (existingId) {
      toUpdate.push({ id: existingId, data: { estimated: payload.estimated, quoted: payload.quoted } })
    } else {
      toInsert.push(payload)
      itemByKey.set(key, '__pending__')
    }
  }

  if (toInsert.length > 0) {
    const { data, error } = await sc.from('budget_items').insert(toInsert).select('id')
    if (error) errors.push(`Budget item insert failed: ${error.message}`)
    else imported = data?.length ?? 0
  }

  for (const { id, data } of toUpdate) {
    const { error } = await sc.from('budget_items').update(data).eq('id', id)
    if (!error) updated++
    else errors.push(`Budget item update ${id}: ${error.message}`)
  }

  return { imported, updated, skipped, errors }
}

// ─── Existing data counts (for diff preview) ──────────────────────────────────

export async function getEventCounts(weddingId: string) {
  const sc = await getAccess(weddingId)
  if (!sc) return null
  const [{ count: guests }, { count: vendors }, { count: budget }] = await Promise.all([
    sc.from('guests').select('*', { count: 'exact', head: true }).eq('wedding_id', weddingId),
    sc.from('vendors').select('*', { count: 'exact', head: true }).eq('wedding_id', weddingId),
    sc.from('budget_items').select('*', { count: 'exact', head: true }).eq('wedding_id', weddingId),
  ])
  return { guests: guests ?? 0, vendors: vendors ?? 0, budget: budget ?? 0 }
}

// ─── Main bulk import action ──────────────────────────────────────────────────

export async function bulkImportPack(
  weddingId: string,
  guests: GuestRow[],
  vendors: VendorRow[],
  budget: BudgetRow[],
): Promise<ImportPackResult | { error: string }> {
  const sc = await getAccess(weddingId)
  if (!sc) return { error: 'Not authorized' }

  const [gResult, vResult, bResult] = await Promise.all([
    guests.length  ? importGuests(sc, weddingId, guests)  : Promise.resolve({ imported: 0, updated: 0, skipped: 0, errors: [] }),
    vendors.length ? importVendors(sc, weddingId, vendors) : Promise.resolve({ imported: 0, updated: 0, skipped: 0, errors: [] }),
    budget.length  ? importBudget(sc, weddingId, budget)  : Promise.resolve({ imported: 0, updated: 0, skipped: 0, errors: [] }),
  ])

  revalidatePath(`/weddings/${weddingId}/guests`)
  revalidatePath(`/weddings/${weddingId}/vendors`)
  revalidatePath(`/weddings/${weddingId}/budget`)
  revalidatePath(`/weddings/${weddingId}/overview`)

  return { guests: gResult, vendors: vResult, budget: bResult }
}
