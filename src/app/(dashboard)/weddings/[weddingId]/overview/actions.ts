'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getVerified(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const { data: access } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!access) return { error: 'No access' as const }
  return { sc: createServiceClient(), userId: user.id, companyId: access.company_id }
}

export async function generateClientInvite(weddingId: string, email: string) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }

  // Check if there's already an active (unaccepted) client invite for this wedding+email
  const { data: existing } = await r.sc.from('invites')
    .select('token')
    .eq('wedding_id', weddingId)
    .eq('email', email.toLowerCase().trim())
    .eq('role', 'client')
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (existing) return { token: existing.token }

  // Create new invite (7 days expiry via DB default)
  const { data: invite, error } = await r.sc.from('invites').insert({
    company_id: r.companyId,
    wedding_id: weddingId,
    email: email.toLowerCase().trim(),
    role: 'client',
    invited_by: r.userId,
  }).select('token').single()

  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/overview`)
  return { token: invite.token }
}
