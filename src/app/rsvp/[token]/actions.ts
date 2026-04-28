'use server'

import { createServiceClient } from '@/lib/supabase/server'

export interface FamilyMember {
  name: string
  dietary: string
}

export interface RsvpSubmission {
  attending: boolean
  arrival_date: string
  departure_date: string
  arrival_mode: string
  arrival_datetime: string
  arrival_booking_ref: string
  needs_pickup: boolean
  family_members: FamilyMember[]
  rsvp_notes: string
  wishes_message: string
}

export async function submitRsvp(
  guestId: string,
  data: RsvpSubmission
): Promise<{ success: boolean; error?: string }> {
  const sc = createServiceClient()

  const { error } = await sc
    .from('guests')
    .update({
      arrival_mode: data.attending ? (data.arrival_mode || null) : null,
      arrival_date: data.attending ? (data.arrival_date || null) : null,
      departure_date: data.attending ? (data.departure_date || null) : null,
      arrival_datetime: data.attending ? (data.arrival_datetime || null) : null,
      arrival_booking_ref: data.attending ? (data.arrival_booking_ref || null) : null,
      needs_pickup: data.attending && data.needs_pickup,
      family_members: data.attending ? data.family_members : [],
      rsvp_notes: data.rsvp_notes || null,
      wishes_message: data.wishes_message || null,
      rsvp_submitted_at: new Date().toISOString(),
    })
    .eq('id', guestId)

  if (error) return { success: false, error: error.message }

  // Set all event RSVPs based on attending flag
  const { data: guestEvents } = await sc
    .from('guest_events')
    .select('event_id')
    .eq('guest_id', guestId)

  if (guestEvents && guestEvents.length > 0) {
    const { error: geError } = await sc
      .from('guest_events')
      .update({ rsvp_status: data.attending ? 'confirmed' : 'declined' })
      .eq('guest_id', guestId)

    if (geError) return { success: false, error: geError.message }
  }

  return { success: true }
}
