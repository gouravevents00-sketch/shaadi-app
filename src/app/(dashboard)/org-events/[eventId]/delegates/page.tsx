import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DelegatesClient from './DelegatesClient'

export default async function DelegatesPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: delegates } = await supabase
    .from('delegates')
    .select('*')
    .eq('org_event_id', eventId)
    .order('name')

  return <DelegatesClient eventId={eventId} initialDelegates={delegates ?? []} />
}
