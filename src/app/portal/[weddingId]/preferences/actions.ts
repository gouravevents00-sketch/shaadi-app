'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendPreferencesSavedNotification } from '@/lib/email'

async function verifyClient(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const sc = createServiceClient()
  const { data: invite } = await sc.from('invites')
    .select('id, side').eq('wedding_id', weddingId).eq('role', 'client')
    .eq('email', user.email ?? '').not('accepted_at', 'is', null).single()
  if (!invite) return { error: 'No access' as const }
  return { sc, side: invite.side as string }
}

export async function savePreferences(weddingId: string, prefs: Record<string, string>) {
  const r = await verifyClient(weddingId)
  if ('error' in r) return { error: r.error }

  const sc = createServiceClient()
  // Upsert each preference key
  const rows = Object.entries(prefs).map(([key, value]) => ({
    wedding_id: weddingId,
    side: r.side || 'both',
    category: key.split('.')[0],
    key,
    value,
  }))

  const { error } = await sc.from('client_preferences').upsert(rows, { onConflict: 'wedding_id,side,key' })
  if (error) return { error: error.message }
  revalidatePath(`/portal/${weddingId}/preferences`)
  revalidatePath(`/weddings/${weddingId}/overview`)

  // Fire notification (non-blocking)
  const { data: wedding } = await sc.from('weddings').select('name').eq('id', weddingId).single()
  const filledCount = Object.values(prefs).filter(v => v && String(v).trim()).length
  sendPreferencesSavedNotification({
    weddingName: wedding?.name ?? 'Wedding',
    side: r.side || 'both',
    filledCount,
  }).catch(() => {})

  return { success: true }
}
