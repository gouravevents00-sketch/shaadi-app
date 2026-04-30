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

const PATH = (id: string) => `/org-events/${id}/delegates`

export async function createDelegate(eventId: string, data: {
  name: string; title: string | null; organization: string | null
  phone: string | null; email: string | null; dietary: string
  dietary_notes: string | null; is_vip: boolean; notes: string | null
}) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { data: del, error } = await r.sc
    .from('delegates')
    .insert({ org_event_id: eventId, ...data, status: 'registered' })
    .select('id')
    .single()
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { id: del.id }
}

export async function updateDelegate(eventId: string, delegateId: string, data: {
  name?: string; title?: string | null; organization?: string | null
  phone?: string | null; email?: string | null; dietary?: string
  dietary_notes?: string | null; is_vip?: boolean
  status?: string; notes?: string | null
  checked_in?: boolean; checked_in_at?: string | null; badge_printed?: boolean
}) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('delegates').update(data).eq('id', delegateId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function deleteDelegate(eventId: string, delegateId: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('delegates').delete().eq('id', delegateId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function toggleCheckedIn(eventId: string, delegateId: string, checkedIn: boolean) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('delegates').update({
    checked_in: checkedIn,
    checked_in_at: checkedIn ? new Date().toISOString() : null,
    status: checkedIn ? 'checked_in' : 'confirmed',
  }).eq('id', delegateId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}
