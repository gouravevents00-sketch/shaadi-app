import { createServiceClient } from '@/lib/supabase/server'
import DeliverablesClient from './DeliverablesClient'

export default async function DeliverablesPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const sc = createServiceClient()

  const [{ data: guests }, { data: gifts }, { data: events }, weddingRes] = await Promise.all([
    sc.from('guests')
      .select('id, name, side, wishes_message, rsvp_submitted_at')
      .eq('wedding_id', weddingId)
      .not('wishes_message', 'is', null)
      .order('name'),
    sc.from('guest_gifts')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('received_at', { ascending: false }),
    sc.from('events').select('id, name, date').eq('wedding_id', weddingId).order('date'),
    sc.from('weddings').select('bride_name, groom_name').eq('id', weddingId).single(),
  ])
  const wedding = weddingRes.data

  return (
    <DeliverablesClient
      weddingId={weddingId}
      coupleName={wedding ? `${wedding.bride_name}${wedding.groom_name ? ` & ${wedding.groom_name}` : ''}` : ''}
      wishes={(guests ?? []) as WishGuest[]}
      initialGifts={(gifts ?? []) as GiftRecord[]}
      events={(events ?? []) as { id: string; name: string; date: string }[]}
    />
  )
}

export type WishGuest = {
  id: string; name: string; side: string
  wishes_message: string | null; rsvp_submitted_at: string | null
}
export type GiftRecord = {
  id: string; wedding_id: string; guest_id: string | null; giver_name: string
  gift_type: string; amount: number | null; description: string | null
  received_at: string; event_id: string | null; notes: string | null
}
