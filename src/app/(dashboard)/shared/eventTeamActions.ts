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
  return { sc, userId: user.id, companyId: membership.company_id, myRole: membership.role }
}

export async function addToEventTeam(
  weddingId: string | null,
  orgEventId: string | null,
  userId: string,
  role: string,
  isProjectHead = false,
) {
  const r = await getMe()
  if ('error' in r) return { error: r.error }
  if (!['owner', 'admin', 'project_head'].includes(r.myRole)) return { error: 'Insufficient permissions' }

  // If setting as project head, unset previous project head
  if (isProjectHead) {
    await r.sc.from('event_team')
      .update({ is_project_head: false })
      .eq('company_id', r.companyId)
      .eq(weddingId ? 'wedding_id' : 'org_event_id', weddingId ?? orgEventId)
      .eq('is_project_head', true)
  }

  const { error } = await r.sc.from('event_team').upsert({
    company_id: r.companyId,
    user_id: userId,
    wedding_id: weddingId,
    org_event_id: orgEventId,
    role,
    is_project_head: isProjectHead,
    added_by: r.userId,
  }, { onConflict: weddingId ? 'user_id,wedding_id' : 'user_id,org_event_id' })

  if (error) return { error: error.message }
  const path = weddingId ? `/weddings/${weddingId}/team` : `/org-events/${orgEventId}/team`
  revalidatePath(path)
  return { success: true }
}

export async function removeFromEventTeam(teamRowId: string, weddingId: string | null, orgEventId: string | null) {
  const r = await getMe()
  if ('error' in r) return { error: r.error }
  if (!['owner', 'admin', 'project_head'].includes(r.myRole)) return { error: 'Insufficient permissions' }

  const { error } = await r.sc.from('event_team')
    .delete().eq('id', teamRowId).eq('company_id', r.companyId)
  if (error) return { error: error.message }
  const path = weddingId ? `/weddings/${weddingId}/team` : `/org-events/${orgEventId}/team`
  revalidatePath(path)
  return { success: true }
}

export async function updateEventTeamRole(teamRowId: string, role: string, weddingId: string | null, orgEventId: string | null) {
  const r = await getMe()
  if ('error' in r) return { error: r.error }
  if (!['owner', 'admin', 'project_head'].includes(r.myRole)) return { error: 'Insufficient permissions' }

  const { error } = await r.sc.from('event_team')
    .update({ role }).eq('id', teamRowId).eq('company_id', r.companyId)
  if (error) return { error: error.message }
  const path = weddingId ? `/weddings/${weddingId}/team` : `/org-events/${orgEventId}/team`
  revalidatePath(path)
  return { success: true }
}

export async function setProjectHead(teamRowId: string, weddingId: string | null, orgEventId: string | null, companyId: string) {
  const r = await getMe()
  if ('error' in r) return { error: r.error }
  if (!['owner', 'admin'].includes(r.myRole)) return { error: 'Only owner/admin can set project head' }

  // Unset previous
  await r.sc.from('event_team')
    .update({ is_project_head: false })
    .eq('company_id', companyId)
    .eq(weddingId ? 'wedding_id' : 'org_event_id', weddingId ?? orgEventId)

  const { error } = await r.sc.from('event_team')
    .update({ is_project_head: true }).eq('id', teamRowId)
  if (error) return { error: error.message }
  const path = weddingId ? `/weddings/${weddingId}/team` : `/org-events/${orgEventId}/team`
  revalidatePath(path)
  return { success: true }
}

export async function inviteFreelancer(
  weddingId: string | null,
  orgEventId: string | null,
  email: string,
  role: string,
  expiresAt: string,
) {
  const r = await getMe()
  if ('error' in r) return { error: r.error }
  if (!['owner', 'admin', 'project_head'].includes(r.myRole)) return { error: 'Insufficient permissions' }

  const normalizedEmail = email.trim().toLowerCase()
  const { data: invite, error } = await r.sc.from('invites').insert({
    company_id: r.companyId,
    wedding_id: weddingId,
    org_event_id: orgEventId,
    email: normalizedEmail,
    role,
    event_role: role,
    is_freelancer: true,
    expires_at: expiresAt,
    invited_by: r.userId,
  }).select('token').single()
  if (error) return { error: error.message }
  return { token: invite.token }
}
