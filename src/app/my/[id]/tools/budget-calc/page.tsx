import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BudgetCalcClient from './BudgetCalcClient'

export default async function BudgetCalcPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?next=/my/${id}/tools/budget-calc`)

  const sc = createServiceClient()
  const [{ data: celebration }, { data: functions }, { data: budgetItems }] = await Promise.all([
    sc.from('celebrations')
      .select('id, bride_name, groom_name, guest_count, city, venue, wedding_style, event_date')
      .eq('id', id).eq('user_id', user.id).single(),
    sc.from('celebration_functions')
      .select('id, name, date').eq('celebration_id', id).order('date'),
    sc.from('celebration_budget')
      .select('id, category, label, estimated, actual, status').eq('celebration_id', id),
  ])

  if (!celebration) redirect('/celebrate/new')

  return (
    <BudgetCalcClient
      celebrationId={id}
      celebration={celebration}
      functions={functions ?? []}
      budgetItems={budgetItems ?? []}
    />
  )
}
