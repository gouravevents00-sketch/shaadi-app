'use server'

import { createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const PATH = (id: string) => `/weddings/${id}/deliverables`

export async function addGift(weddingId: string, data: {
  giver_name: string; gift_type: string; amount?: number; description?: string
  received_at: string; event_id?: string; guest_id?: string; notes?: string
}) {
  const sc = createServiceClient()
  const { data: gift, error } = await sc.from('guest_gifts')
    .insert({ wedding_id: weddingId, ...data })
    .select('id').single()
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { id: gift.id }
}

export async function deleteGift(weddingId: string, giftId: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('guest_gifts').delete().eq('id', giftId)
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { success: true }
}
