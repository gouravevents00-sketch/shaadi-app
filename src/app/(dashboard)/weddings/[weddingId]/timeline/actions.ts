'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getVerified(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const { data: access } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!access) return { error: 'No access' as const }
  return { sc: createServiceClient() }
}

const PATH = (id: string) => `/weddings/${id}/timeline`

export async function createTimelineItem(weddingId: string, data: {
  event_id: string; time: string; title: string
  duration_mins?: number; description?: string; team?: string
}) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { data: item, error } = await r.sc.from('timeline_items')
    .insert({ wedding_id: weddingId, duration_mins: 30, team: 'All', ...data })
    .select('id').single()
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { id: item.id }
}

export async function updateTimelineItem(weddingId: string, itemId: string, data: {
  time?: string; title?: string; duration_mins?: number
  description?: string; team?: string; status?: string
}) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('timeline_items').update(data).eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { success: true }
}

export async function deleteTimelineItem(weddingId: string, itemId: string) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('timeline_items').delete().eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { success: true }
}

// Seed from events — creates a timeline item for each event's start time
export async function seedFromEvents(weddingId: string) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { sc } = r

  const [{ data: events }, { data: existing }] = await Promise.all([
    sc.from('events').select('id, name, start_time, end_time').eq('wedding_id', weddingId).order('date').order('start_time' as never),
    sc.from('timeline_items').select('event_id, title').eq('wedding_id', weddingId),
  ])

  if (!events?.length) return { error: 'No events found. Add events first.' }

  const existingKeys = new Set((existing ?? []).map((i: { event_id: string; title: string }) => `${i.event_id}::${i.title}`))

  const toInsert = events
    .filter((e: { id: string; name: string; start_time: string; end_time: string | null }) => !existingKeys.has(`${e.id}::${e.name} begins`))
    .map((e: { id: string; name: string; start_time: string; end_time: string | null }) => {
      const startMins = timeToMins(e.start_time)
      const endMins = e.end_time ? timeToMins(e.end_time) : null
      return {
        wedding_id: weddingId,
        event_id: e.id,
        time: e.start_time,
        title: `${e.name} begins`,
        duration_mins: endMins ? endMins - startMins : 60,
        team: 'All',
        status: 'pending',
      }
    })

  if (!toInsert.length) return { success: true, created: 0 }

  const { error } = await sc.from('timeline_items').insert(toInsert)
  if (error) return { error: error.message }

  revalidatePath(PATH(weddingId))
  return { success: true, created: toInsert.length }
}

function timeToMins(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}
