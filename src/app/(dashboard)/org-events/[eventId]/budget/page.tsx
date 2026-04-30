import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import BudgetClient from './BudgetClient'

export default async function BudgetPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()

  const [
    { data: event },
    { data: categories },
    { data: items },
    { data: checklist },
  ] = await Promise.all([
    sc.from('org_events').select('budget_total').eq('id', eventId).single(),
    sc.from('org_budget_categories').select('*').eq('org_event_id', eventId).order('order'),
    sc.from('org_budget_items').select('*').eq('org_event_id', eventId),
    sc.from('org_checklist_items').select('id').eq('org_event_id', eventId).limit(1),
  ])

  return (
    <BudgetClient
      eventId={eventId}
      budgetTotal={event?.budget_total ?? 0}
      initialCategories={categories ?? []}
      initialItems={items ?? []}
      hasChecklist={(checklist?.length ?? 0) > 0}
    />
  )
}
