'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function getSpeakerByToken(token: string) {
  const sc = createServiceClient()
  const { data, error } = await sc
    .from('speakers')
    .select('id, name, title, organization, bio, photo_url, phone, email, linkedin_url, status, token_filled_at, org_event_id')
    .eq('fill_token', token)
    .single()
  if (error || !data) return null

  // Also get event name
  const { data: event } = await sc
    .from('org_events')
    .select('name, type')
    .eq('id', data.org_event_id)
    .single()

  return { ...data, event_name: event?.name ?? null, event_type: event?.type ?? null }
}

export async function submitSpeakerProfile(
  token: string,
  data: {
    name: string
    title: string | null
    organization: string | null
    bio: string | null
    phone: string | null
    email: string | null
    linkedin_url: string | null
  }
): Promise<{ success: boolean; error?: string }> {
  const sc = createServiceClient()

  const { data: speaker, error: fetchErr } = await sc
    .from('speakers')
    .select('id')
    .eq('fill_token', token)
    .single()

  if (fetchErr || !speaker) return { success: false, error: 'Invalid or expired link' }

  const { error } = await sc
    .from('speakers')
    .update({
      ...data,
      status: 'confirmed',
      token_filled_at: new Date().toISOString(),
    })
    .eq('id', speaker.id)

  if (error) return { success: false, error: error.message }
  return { success: true }
}
