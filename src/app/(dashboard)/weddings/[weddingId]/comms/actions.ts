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

const PATH = (id: string) => `/weddings/${id}/comms`

export async function logCommunication(weddingId: string, data: {
  channel: string
  recipient_type: string
  event_id?: string | null
  guest_id?: string | null
  subject?: string | null
  body: string
}) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { data: comm, error } = await r.sc.from('communications').insert({
    wedding_id: weddingId,
    sent_by: r.userId,
    sent_at: new Date().toISOString(),
    status: 'sent',
    ...data,
  }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { id: comm.id }
}

export async function deleteComm(weddingId: string, commId: string) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('communications').delete().eq('id', commId)
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { success: true }
}
