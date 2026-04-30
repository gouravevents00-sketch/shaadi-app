import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MyCelebrationClient from './MyCelebrationClient'

export default async function MyCelebrationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?next=/my/${id}`)

  const sc = createServiceClient()

  const [{ data: celebration }, { data: tasks }, { data: connection }] = await Promise.all([
    sc.from('celebrations').select('*').eq('id', id).eq('user_id', user.id).single(),
    sc.from('celebration_tasks').select('*').eq('celebration_id', id).order('created_at'),
    sc.from('planner_connections')
      .select('id, status, wedding_id')
      .eq('celebration_id', id).eq('user_id', user.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ])

  if (!celebration) redirect('/celebrate/new')

  const plan = (celebration as { plan?: string }).plan ?? 'free'

  // Fetch pro data only if on pro plan
  const [{ data: guests }, { data: budget }] = plan === 'pro'
    ? await Promise.all([
        sc.from('celebration_guests').select('*').eq('celebration_id', id).order('created_at'),
        sc.from('celebration_budget').select('*').eq('celebration_id', id).order('created_at'),
      ])
    : [{ data: [] }, { data: [] }]

  return (
    <MyCelebrationClient
      celebration={celebration}
      initialTasks={tasks ?? []}
      initialPlan={plan}
      initialConnection={connection ?? null}
      initialGuests={guests ?? []}
      initialBudget={budget ?? []}
    />
  )
}
