import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PreferencesClient from './PreferencesClient'

export default async function PreferencesPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const { data: invite } = await sc.from('invites')
    .select('side').eq('wedding_id', weddingId).eq('role', 'client')
    .eq('email', user.email ?? '').not('accepted_at', 'is', null).single()

  const { data: rows } = await sc.from('client_preferences')
    .select('key, value').eq('wedding_id', weddingId).eq('side', invite?.side ?? 'both')

  const initial: Record<string, string> = {}
  for (const r of rows ?? []) initial[r.key] = r.value

  return <PreferencesClient weddingId={weddingId} initial={initial} />
}
