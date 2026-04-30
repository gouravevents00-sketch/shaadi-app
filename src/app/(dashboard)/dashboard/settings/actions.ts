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

export async function updateProfile(data: { name: string; phone?: string }) {
  const r = await getMe()
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('users').update({
    name: data.name.trim(),
    phone: data.phone?.trim() || null,
  }).eq('id', r.userId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function updateCompany(data: { name: string }) {
  const r = await getMe()
  if ('error' in r) return { error: r.error }
  if (r.role !== 'owner' && r.role !== 'admin') return { error: 'Only owner/admin can update company' }
  const { error } = await r.sc.from('companies').update({ name: data.name.trim() }).eq('id', r.companyId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  revalidatePath('/dashboard')
  return { success: true }
}

export async function inviteTeamMember(email: string, role: string) {
  const r = await getMe()
  if ('error' in r) return { error: r.error }
  if (r.role !== 'owner' && r.role !== 'admin') return { error: 'Only owner/admin can invite' }
  const normalizedEmail = email.trim().toLowerCase()
  // Check if already a member
  const { data: existingUser } = await r.sc.from('users').select('id').eq('email', normalizedEmail).single()
  if (existingUser) {
    const { data: existingMember } = await r.sc.from('company_members')
      .select('id').eq('company_id', r.companyId).eq('user_id', existingUser.id).single()
    if (existingMember) return { error: 'Already a team member' }
  }
  // Check if pending invite exists
  const { data: existingInvite } = await r.sc.from('invites')
    .select('id').eq('company_id', r.companyId).eq('email', normalizedEmail)
    .is('wedding_id', null).is('accepted_at', null).single()
  if (existingInvite) return { error: 'Invite already sent' }

  const { data: invite, error } = await r.sc.from('invites').insert({
    company_id: r.companyId,
    email: normalizedEmail,
    role,
    invited_by: r.userId,
  }).select('token').single()
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { token: invite.token }
}

export async function updateMemberRole(memberId: string, role: string) {
  const r = await getMe()
  if ('error' in r) return { error: r.error }
  if (r.role !== 'owner' && r.role !== 'admin') return { error: 'Only owner/admin can change roles' }
  const { error } = await r.sc.from('company_members')
    .update({ role }).eq('id', memberId).eq('company_id', r.companyId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function removeMember(memberId: string) {
  const r = await getMe()
  if ('error' in r) return { error: r.error }
  if (r.role !== 'owner' && r.role !== 'admin') return { error: 'Only owner/admin can remove members' }
  const { error } = await r.sc.from('company_members')
    .delete().eq('id', memberId).eq('company_id', r.companyId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { success: true }
}

export async function revokeInvite(inviteId: string) {
  const r = await getMe()
  if ('error' in r) return { error: r.error }
  if (r.role !== 'owner' && r.role !== 'admin') return { error: 'Only owner/admin can revoke invites' }
  const { error } = await r.sc.from('invites').delete().eq('id', inviteId).eq('company_id', r.companyId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/settings')
  return { success: true }
}
