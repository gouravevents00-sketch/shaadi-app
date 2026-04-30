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

const PATH = (id: string) => `/org-events/${id}/speakers`

export async function createSpeaker(eventId: string, data: {
  name: string; title: string | null; organization: string | null
  phone: string | null; email: string | null; bio: string | null; linkedin_url: string | null
}) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { data: spk, error } = await r.sc
    .from('speakers')
    .insert({ org_event_id: eventId, ...data, status: 'invited' })
    .select('id, fill_token')
    .single()
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { id: spk.id, fill_token: spk.fill_token }
}

export async function updateSpeaker(eventId: string, speakerId: string, data: {
  name?: string; title?: string | null; organization?: string | null
  phone?: string | null; email?: string | null; bio?: string | null
  linkedin_url?: string | null; status?: string
}) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('speakers').update(data).eq('id', speakerId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function deleteSpeaker(eventId: string, speakerId: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('speakers').delete().eq('id', speakerId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}
