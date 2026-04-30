'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface DelegateImportRow {
  name: string
  title: string
  organization: string
  phone: string
  email: string
  is_vip: boolean
  dietary: string
  dietary_notes: string
  notes: string
}

const VALID_DIETARY = ['veg', 'non_veg', 'jain', 'other']

export async function bulkImportDelegates(
  eventId: string,
  rows: DelegateImportRow[]
): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { imported: 0, skipped: 0, errors: ['Not authenticated'] }
  const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!member) return { imported: 0, skipped: 0, errors: ['No access'] }

  const sc = createServiceClient()
  const errors: string[] = []
  let skipped = 0

  const validRows = rows.filter((row, i) => {
    if (!row.name?.trim()) {
      errors.push(`Row ${i + 2}: Name is required`)
      skipped++
      return false
    }
    return true
  }).map(row => ({
    org_event_id: eventId,
    name: row.name.trim(),
    title: row.title?.trim() || null,
    organization: row.organization?.trim() || null,
    phone: row.phone?.trim() || null,
    email: row.email?.trim() || null,
    is_vip: row.is_vip === true || ['yes', 'true', '1', 'y'].includes(String(row.is_vip).toLowerCase()),
    dietary: VALID_DIETARY.includes(row.dietary?.toLowerCase()) ? row.dietary.toLowerCase() : 'veg',
    dietary_notes: row.dietary_notes?.trim() || null,
    notes: row.notes?.trim() || null,
    status: 'registered' as const,
  }))

  let imported = 0
  if (validRows.length > 0) {
    const { data, error } = await sc.from('delegates').insert(validRows).select('id')
    if (error) {
      errors.push(`Import failed: ${error.message}`)
    } else {
      imported = data?.length ?? 0
    }
  }

  revalidatePath(`/org-events/${eventId}/delegates`)
  return { imported, skipped, errors }
}
