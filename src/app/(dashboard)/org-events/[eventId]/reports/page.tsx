import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportsClient from './ReportsClient'

export default async function ReportsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const { data: event } = await sc.from('org_events').select('id, name, expected_count').eq('id', eventId).single()
  if (!event) redirect('/dashboard')

  const [
    { data: delegates },
    { data: guests },
    { data: volunteers },
    { data: speakers },
    { data: checklist },
    { data: vendors },
    { data: budget_cats },
    { data: budget_items },
    { data: sponsors },
  ] = await Promise.all([
    sc.from('delegates').select('id, checked_in, dietary, organization, is_vip, title').eq('org_event_id', eventId),
    sc.from('org_guests').select('id, checked_in, is_vvip, requires_escort, requires_vehicle, dietary').eq('org_event_id', eventId),
    sc.from('org_volunteers').select('id, checked_in, role, zone, t_shirt_size').eq('org_event_id', eventId),
    sc.from('speakers').select('id').eq('org_event_id', eventId),
    sc.from('org_checklist_items').select('id, status, category').eq('org_event_id', eventId),
    sc.from('org_vendors').select('id, name, category, quoted_amount, contract_signed').eq('org_event_id', eventId),
    sc.from('org_budget_categories').select('id, name, estimated').eq('org_event_id', eventId),
    sc.from('org_budget_items').select('id, category_id, quoted, paid').eq('org_event_id', eventId),
    sc.from('org_sponsors').select('id, name, tier, amount, amount_received').eq('org_event_id', eventId),
  ])

  return (
    <ReportsClient
      event={event}
      delegates={delegates ?? []}
      guests={guests ?? []}
      volunteers={volunteers ?? []}
      speakerCount={speakers?.length ?? 0}
      checklist={checklist ?? []}
      vendors={vendors ?? []}
      budgetCats={budget_cats ?? []}
      budgetItems={budget_items ?? []}
      sponsors={sponsors ?? []}
    />
  )
}
