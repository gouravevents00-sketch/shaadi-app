'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { seedDateReminders } from '@/lib/automation/engine'
import { revalidatePath } from 'next/cache'

export async function updateWeddingDetails(weddingId: string, data: {
  bride_name: string
  groom_name: string
  date_from: string | null
  date_to: string | null
  wedding_date: string | null
  primary_venue: string | null
  primary_city: string | null
  budget_total: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const sc = createServiceClient()
  const { error } = await sc.from('weddings').update(data).eq('id', weddingId)
  if (error) return { error: error.message }

  // Seed date reminders if date was provided
  const date = data.wedding_date || data.date_to || data.date_from
  if (date) {
    seedDateReminders(sc, weddingId, date).catch(() => { /* non-blocking */ })
  }

  revalidatePath(`/weddings/${weddingId}/setup`)
  return { ok: true }
}

export async function inviteCoordinator(companyId: string, userId: string, email: string, role: string, weddingId: string) {
  const sc = createServiceClient()
  const normalizedEmail = email.trim().toLowerCase()

  // Check if already a member
  const { data: existingUser } = await sc.from('users').select('id').eq('email', normalizedEmail).single()
  if (existingUser) {
    const { data: existingMember } = await sc.from('company_members')
      .select('id').eq('company_id', companyId).eq('user_id', existingUser.id).single()
    if (existingMember) return { error: 'Already a team member' }
  }

  // Check for existing pending invite
  const { data: existingInvite } = await sc.from('invites')
    .select('id').eq('company_id', companyId).eq('email', normalizedEmail).is('accepted_at', null).single()
  if (existingInvite) return { error: 'Invite already sent' }

  const { data: invite, error } = await sc.from('invites').insert({
    company_id: companyId,
    wedding_id: weddingId,
    email: normalizedEmail,
    role,
    invited_by: userId,
  }).select('token').single()

  if (error) return { error: error.message }
  return { token: invite.token, email: normalizedEmail }
}
