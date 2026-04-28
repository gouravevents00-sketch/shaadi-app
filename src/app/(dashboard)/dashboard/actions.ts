'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getVerified(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const { data: access } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!access) return { error: 'No access' as const }
  // Verify wedding belongs to this company
  const { data: w } = await supabase.from('weddings').select('id').eq('id', weddingId).single()
  if (!w) return { error: 'Not found' as const }
  return { serviceClient: createServiceClient() }
}

export async function updateWedding(weddingId: string, data: {
  bride_name: string; groom_name: string
  date_from: string | null; date_to: string | null; wedding_date: string | null
  primary_venue: string | null; primary_city: string | null
  budget_total: number; status: string
}) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.serviceClient.from('weddings').update(data).eq('id', weddingId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  revalidatePath(`/weddings/${weddingId}/overview`)
  return { success: true }
}

export async function deleteWedding(weddingId: string) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.serviceClient.from('weddings').delete().eq('id', weddingId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}
