'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getVerified(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const { data: access } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!access) return { error: 'No access' as const }
  return { sc: createServiceClient(), userId: user.id }
}

export async function generateClientInvite(weddingId: string, email: string) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  // Reuse existing unexpired invite if present
  const { data: existing } = await r.sc.from('invites')
    .select('token').eq('wedding_id', weddingId).eq('email', email.toLowerCase().trim())
    .eq('role', 'client').is('accepted_at', null)
    .gt('expires_at', new Date().toISOString()).single()
  if (existing) return { token: existing.token }
  const { data: invite, error } = await r.sc.from('invites').insert({
    company_id: (await r.sc.from('company_members').select('company_id').eq('user_id', r.userId).single()).data?.company_id,
    wedding_id: weddingId, email: email.toLowerCase().trim(),
    role: 'client', invited_by: r.userId,
  }).select('token').single()
  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/client`)
  return { token: invite.token }
}

export async function createApproval(weddingId: string, data: {
  title: string; category: string; description?: string
}) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { data: item, error } = await r.sc.from('approval_items').insert({
    wedding_id: weddingId,
    title: data.title.trim(),
    category: data.category,
    description: data.description?.trim() || null,
    proposed_by: r.userId,
    status: 'pending',
    updated_at: new Date().toISOString(),
  }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/client`)
  revalidatePath(`/portal/${weddingId}/approvals`)
  return { id: item.id }
}

export async function deleteApproval(weddingId: string, itemId: string) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('approval_items').delete().eq('id', itemId).eq('wedding_id', weddingId)
  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/client`)
  return { success: true }
}
