'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function verifyClient(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const sc = createServiceClient()
  const { data: invite } = await sc.from('invites')
    .select('id, side')
    .eq('wedding_id', weddingId).eq('role', 'client').eq('email', user.email ?? '')
    .not('accepted_at', 'is', null).single()
  if (!invite) return { error: 'No access' as const }
  return { sc }
}

export async function addFunctionRequest(weddingId: string, title: string, notes?: string) {
  const r = await verifyClient(weddingId)
  if ('error' in r) return { error: r.error }
  const { data, error } = await r.sc.from('requirements').insert({
    wedding_id: weddingId,
    title: title.trim(),
    category: 'Function Request',
    notes: notes?.trim() || null,
    priority: 'medium',
    status: 'open',
  }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath(`/portal/${weddingId}/functions`)
  return { id: data.id }
}

export async function deleteFunctionRequest(weddingId: string, reqId: string) {
  const r = await verifyClient(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('requirements').delete()
    .eq('id', reqId).eq('wedding_id', weddingId).eq('category', 'Function Request')
  if (error) return { error: error.message }
  revalidatePath(`/portal/${weddingId}/functions`)
  return { ok: true }
}
