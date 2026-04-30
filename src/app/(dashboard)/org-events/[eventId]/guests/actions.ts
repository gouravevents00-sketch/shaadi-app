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

const PATH = (id: string) => `/org-events/${id}/guests`

export type GuestRow = {
  id: string
  org_event_id: string
  salutation: string | null
  name: string
  designation: string | null
  organisation: string | null
  email: string | null
  phone: string | null
  category: string | null
  is_vvip: boolean
  requires_escort: boolean
  requires_vehicle: boolean
  dietary: string | null
  notes: string | null
  checked_in: boolean
  checked_in_at: string | null
  created_at: string
}

export async function listGuests(eventId: string): Promise<GuestRow[]> {
  const r = await getVerified(eventId)
  if ('error' in r) return []
  const { data } = await r.sc.from('org_guests').select('*').eq('org_event_id', eventId).order('name')
  return data ?? []
}

export async function createGuest(eventId: string, data: {
  salutation?: string; name: string; designation?: string; organisation?: string
  email?: string; phone?: string; category?: string; is_vvip?: boolean
  requires_escort?: boolean; requires_vehicle?: boolean; dietary?: string; notes?: string
}) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { data: guest, error } = await r.sc
    .from('org_guests')
    .insert({ org_event_id: eventId, ...data })
    .select('id').single()
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { id: guest.id }
}

export async function updateGuest(eventId: string, guestId: string, data: Partial<{
  salutation: string; name: string; designation: string; organisation: string
  email: string; phone: string; category: string; is_vvip: boolean
  requires_escort: boolean; requires_vehicle: boolean; dietary: string; notes: string
}>) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_guests').update(data).eq('id', guestId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function deleteGuest(eventId: string, guestId: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_guests').delete().eq('id', guestId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
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
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function bulkImportGuests(eventId: string, rows: Array<{
  name: string; salutation?: string; designation?: string; organisation?: string
  email?: string; phone?: string; category?: string; is_vvip?: boolean
  requires_escort?: boolean; requires_vehicle?: boolean; dietary?: string
}>) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_guests').insert(rows.map(g => ({ org_event_id: eventId, ...g })))
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { created: rows.length }
}
