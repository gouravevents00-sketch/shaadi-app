'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { sendNewLeadEmail } from '@/lib/email'

export async function requestConnection(celebrationId: string, companyId: string, message?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const sc = createServiceClient()

  // Verify celebration belongs to user
  const { data: celebration } = await sc.from('celebrations')
    .select('id, user_id, name, type').eq('id', celebrationId).single()
  if (!celebration || celebration.user_id !== user.id) return { error: 'No access' }

  const { error } = await sc.from('planner_connections').insert({
    celebration_id: celebrationId,
    company_id: companyId,
    user_id: user.id,
    message: message?.trim() || null,
    status: 'pending',
  })

  if (error) {
    if (error.code === '23505') return { error: 'Already requested this planner' }
    return { error: error.message }
  }

  // Email all agency members
  try {
    const [{ data: company }, { data: members }] = await Promise.all([
      sc.from('companies').select('name').eq('id', companyId).single(),
      sc.from('company_members').select('user_id').eq('company_id', companyId),
    ])
    if (members?.length) {
      const memberIds = members.map((m: { user_id: string }) => m.user_id)
      const { data: memberUsers } = await sc.from('users').select('email').in('id', memberIds)
      const toEmails = (memberUsers ?? []).map((u: { email: string }) => u.email).filter(Boolean)
      await sendNewLeadEmail({
        toEmails,
        companyName: company?.name ?? 'Your agency',
        celebrationName: celebration.name,
        celebrationType: celebration.type,
        clientEmail: user.email ?? '',
        message: message || null,
      })
    }
  } catch { /* non-blocking */ }

  return { ok: true }
}

export async function getMyConnections(celebrationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { connections: [] }

  const sc = createServiceClient()
  const { data } = await sc.from('planner_connections')
    .select('id, company_id, status, created_at, wedding_id')
    .eq('celebration_id', celebrationId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return { connections: data ?? [] }
}
