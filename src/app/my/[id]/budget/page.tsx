import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BudgetClient from './BudgetClient'

export default async function BudgetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?next=/my/${id}/budget`)

  const sc = createServiceClient()
  const [{ data: celebration }, { data: budget }] = await Promise.all([
    sc.from('celebrations').select('id, plan, budget').eq('id', id).eq('user_id', user.id).single(),
    sc.from('celebration_budget').select('*').eq('celebration_id', id).order('created_at'),
  ])

  if (!celebration) redirect('/celebrate/new')
  const plan = (celebration as { plan?: string }).plan ?? 'free'

  return (
    <BudgetClient
      celebrationId={id}
      plan={plan}
      totalBudget={(celebration as { budget?: number }).budget ?? 0}
      initialBudget={budget ?? []}
    />
  )
}
