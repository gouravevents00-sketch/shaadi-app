'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function verifyClient(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const sc = createServiceClient()
  const { data: invite } = await sc.from('invites')
    .select('id, side')
    .eq('wedding_id', weddingId).eq('role', 'client').eq('email', user.email ?? '')
    .not('accepted_at', 'is', null).single()
  if (!invite) return { error: 'No access' as const }
  return { sc, side: invite.side as string }
}

export async function addPortalGuest(weddingId: string, data: {
  name: string; phone?: string; email?: string
  dietary?: string; plus_count?: number; notes?: string
}) {
  const r = await verifyClient(weddingId)
  if ('error' in r) return { error: r.error }
  const side = r.side === 'bride' ? 'bride' : r.side === 'groom' ? 'groom' : 'bride'
  const { data: guest, error } = await r.sc.from('guests').insert({
    wedding_id: weddingId,
    name: data.name.trim(),
    phone: data.phone?.trim() || null,
    email: data.email?.trim() || null,
    dietary: data.dietary?.trim() || null,
    dietary_notes: data.dietary?.trim() || null,
    plus_count: data.plus_count ?? 0,
    notes: data.notes?.trim() || null,
    side,
    rsvp_status: 'confirmed',
    is_vip: false,
    invite_group: '',
  }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath(`/portal/${weddingId}/guests`)
  revalidatePath(`/weddings/${weddingId}/guests`)
  return { id: guest.id }
}

export async function bulkImportPortalGuests(weddingId: string, guests: {
  name: string; phone?: string; email?: string; dietary?: string; plus_count?: number
}[]) {
  const r = await verifyClient(weddingId)
  if ('error' in r) return { error: r.error }
  const side = r.side === 'bride' ? 'bride' : r.side === 'groom' ? 'groom' : 'bride'
  const rows = guests.filter(g => g.name.trim()).map(g => ({
    wedding_id: weddingId,
    name: g.name.trim(),
    phone: g.phone?.trim() || null,
    email: g.email?.trim() || null,
    dietary: g.dietary?.trim() || null,
    dietary_notes: g.dietary?.trim() || null,
    plus_count: g.plus_count ?? 0,
    side,
    rsvp_status: 'confirmed',
    is_vip: false,
    invite_group: '',
  }))
  if (rows.length === 0) return { error: 'No valid guests' }
  const { error } = await r.sc.from('guests').insert(rows)
  if (error) return { error: error.message }
  revalidatePath(`/portal/${weddingId}/guests`)
  revalidatePath(`/weddings/${weddingId}/guests`)
  return { count: rows.length }
}

export async function deletePortalGuest(weddingId: string, guestId: string) {
  const r = await verifyClient(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('guests').delete().eq('id', guestId).eq('wedding_id', weddingId)
  if (error) return { error: error.message }
  revalidatePath(`/portal/${weddingId}/guests`)
  revalidatePath(`/weddings/${weddingId}/guests`)
  return { success: true }
}
