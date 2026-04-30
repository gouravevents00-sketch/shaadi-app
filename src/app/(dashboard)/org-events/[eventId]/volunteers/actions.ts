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

const PATH = (id: string) => `/org-events/${id}/volunteers`

export type VolunteerRow = {
  id: string
  org_event_id: string
  name: string
  phone: string | null
  email: string | null
  role: string | null
  zone: string | null
  shift_start: string | null
  shift_end: string | null
  t_shirt_size: string | null
  checked_in: boolean
  notes: string | null
  created_at: string
}

export async function createVolunteer(eventId: string, data: {
  name: string; phone?: string; email?: string; role?: string; zone?: string
  shift_start?: string; shift_end?: string; t_shirt_size?: string; notes?: string
}) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { data: vol, error } = await r.sc
    .from('org_volunteers')
    .insert({ org_event_id: eventId, ...data })
    .select('id').single()
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { id: vol.id }
}

export async function updateVolunteer(eventId: string, volId: string, data: Partial<Omit<VolunteerRow, 'id' | 'org_event_id' | 'created_at'>>) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_volunteers').update(data).eq('id', volId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function deleteVolunteer(eventId: string, volId: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_volunteers').delete().eq('id', volId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function checkInVolunteer(eventId: string, volId: string, checked_in: boolean) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_volunteers').update({ checked_in }).eq('id', volId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}
