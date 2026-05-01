'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendApprovalResponseNotification } from '@/lib/email'

async function verifyClient(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const sc = createServiceClient()
  const { data: invite } = await sc.from('invites')
    .select('id').eq('wedding_id', weddingId).eq('role', 'client')
    .eq('email', user.email ?? '').not('accepted_at', 'is', null).single()
  if (!invite) return { error: 'No access' as const }
  return { sc }
}

export async function respondToApproval(weddingId: string, itemId: string, status: 'approved' | 'rejected' | 'revision', note?: string) {
  const r = await verifyClient(weddingId)
  if ('error' in r) return { error: r.error }
  const sc = createServiceClient()
  const { error } = await sc.from('approval_items')
    .update({ status, client_note: note ?? null, updated_at: new Date().toISOString() })
    .eq('id', itemId).eq('wedding_id', weddingId)
  if (error) return { error: error.message }
  revalidatePath(`/portal/${weddingId}/approvals`)
  revalidatePath(`/weddings/${weddingId}/overview`)

  // Fire notification (non-blocking)
  const [{ data: item }, { data: wedding }] = await Promise.all([
    sc.from('approval_items').select('title').eq('id', itemId).single(),
    sc.from('weddings').select('name').eq('id', weddingId).single(),
  ])
  sendApprovalResponseNotification({
    weddingName: wedding?.name ?? 'Wedding',
    itemTitle: item?.title ?? itemId,
    status,
    note,
  }).catch(() => {})

  return { success: true }
}

// Coordinator actions
async function verifyCoordinator(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const { data: access } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!access) return { error: 'No access' as const }
  return { sc: createServiceClient(), userId: user.id }
}

export async function createApprovalItem(weddingId: string, data: {
  title: string; category: string; description?: string
}) {
  const r = await verifyCoordinator(weddingId)
  if ('error' in r) return { error: r.error }
  const { data: item, error } = await r.sc.from('approval_items').insert({
    wedding_id: weddingId,
    title: data.title,
    category: data.category,
    description: data.description ?? null,
    proposed_by: r.userId,
    status: 'pending',
    updated_at: new Date().toISOString(),
  }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath(`/portal/${weddingId}/approvals`)
  revalidatePath(`/weddings/${weddingId}/overview`)
  return { id: item.id }
}

export async function deleteApprovalItem(weddingId: string, itemId: string) {
  const r = await verifyCoordinator(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('approval_items').delete().eq('id', itemId).eq('wedding_id', weddingId)
  if (error) return { error: error.message }
  revalidatePath(`/portal/${weddingId}/approvals`)
  return { success: true }
}
