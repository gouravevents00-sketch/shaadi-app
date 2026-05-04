'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getAccess(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const { data: wedding } = await createServiceClient()
    .from('weddings').select('id').eq('id', weddingId).single()
  if (!wedding) return { error: 'Not found' as const }
  return { user, sc: createServiceClient() }
}

export type ShowFlowCue = {
  id: string
  event_id: string
  time: string         // HH:MM
  duration_min: number
  label: string
  assignee: string
  cue_type: 'ritual' | 'logistics' | 'music' | 'lighting' | 'mc' | 'other'
  notes: string
}

// Upsert the full showflow JSON for a wedding (one row per wedding)
export async function saveShowFlow(weddingId: string, cues: ShowFlowCue[]) {
  const access = await getAccess(weddingId)
  if ('error' in access) return { error: access.error }

  const { error } = await access.sc
    .from('wedding_showflow')
    .upsert({ wedding_id: weddingId, cues, updated_at: new Date().toISOString() }, { onConflict: 'wedding_id' })

  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/showflow`)
  return { ok: true }
}

export async function getShowFlow(weddingId: string): Promise<ShowFlowCue[]> {
  const sc = createServiceClient()
  const { data } = await sc.from('wedding_showflow').select('cues').eq('wedding_id', weddingId).maybeSingle()
  return (data?.cues as ShowFlowCue[]) ?? []
}
