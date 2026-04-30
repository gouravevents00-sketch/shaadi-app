// ─── Sprint 2: Smart Automation Engine ────────────────────────────────────────
import { createServiceClient } from '@/lib/supabase/server'
import {
  findEventTemplate,
  findVendorFollowup,
  DATE_REMINDERS,
} from './templates'

type SC = ReturnType<typeof createServiceClient>

// ── 1. Event created → seed checklist + vendor slots + budget ─────────────────
export async function autoPopulateFromEvent(
  sc: SC,
  weddingId: string,
  eventName: string,
  eventDate: string | null,
) {
  const tpl = findEventTemplate(eventName)

  // Get max checklist order to append after existing items
  const { data: existing } = await sc
    .from('checklist_items')
    .select('"order"')
    .eq('wedding_id', weddingId)
    .order('"order"', { ascending: false })
    .limit(1)
  let order = (existing?.[0] as { order: number } | undefined)?.order ?? 0

  // Get existing checklist titles (for dedup)
  const { data: existingItems } = await sc
    .from('checklist_items')
    .select('title')
    .eq('wedding_id', weddingId)
  const existingTitles = new Set((existingItems ?? []).map((i: { title: string }) => i.title.toLowerCase()))

  // Insert checklist items
  const checklistRows = tpl.checklist
    .filter(c => !existingTitles.has(c.title.toLowerCase()))
    .map(c => {
      order += 1
      const dueDate = (eventDate && c.daysBeforeEvent)
        ? offsetDate(eventDate, -c.daysBeforeEvent)
        : null
      return {
        wedding_id: weddingId,
        title: c.title,
        category: c.category,
        due_date: dueDate,
        order,
        notes: `Auto-added for ${eventName}`,
      }
    })
  if (checklistRows.length > 0) {
    await sc.from('checklist_items').insert(checklistRows)
  }

  // Insert vendor slots — skip if same category already exists
  if (tpl.vendors.length > 0) {
    const { data: existingVendors } = await sc
      .from('vendors')
      .select('category')
      .eq('wedding_id', weddingId)
    const existingCats = new Set(
      (existingVendors ?? []).map((v: { category: string }) => v.category.toLowerCase())
    )
    const vendorRows = tpl.vendors
      .filter(v => !existingCats.has(v.category.toLowerCase()))
      .map(v => ({
        wedding_id: weddingId,
        name: v.name,
        category: v.category,
        status: 'enquired',
        total_amount: 0,
        paid_amount: 0,
      }))
    if (vendorRows.length > 0) {
      await sc.from('vendors').insert(vendorRows)
    }
  }

  // Insert budget items — find or create category, then add items
  for (const b of tpl.budget) {
    let catId: string | null = null

    const { data: existingCat } = await sc
      .from('budget_categories')
      .select('id')
      .eq('wedding_id', weddingId)
      .ilike('name', b.category)
      .maybeSingle()

    if (existingCat) {
      catId = existingCat.id
    } else {
      const { data: newCat } = await sc
        .from('budget_categories')
        .insert({ wedding_id: weddingId, name: b.category, estimated: 0, order: 0 })
        .select('id')
        .single()
      catId = newCat?.id ?? null
    }

    if (catId) {
      // Dedup by description
      const { data: existingBI } = await sc
        .from('budget_items')
        .select('id')
        .eq('category_id', catId)
        .ilike('description', b.description)
        .maybeSingle()
      if (!existingBI) {
        await sc.from('budget_items').insert({
          category_id: catId,
          wedding_id: weddingId,
          description: b.description,
          estimated: b.estimated,
        })
        // Update category estimated total
        const { data: allItems } = await sc
          .from('budget_items')
          .select('estimated')
          .eq('category_id', catId)
        const total = (allItems ?? []).reduce((s: number, i: { estimated: number }) => s + Number(i.estimated), 0)
        await sc.from('budget_categories').update({ estimated: total }).eq('id', catId)
      }
    }
  }
}

// ── 2. Vendor status → 'booked' → seed follow-up checklist tasks ──────────────
export async function autoPopulateFromVendorBooked(
  sc: SC,
  weddingId: string,
  vendorName: string,
  vendorCategory: string,
) {
  const followups = findVendorFollowup(vendorCategory)
  if (!followups.length) return

  // Get existing checklist titles for dedup
  const { data: existingItems } = await sc
    .from('checklist_items')
    .select('title')
    .eq('wedding_id', weddingId)
  const existingTitles = new Set((existingItems ?? []).map((i: { title: string }) => i.title.toLowerCase()))

  const { data: last } = await sc
    .from('checklist_items')
    .select('"order"')
    .eq('wedding_id', weddingId)
    .order('"order"', { ascending: false })
    .limit(1)
  let order = (last?.[0] as { order: number } | undefined)?.order ?? 0

  const rows = followups
    .filter(t => !existingTitles.has(t.toLowerCase()))
    .map(title => {
      order += 1
      return {
        wedding_id: weddingId,
        title,
        category: 'Vendors',
        order,
        notes: `Auto-added on booking ${vendorName}`,
      }
    })

  if (rows.length > 0) {
    await sc.from('checklist_items').insert(rows)
  }
}

// ── 3. Wedding date set → seed date-relative reminders ───────────────────────
export async function seedDateReminders(
  sc: SC,
  weddingId: string,
  weddingDate: string, // YYYY-MM-DD
) {
  const { data: existingItems } = await sc
    .from('checklist_items')
    .select('title')
    .eq('wedding_id', weddingId)
  const existingTitles = new Set((existingItems ?? []).map((i: { title: string }) => i.title.toLowerCase()))

  const { data: last } = await sc
    .from('checklist_items')
    .select('"order"')
    .eq('wedding_id', weddingId)
    .order('"order"', { ascending: false })
    .limit(1)
  let order = (last?.[0] as { order: number } | undefined)?.order ?? 0

  const rows = DATE_REMINDERS
    .filter(r => !existingTitles.has(r.title.toLowerCase()))
    .map(r => {
      order += 1
      return {
        wedding_id: weddingId,
        title: r.title,
        category: r.category,
        due_date: offsetDate(weddingDate, -r.daysBeforeEvent),
        order,
        notes: `Due ${r.daysBeforeEvent} days before event`,
      }
    })

  if (rows.length > 0) {
    await sc.from('checklist_items').insert(rows)
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function offsetDate(base: string, days: number): string {
  const d = new Date(base + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}
