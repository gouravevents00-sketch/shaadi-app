'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getVerified(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!member) return { error: 'No access' as const }
  return { sc: createServiceClient() }
}

export async function checkInDelegate(eventId: string, delegateId: string, checked_in: boolean) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('delegates').update({
    checked_in,
    checked_in_at: checked_in ? new Date().toISOString() : null
  }).eq('id', delegateId)
  if (error) return { error: error.message }
  revalidatePath(`/org-events/${eventId}/live`)
  return { success: true }
}

export async function checkInGuest(eventId: string, guestId: string, checked_in: boolean) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_guests').update({
    checked_in,
    checked_in_at: checked_in ? new Date().toISOString() : null
  }).eq('id', guestId)
  if (error) return { error: error.message }
  revalidatePath(`/org-events/${eventId}/live`)
  return { success: true }
}

export async function checkInVolunteer(eventId: string, volId: string, checked_in: boolean) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_volunteers').update({ checked_in }).eq('id', volId)
  if (error) return { error: error.message }
  revalidatePath(`/org-events/${eventId}/live`)
  return { success: true }
}
