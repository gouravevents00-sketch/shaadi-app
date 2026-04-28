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
  notes: string
}

const VALID_SIDES = ['bride', 'groom', 'both', 'shared', 'neutral']
const VALID_DIETARY = ['veg', 'non_veg', 'jain', 'other']

export async function bulkImportGuests(
  weddingId: string,
  rows: ImportRow[]
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { imported: 0, skipped: 0, errors: ['Not authenticated'] }

  const { data: access } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .single()
  if (!access) return { imported: 0, skipped: 0, errors: ['No access'] }

  const sc = createServiceClient()
  const errors: string[] = []
  let imported = 0
  let skipped = 0

  const validRows = rows.filter((row, i) => {
    if (!row.name?.trim()) {
      errors.push(`Row ${i + 2}: Name is required`)
      skipped++
      return false
    }
    return true
  }).map(row => ({
    wedding_id: weddingId,
    name: row.name.trim(),
    phone: row.phone?.trim() || null,
    email: row.email?.trim() || null,
    side: VALID_SIDES.includes(row.side?.toLowerCase()) ? row.side.toLowerCase() : 'both',
    is_vip: row.is_vip === true || String(row.is_vip).toLowerCase() === 'yes',
    dietary: VALID_DIETARY.includes(row.dietary?.toLowerCase()) ? row.dietary.toLowerCase() : 'veg',
    dietary_notes: row.dietary_notes?.trim() || null,
    notes: row.notes?.trim() || null,
  }))

  if (validRows.length > 0) {
    const { data, error } = await sc
      .from('guests')
      .insert(validRows)
      .select('id')

    if (error) {
      errors.push(`Import failed: ${error.message}`)
    } else {
      imported = data?.length ?? 0
    }
  }

  revalidatePath(`/weddings/${weddingId}/guests`)
  return { imported, skipped, errors }
}
