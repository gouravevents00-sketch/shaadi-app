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

  // Verify the wedding belongs to this company
  const { data: wedding } = await supabase
    .from('weddings')
    .select('id')
    .eq('id', weddingId)
    .single()

  if (!wedding) return { error: 'Wedding not found' as const }

  return { user, serviceClient: createServiceClient() }
}

export async function createEvent(weddingId: string, formData: {
  name: string
  date: string
  start_time: string
  end_time: string
  venue: string
  city: string
  expected_count: number
  type: string
  notes: string
}) {
  const result = await getVerifiedUser(weddingId)
  if ('error' in result) return { error: result.error }

  const { data, error } = await result.serviceClient
    .from('events')
    .insert({ wedding_id: weddingId, ...formData })
    .select('id')
    .single()

  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/events`)
  return { id: data.id }
}

export async function updateEvent(weddingId: string, eventId: string, formData: {
  name: string
  date: string
  start_time: string
  end_time: string
  venue: string
  city: string
  expected_count: number
  type: string
  notes: string
}) {
  const result = await getVerifiedUser(weddingId)
  if ('error' in result) return { error: result.error }

  const { error } = await result.serviceClient
    .from('events')
    .update(formData)
    .eq('id', eventId)

  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/events`)
  return { success: true }
}

export async function deleteEvent(weddingId: string, eventId: string) {
  const result = await getVerifiedUser(weddingId)
  if ('error' in result) return { error: result.error }

  const { error } = await result.serviceClient
    .from('events')
    .delete()
    .eq('id', eventId)

  if (error) return { error: error.message }
  revalidatePath(`/weddings/${weddingId}/events`)
  return { success: true }
}
