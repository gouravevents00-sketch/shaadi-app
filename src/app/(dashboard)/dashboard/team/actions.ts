'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'


async function getMe() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const sc = createServiceClient()
  const { data: membership } = await sc.from('company_members')
    .select('id, role, company_id').eq('user_id', user.id).single()
  if (!membership) return { error: 'No membership' as const }
  return { sc, userId: user.id, companyId: membership.company_id, role: membership.role }
}

export async function inviteMember(email: string, role: string) {
  const r = await getMe()
  if ('error' in r) return { error: r.error }
  if (!['owner', 'admin'].includes(r.role)) return { error: 'Only owner/admin can invite' }
  const normalizedEmail = email.trim().toLowerCase()

  const { data: existingUser } = await r.sc.from('users').select('id').eq('email', normalizedEmail).single()
  if (existingUser) {
    const { data: m } = await r.sc.from('company_members')
      .select('id').eq('company_id', r.companyId).eq('user_id', existingUser.id).single()
    if (m) return { error: 'Already a team member' }
  }
  const { data: existing } = await r.sc.from('invites')
    .select('id').eq('company_id', r.companyId).eq('email', normalizedEmail)
    .is('wedding_id', null).is('accepted_at', null).single()
  if (existing) return { error: 'Invite already sent' }

  const { data: invite, error } = await r.sc.from('invites').insert({
    company_id: r.companyId,
    email: normalizedEmail,
    role,
    invited_by: r.userId,
  }).select('token').single()
  if (error) return { error: error.message }
  revalidatePath('/dashboard/team')
  return { token: invite.token }
}

export async function updateMemberRole(memberId: string, role: string) {
  const r = await getMe()
  if ('error' in r) return { error: r.error }
  if (!['owner', 'admin'].includes(r.role)) return { error: 'Only owner/admin can change roles' }
  const { error } = await r.sc.from('company_members')
    .update({ role }).eq('id', memberId).eq('company_id', r.companyId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/team')
  return { success: true }
}

export async function removeMember(memberId: string) {
  const r = await getMe()
  if ('error' in r) return { error: r.error }
  if (!['owner', 'admin'].includes(r.role)) return { error: 'Only owner/admin can remove members' }
  const { error } = await r.sc.from('company_members')
    .delete().eq('id', memberId).eq('company_id', r.companyId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/team')
  return { success: true }
}

export async function revokeInvite(inviteId: string) {
  const r = await getMe()
  if ('error' in r) return { error: r.error }
  if (!['owner', 'admin'].includes(r.role)) return { error: 'Only owner/admin can revoke' }
  const { error } = await r.sc.from('invites').delete().eq('id', inviteId).eq('company_id', r.companyId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/team')
  return { success: true }
}
