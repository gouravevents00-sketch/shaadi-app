'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { AiSetupPlan } from '@/app/api/ai/wedding-setup/[weddingId]/route'

export async function applyAiPlan(
  weddingId: string,
  plan: AiSetupPlan,
  weddingDate: string | null,
): Promise<{ vendors: number; budget: number; checklist: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { vendors: 0, budget: 0, checklist: 0, error: 'Not authenticated' }

  const { data: member } = await supabase.from('company_members')
    .select('company_id').eq('user_id', user.id).single()
  if (!member) return { vendors: 0, budget: 0, checklist: 0, error: 'No access' }

  const sc = createServiceClient()
  const { data: wedding } = await sc.from('weddings').select('id')
    .eq('id', weddingId).eq('company_id', member.company_id).single()
  if (!wedding) return { vendors: 0, budget: 0, checklist: 0, error: 'Not found' }

  let vendorsInserted = 0, budgetInserted = 0, checklistInserted = 0

  // ── 1. Insert vendor placeholders (skip existing by name+category) ──────────
  if (plan.vendors?.length) {
    const { data: existing } = await sc.from('vendors')
      .select('name, category').eq('wedding_id', weddingId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingKeys = new Set((existing ?? []).map((v: any) =>
      `${v.name.toLowerCase()}::${v.category.toLowerCase()}`
    ))
    const toInsert = plan.vendors
      .filter(v => !existingKeys.has(`${v.name.toLowerCase()}::${v.category.toLowerCase()}`))
      .map(v => ({
        wedding_id:   weddingId,
        category:     v.category,
        name:         v.name,
        status:       'enquired',
        total_amount: v.estimated ?? 0,
        paid_amount:  0,
        notes:        v.ceremony ? `Needed for ${v.ceremony}` : null,
      }))
    if (toInsert.length > 0) {
      const { data } = await sc.from('vendors').insert(toInsert).select('id')
      vendorsInserted = data?.length ?? 0
    }
  }

  // ── 2. Insert budget (findOrCreate categories, then items) ──────────────────
  if (plan.budget?.length) {
    const { data: existingCats } = await sc.from('budget_categories')
      .select('id, name').eq('wedding_id', weddingId)
    const catByName = new Map<string, string>()
    for (const c of existingCats ?? []) catByName.set(c.name.toLowerCase().trim(), c.id)

    const uniqueCats = [...new Set(plan.budget.map(b => b.category).filter(Boolean))]
    for (const catName of uniqueCats) {
      const key = catName.toLowerCase().trim()
      if (!catByName.has(key)) {
        const { data: newCat } = await sc.from('budget_categories')
          .insert({ wedding_id: weddingId, name: catName, estimated: 0, order: 0 })
          .select('id').single()
        if (newCat) catByName.set(key, newCat.id)
      }
    }

    const { data: existingItems } = await sc.from('budget_items')
      .select('id, category_id, description').eq('wedding_id', weddingId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemKeys = new Set((existingItems ?? []).map((i: any) =>
      `${i.category_id}::${i.description.toLowerCase().trim()}`
    ))

    const toInsert = plan.budget
      .map(b => {
        const catId = catByName.get(b.category.toLowerCase().trim())
        if (!catId) return null
        const key = `${catId}::${b.item.toLowerCase().trim()}`
        if (itemKeys.has(key)) return null
        return { wedding_id: weddingId, category_id: catId, description: b.item, estimated: b.estimated ?? 0, quoted: 0, paid: 0 }
      })
      .filter(Boolean) as object[]

    if (toInsert.length > 0) {
      const { data } = await sc.from('budget_items').insert(toInsert).select('id')
      budgetInserted = data?.length ?? 0
    }
  }

  // ── 3. Insert checklist tasks ───────────────────────────────────────────────
  if (plan.checklist?.length) {
    const { data: existingTasks } = await sc.from('checklist_items')
      .select('title').eq('wedding_id', weddingId)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingTitles = new Set((existingTasks ?? []).map((t: any) => t.title.toLowerCase().trim()))

    const toInsert = plan.checklist
      .filter(t => !existingTitles.has(t.title.toLowerCase().trim()))
      .map(t => {
        let dueDate: string | null = null
        if (weddingDate && t.due_days_before > 0) {
          const d = new Date(weddingDate + 'T00:00:00')
          d.setDate(d.getDate() - t.due_days_before)
          dueDate = d.toISOString().split('T')[0]
        }
        return {
          wedding_id: weddingId,
          title:      t.title,
          category:   t.category || 'General',
          status:     'pending',
          due_date:   dueDate,
        }
      })

    if (toInsert.length > 0) {
      const { data } = await sc.from('checklist_items').insert(toInsert).select('id')
      checklistInserted = data?.length ?? 0
    }
  }

  revalidatePath(`/weddings/${weddingId}/overview`)
  revalidatePath(`/weddings/${weddingId}/vendors`)
  revalidatePath(`/weddings/${weddingId}/budget`)
  revalidatePath(`/weddings/${weddingId}/checklist`)

  return { vendors: vendorsInserted, budget: budgetInserted, checklist: checklistInserted }
}
