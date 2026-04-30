import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FunctionsClient from './FunctionsClient'

export default async function PortalFunctionsPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/portal/${weddingId}/functions`)

  const sc = createServiceClient()

  const { data: invite } = await sc.from('invites')
    .select('id, side')
    .eq('wedding_id', weddingId).eq('role', 'client').eq('email', user.email ?? '')
    .not('accepted_at', 'is', null).single()
  if (!invite) redirect('/login')

  const [{ data: events }, { data: requirements }] = await Promise.all([
    sc.from('events')
      .select('id, name, date, start_time, end_time, venue, city, expected_count, type, notes')
      .eq('wedding_id', weddingId).order('date').order('start_time'),
    sc.from('requirements')
      .select('id, title, status, category')
      .eq('wedding_id', weddingId).eq('category', 'Function Request').order('created_at'),
  ])

  return (
    <FunctionsClient
      weddingId={weddingId}
      events={events ?? []}
      requirements={requirements ?? []}
    />
  )
}
