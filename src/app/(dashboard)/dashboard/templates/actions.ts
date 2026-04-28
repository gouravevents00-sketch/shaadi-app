'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getCompanyId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!member) return { error: 'No access' as const }
  return { sc: createServiceClient(), companyId: member.company_id }
}

export type TemplateItem = { title: string; category: string; side: string }

export async function createTemplate(name: string, items: TemplateItem[]) {
  const r = await getCompanyId()
  if ('error' in r) return { error: r.error }
  const { data: tpl, error } = await r.sc.from('checklist_templates')
    .insert({ company_id: r.companyId, name: name.trim() }).select('id').single()
  if (error) return { error: error.message }
  if (items.length > 0) {
    await r.sc.from('checklist_template_items').insert(
      items.map((i, idx) => ({ template_id: tpl.id, ...i, sort_order: idx }))
    )
  }
  revalidatePath('/dashboard/templates')
  return { id: tpl.id }
}

export async function deleteTemplate(templateId: string) {
  const r = await getCompanyId()
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('checklist_templates').delete()
    .eq('id', templateId).eq('company_id', r.companyId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/templates')
  return { success: true }
}

export async function addTemplateItem(templateId: string, item: TemplateItem) {
  const r = await getCompanyId()
  if ('error' in r) return { error: r.error }
  const { data, error } = await r.sc.from('checklist_template_items')
    .insert({ template_id: templateId, ...item, sort_order: 9999 }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath('/dashboard/templates')
  return { id: data.id }
}

export async function deleteTemplateItem(itemId: string) {
  const r = await getCompanyId()
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('checklist_template_items').delete().eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/templates')
  return { success: true }
}

export async function saveCurrentAsTemplate(weddingId: string, name: string) {
  const r = await getCompanyId()
  if ('error' in r) return { error: r.error }
  const { data: items, error: fetchErr } = await r.sc.from('checklist_items')
    .select('title, category, side').eq('wedding_id', weddingId).order('category').order('created_at')
  if (fetchErr) return { error: fetchErr.message }
  if (!items || items.length === 0) return { error: 'No checklist items to save' }
  return createTemplate(name, items as TemplateItem[])
}
