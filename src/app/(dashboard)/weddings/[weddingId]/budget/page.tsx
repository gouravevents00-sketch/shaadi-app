import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BudgetClient from './BudgetClient'

export default async function BudgetPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const [
    { data: wedding },
    { data: categories },
    { data: items },
    { data: vendors },
    { count: checklistCount },
    { count: eventCount },
  ] = await Promise.all([
    sc.from('weddings').select('budget_total').eq('id', weddingId).single(),
    sc.from('budget_categories').select('id, name, estimated, order').eq('wedding_id', weddingId).order('order'),
    sc.from('budget_items').select('id, category_id, description, estimated, quoted, paid, due_date').eq('wedding_id', weddingId),
    sc.from('vendors').select('id, name, category, total_amount, paid_amount, status').eq('wedding_id', weddingId).order('created_at'),
    sc.from('checklist_items').select('*', { count: 'exact', head: true }).eq('wedding_id', weddingId),
    sc.from('events').select('*', { count: 'exact', head: true }).eq('wedding_id', weddingId),
  ])

  return (
    <BudgetClient
      weddingId={weddingId}
      budgetTotal={wedding?.budget_total ?? 0}
      initialCategories={categories ?? []}
      initialItems={items ?? []}
      initialVendors={vendors ?? []}
      hasChecklist={(checklistCount ?? 0) > 0}
      hasEvents={(eventCount ?? 0) > 0}
    />
  )
}
