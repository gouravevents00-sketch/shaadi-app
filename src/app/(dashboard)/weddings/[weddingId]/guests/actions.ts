'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getVerifiedUser(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }

  const { data: access } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .single()
  if (!access) return { error: 'No access' as const }

  const { data: wedding } = await supabase
    .from('weddings')
    .select('id, wedding_date, primary_venue')
    .eq('id', weddingId)
    .single()
  if (!wedding) return { error: 'Wedding not found' as const }

  return { user, wedding, serviceClient: createServiceClient() }
}

// Auto-assign events to a guest based on their invite_group
async function assignEventsByGroup(
  sc: ReturnType<typeof createServiceClient>,
  weddingId: string,
  guestId: string,
  inviteGroup: string,
  weddingDate: string | null,
  primaryVenue: string | null
) {
  // Get all events for this wedding
  const { data: allEvents } = await sc
    .from('events')
    .select('id, date, venue')
    .eq('wedding_id', weddingId) as { data: { id: string; date: string; venue: string }[] | null }

  if (!allEvents || allEvents.length === 0) return

  let eventIds: string[] = []

  if (inviteGroup === 'all') {
    eventIds = allEvents.map(e => e.id)
  } else if (inviteGroup === 'main_venue') {
    // All events at the primary venue
    eventIds = allEvents
      .filter(e => primaryVenue && e.venue.toLowerCase().includes(primaryVenue.toLowerCase().split(' ')[0]))
      .map(e => e.id)
    // Fallback: if nothing matches, use all
    if (eventIds.length === 0) eventIds = allEvents.map(e => e.id)
  } else if (inviteGroup === 'main_day') {
    // Events on the wedding_date only
    eventIds = allEvents
      .filter(e => weddingDate && e.date === weddingDate)
      .map(e => e.id)
  } else if (inviteGroup === 'reception') {
    // Last event of the wedding (typically reception/sagai)
    const sorted = [...allEvents].sort((a, b) => a.date < b.date ? 1 : -1)
    eventIds = sorted.length > 0 ? [sorted[0].id] : []
  }
  // 'custom' → no auto-assignment, coordinator does it manually

  if (eventIds.length === 0) return

  // Remove existing assignments then re-insert
  await sc.from('guest_events').delete().eq('guest_id', guestId)

  const rows = eventIds.map(event_id => ({
    guest_id: guestId,
    event_id,
    rsvp_status: 'pending',
  }))
  await sc.from('guest_events').insert(rows)
}

export async function createGuest(weddingId: string, formData: {
  name: string
  phone: string
  email: string
  side: string
  is_vip: boolean
  dietary: string
  dietary_notes: string
  notes: string
  plus_count: number
  invite_group: string
}) {
  const result = await getVerifiedUser(weddingId)
  if ('error' in result) return { error: result.error }

  const { data, error } = await result.serviceClient
    .from('guests')
    .insert({ wedding_id: weddingId, ...formData })
    .select('id, rsvp_token')
    .single()

  if (error) return { error: error.message }

  // Auto-assign events based on invite_group
  if (formData.invite_group !== 'custom') {
    await assignEventsByGroup(
      result.serviceClient, weddingId, data.id,
      formData.invite_group,
      result.wedding.wedding_date,
      result.wedding.primary_venue
    )
  }

  revalidatePath(`/weddings/${weddingId}/guests`)
  return { id: data.id, rsvp_token: data.rsvp_token }
}

export async function updateGuest(weddingId: string, guestId: string, formData: {
  name: string
  phone: string
  email: string
  side: string
  is_vip: boolean
  dietary: string
  dietary_notes: string
  notes: string
  plus_count: number
  invite_group: string
}) {
  const result = await getVerifiedUser(weddingId)
  if ('error' in result) return { error: result.error }

  const { error } = await result.serviceClient
    .from('guests')
    .update(formData)
    .eq('id', guestId)

  if (error) return { error: error.message }

  // Re-assign events if invite_group changed
  if (formData.invite_group !== 'custom') {
    await assignEventsByGroup(
      result.serviceClient, weddingId, guestId,
      formData.invite_group,
      result.wedding.wedding_date,
      result.wedding.primary_venue
    )
  }

  revalidatePath(`/weddings/${weddingId}/guests`)
  return { success: true }
}

export async function deleteGuest(weddingId: string, guestId: string) {
  const result = await getVerifiedUser(weddingId)
  if ('error' in result) return { error: result.error }

  const { error } = await result.serviceClient
    .from('guests')
    .delete()
    .eq('id', guestId)

  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/guests`)
  return { success: true }
}

export async function checkInGuest(weddingId: string, guestId: string, checkedIn: boolean) {
  const result = await getVerifiedUser(weddingId)
  if ('error' in result) return { error: result.error }

  const { error } = await result.serviceClient
    .from('guests')
    .update({ checked_in_at: checkedIn ? new Date().toISOString() : null })
    .eq('id', guestId)

  if (error) return { error: error.message }
  return { success: true }
}
