'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getVerified(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!member) return { error: 'No access' as const }
  return { sc: createServiceClient(), eventId }
}

const PATH = (id: string) => `/org-events/${id}/agenda`

export async function createSession(eventId: string, data: {
  title: string
  type: string
  date: string | null
  start_time: string
  end_time: string | null
  venue: string | null
  description: string | null
}) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { data: session, error } = await r.sc
    .from('agenda_sessions')
    .insert({ org_event_id: eventId, ...data, status: 'scheduled', order: 0 })
    .select('id')
    .single()
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { id: session.id }
}

export async function updateSession(eventId: string, sessionId: string, data: {
  title?: string; type?: string; date?: string | null
  start_time?: string; end_time?: string | null
  venue?: string | null; description?: string | null; status?: string
}) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('agenda_sessions').update(data).eq('id', sessionId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function deleteSession(eventId: string, sessionId: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('agenda_sessions').delete().eq('id', sessionId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function assignSpeaker(eventId: string, sessionId: string, speakerId: string, role: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc
    .from('session_speakers')
    .upsert({ session_id: sessionId, speaker_id: speakerId, role }, { onConflict: 'session_id,speaker_id' })
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function removeSpeakerFromSession(eventId: string, sessionId: string, speakerId: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc
    .from('session_speakers')
    .delete()
    .eq('session_id', sessionId)
    .eq('speaker_id', speakerId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}
