'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function createCelebration(payload: {
  userId: string
  brideName: string
  groomName: string
  weddingDate: string
  city: string
  managedBy: 'self' | 'agency' | 'marketplace'
}) {
  const sc = createServiceClient()

  const name = payload.brideName && payload.groomName
    ? `${payload.brideName} & ${payload.groomName}`
    : payload.brideName || payload.groomName || 'My Wedding'

  const { data, error } = await sc
    .from('celebrations')
    .insert({
      user_id: payload.userId,
      type: 'wedding',
      name,
      bride_name: payload.brideName || null,
      groom_name: payload.groomName || null,
      event_date: payload.weddingDate || null,
      city: payload.city || null,
      managed_by: payload.managedBy,
      onboarding_done: true,
      budget: 0,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message || 'Failed to create celebration' }
  return { id: data.id }
}
