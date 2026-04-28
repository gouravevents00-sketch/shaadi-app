'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getServiceClient(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: access } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .single()

  if (!access) return null
  return createServiceClient()
}

export async function assignGuestToEvent(weddingId: string, guestId: string, eventId: string) {
  const sc = await getServiceClient(weddingId)
  if (!sc) return { error: 'Not authenticated' }

  const { error } = await sc.from('guest_events').insert({
    guest_id: guestId,
    event_id: eventId,
    rsvp_status: 'pending',
  })

  if (error && error.code !== '23505') return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/guests`)
  return { success: true }
}

export async function unassignGuestFromEvent(weddingId: string, guestId: string, eventId: string) {
  const sc = await getServiceClient(weddingId)
  if (!sc) return { error: 'Not authenticated' }

  const { error } = await sc.from('guest_events')
    .delete()
    .eq('guest_id', guestId)
    .eq('event_id', eventId)

  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/guests`)
  return { success: true }
}
