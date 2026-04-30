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

const PATH = (id: string) => `/org-events/${id}/sponsors`

export type SponsorRow = {
  id: string; org_event_id: string; name: string
  tier: 'title' | 'co_presenting' | 'powered_by' | 'associate' | 'supported_by' | 'in_association' | null
  logo_url: string | null; contact_name: string | null; contact_phone: string | null
  contact_email: string | null; amount: number | null; amount_received: number | null
  deliverables: string | null; notes: string | null; created_at: string
}

export async function createSponsor(eventId: string, data: {
  name: string; tier?: string; logo_url?: string; contact_name?: string
  contact_phone?: string; contact_email?: string; amount?: number
  amount_received?: number; deliverables?: string; notes?: string
}) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { data: s, error } = await r.sc.from('org_sponsors').insert({ org_event_id: eventId, ...data }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { id: s.id }
}

export async function updateSponsor(eventId: string, sponsorId: string, data: Partial<Omit<SponsorRow, 'id' | 'org_event_id' | 'created_at'>>) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_sponsors').update(data).eq('id', sponsorId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function deleteSponsor(eventId: string, sponsorId: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_sponsors').delete().eq('id', sponsorId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}
