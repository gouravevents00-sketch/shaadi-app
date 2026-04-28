import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import GuestsClient from './GuestsClient'

export default async function PortalGuestsPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const { data: invite } = await sc.from('invites')
    .select('side').eq('wedding_id', weddingId).eq('role', 'client')
    .eq('email', user.email ?? '').not('accepted_at', 'is', null).single()

  const clientSide = invite?.side ?? 'bride'
  const guestSide = clientSide === 'bride' ? 'bride' : clientSide === 'groom' ? 'groom' : 'bride'

  const { data: guests } = await sc.from('guests')
    .select('id, name, phone, email, dietary, plus_count, notes, side')
    .eq('wedding_id', weddingId).eq('side', guestSide).order('name')

  return <GuestsClient weddingId={weddingId} initialGuests={guests ?? []} clientSide={clientSide} />
}
