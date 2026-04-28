'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function verifyClient(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const sc = createServiceClient()
  // Verify accepted client invite for this wedding
  const { data: invite } = await sc.from('invites')
    .select('id')
    .eq('wedding_id', weddingId)
    .eq('role', 'client')
    .eq('email', user.email ?? '')
    .not('accepted_at', 'is', null)
    .single()

  if (!invite) return { error: 'No access' as const }
  return { sc, userId: user.id }
}

const PATH = (id: string) => `/portal/${id}/requirements`

export async function addRequirement(weddingId: string, data: {
  title: string
  description?: string
  priority: string
  side: string
}) {
  const r = await verifyClient(weddingId)
  if ('error' in r) return { error: r.error }
  const { data: req, error } = await r.sc.from('requirements').insert({
    wedding_id: weddingId,
    title: data.title,
    description: data.description || null,
    priority: data.priority,
    side: data.side,
    status: 'pending',
  }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  revalidatePath(`/weddings/${weddingId}/overview`)
  return { id: req.id }
}

export async function updateRequirement(weddingId: string, reqId: string, data: {
  title?: string
  description?: string
  priority?: string
  status?: string
}) {
  const r = await verifyClient(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('requirements').update(data).eq('id', reqId).eq('wedding_id', weddingId)
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  revalidatePath(`/weddings/${weddingId}/overview`)
  return { success: true }
}

export async function deleteRequirement(weddingId: string, reqId: string) {
  const r = await verifyClient(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('requirements').delete().eq('id', reqId).eq('wedding_id', weddingId)
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  revalidatePath(`/weddings/${weddingId}/overview`)
  return { success: true }
}
