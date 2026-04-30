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

const PATH = (id: string) => `/org-events/${id}/timeline`

export type TimelineItem = {
  id: string; org_event_id: string; time: string; end_time: string | null
  activity: string; owner: string | null; venue: string | null
  category: string | null; notes: string | null; order: number; created_at: string
}

export async function createTimelineItem(eventId: string, data: {
  time: string; end_time?: string; activity: string; owner?: string
  venue?: string; category?: string; notes?: string; order?: number
}) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { data: item, error } = await r.sc
    .from('org_timeline_items')
    .insert({ org_event_id: eventId, order: 0, ...data })
    .select('id').single()
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { id: item.id }
}

export async function updateTimelineItem(eventId: string, itemId: string, data: Partial<Omit<TimelineItem, 'id' | 'org_event_id' | 'created_at'>>) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_timeline_items').update(data).eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function deleteTimelineItem(eventId: string, itemId: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_timeline_items').delete().eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function importFromAgenda(eventId: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { data: sessions } = await r.sc
    .from('agenda_sessions').select('title, start_time, end_time, venue_name')
    .eq('org_event_id', eventId).order('start_time')
  if (!sessions?.length) return { error: 'No agenda sessions found' }
  const { error } = await r.sc.from('org_timeline_items').insert(
    sessions.map((s: { title: string; start_time: string; end_time: string; venue_name: string }, i: number) => ({
      org_event_id: eventId,
      time: s.start_time ? new Date(s.start_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '',
      end_time: s.end_time ? new Date(s.end_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : null,
      activity: s.title,
      venue: s.venue_name || null,
      order: i
    }))
  )
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { created: sessions.length }
}
