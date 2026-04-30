'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getVerified(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!member) return { error: 'No access' as const }
  return { sc: createServiceClient(), userId: user.id }
}

export async function logComm(eventId: string, data: {
  channel: string
  audience_label: string
  recipient_count: number
  message: string
}) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_comms_log').insert({
    org_event_id: eventId,
    sent_by: r.userId,
    ...data,
  })
  if (error) return { error: error.message }
  revalidatePath(`/org-events/${eventId}/comms`)
  return { success: true }
}
