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

const PATH = (id: string) => `/org-events/${id}/artists`

export type ArtistRow = {
  id: string
  org_event_id: string
  name: string
  act_type: string | null
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  performance_slot: string | null
  duration_mins: number | null
  fee: number | null
  fee_paid: number | null
  tech_rider: string | null
  hospitality_rider: string | null
  arrival_time: string | null
  soundcheck_time: string | null
  notes: string | null
  created_at: string
}

export async function createArtist(eventId: string, data: {
  name: string; act_type?: string; contact_name?: string; contact_phone?: string
  contact_email?: string; performance_slot?: string; duration_mins?: number
  fee?: number; fee_paid?: number; tech_rider?: string; hospitality_rider?: string
  arrival_time?: string; soundcheck_time?: string; notes?: string
}) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { data: artist, error } = await r.sc
    .from('org_artists')
    .insert({ org_event_id: eventId, ...data })
    .select('id').single()
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { id: artist.id }
}

export async function updateArtist(eventId: string, artistId: string, data: Partial<Omit<ArtistRow, 'id' | 'org_event_id' | 'created_at'>>) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_artists').update(data).eq('id', artistId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function deleteArtist(eventId: string, artistId: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_artists').delete().eq('id', artistId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}
