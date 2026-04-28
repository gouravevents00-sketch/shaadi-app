import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ClientPageClient from './ClientPageClient'

export default async function CoordinatorClientPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()

  // Get client invites to know the side
  const { data: clientInvites } = await sc.from('invites')
    .select('email, accepted_at, side')
    .eq('wedding_id', weddingId).eq('role', 'client')
    .order('created_at', { ascending: false })

  type InviteRow = { email: string; accepted_at: string | null; side: string | null }
  const acceptedSides = (clientInvites as InviteRow[] ?? [])
    .filter((i: InviteRow) => i.accepted_at)
    .map((i: InviteRow) => i.side as string)

  const guestSides = acceptedSides.length > 0
    ? acceptedSides.filter((s: string) => s === 'bride' || s === 'groom')
    : ['bride', 'groom']

  const [
    { data: approvals },
    { data: preferences },
    { data: guests },
    { data: requirements },
  ] = await Promise.all([
    sc.from('approval_items')
      .select('id, title, category, description, status, client_note, created_at')
      .eq('wedding_id', weddingId).order('created_at', { ascending: false }),
    sc.from('client_preferences')
      .select('key, value, category').eq('wedding_id', weddingId),
    sc.from('guests')
      .select('id, name, phone, side, dietary, plus_count')
      .eq('wedding_id', weddingId)
      .in('side', guestSides).order('name'),
    sc.from('requirements')
      .select('id, title, priority, status')
      .eq('wedding_id', weddingId).order('created_at', { ascending: false }),
  ])

  return (
    <ClientPageClient
      weddingId={weddingId}
      approvals={approvals ?? []}
      preferences={preferences ?? []}
      guests={guests ?? []}
      requirements={requirements ?? []}
      clientInvites={(clientInvites as InviteRow[] ?? []).map((i: InviteRow) => ({ email: i.email, accepted_at: i.accepted_at }))}
    />
  )
}
