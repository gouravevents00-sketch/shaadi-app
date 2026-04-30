import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChecklistClient from './ChecklistClient'

export default async function ChecklistPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: event }, { data: items }] = await Promise.all([
    supabase.from('org_events').select('type').eq('id', eventId).single(),
    supabase
      .from('org_checklist_items')
      .select('*')
      .eq('org_event_id', eventId)
      .order('order'),
  ])

  if (!event) redirect('/dashboard')

  return (
    <ChecklistClient
      eventId={eventId}
      eventType={event.type}
      initialItems={items ?? []}
    />
  )
}
