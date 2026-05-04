'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface ImportRow {
  name: string
  phone: string
  email: string
  side: string
  is_vip: boolean
  dietary: string
  dietary_notes: string
  family_group: string
  plus_count: number
  notes: string
}

const VALID_SIDES   = ['bride', 'groom', 'both', 'shared', 'neutral']
const VALID_DIETARY = ['veg', 'non_veg', 'jain', 'other']

function normSide(v: string)    { const s = (v ?? '').toLowerCase().trim(); return VALID_SIDES.includes(s) ? s : 'both' }
function normDietary(v: string) { const s = (v ?? '').toLowerCase().replace(/[\s-]/g, '_').trim(); return VALID_DIETARY.includes(s) ? s : 'veg' }

export async function bulkImportGuests(
  weddingId: string,
  rows: ImportRow[]
): Promise<{ imported: number; updated: number; skipped: number; errors: string[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { imported: 0, updated: 0, skipped: 0, errors: ['Not authenticated'] }

  const { data: access } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .single()
  if (!access) return { imported: 0, updated: 0, skipped: 0, errors: ['No access'] }

  const sc = createServiceClient()
  const errors: string[] = []
  let imported = 0, updated = 0, skipped = 0

  // Fetch existing guests for merge-safe dedup
  const { data: existing } = await sc
    .from('guests').select('id, name, phone').eq('wedding_id', weddingId)

  const byPhone = new Map<string, string>()
  const byName  = new Map<string, string>()
  for (const g of existing ?? []) {
    if (g.phone?.trim()) byPhone.set(g.phone.trim().replace(/\s/g, ''), g.id)
    byName.set(g.name.toLowerCase().trim(), g.id)
  }

  const toInsert: object[] = []
  const toUpdate: { id: string; data: object }[] = []

  rows.forEach((row, i) => {
    if (!row.name?.trim()) {
      errors.push(`Row ${i + 2}: Name is required — skipped`)
      skipped++
      return
    }
    const normPhone = row.phone?.trim().replace(/\s/g, '') || null
    const payload = {
      wedding_id:    weddingId,
      name:          row.name.trim(),
      phone:         normPhone || null,
      email:         row.email?.trim() || null,
      side:          normSide(row.side),
      is_vip:        row.is_vip === true || ['yes','true','1','y'].includes(String(row.is_vip).toLowerCase()),
      dietary:       normDietary(row.dietary),
      dietary_notes: row.dietary_notes?.trim() || null,
      family_group:  row.family_group?.trim() || null,
      plus_count:    Number(row.plus_count) || 0,
      notes:         row.notes?.trim() || null,
    }

    const existingId = (normPhone && byPhone.get(normPhone))
      || byName.get(row.name.toLowerCase().trim())

    if (existingId) {
      toUpdate.push({ id: existingId, data: payload })
    } else {
      toInsert.push(payload)
      if (normPhone) byPhone.set(normPhone, '__pending__')
      byName.set(row.name.toLowerCase().trim(), '__pending__')
    }
  })

  if (toInsert.length > 0) {
    const { data, error } = await sc.from('guests').insert(toInsert).select('id')
    if (error) errors.push(`Import failed: ${error.message}`)
    else imported = data?.length ?? 0
  }

  for (const { id, data } of toUpdate) {
    const { error } = await sc.from('guests').update(data).eq('id', id)
    if (!error) updated++
    else errors.push(`Guest update ${id}: ${error.message}`)
  }

  revalidatePath(`/weddings/${weddingId}/guests`)
  return { imported, updated, skipped, errors }
}
