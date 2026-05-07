import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MySidebarClient from './MySidebarClient'

export default async function MyCelebrationLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?next=/my/${id}`)

  const sc = createServiceClient()
  const { data: cel } = await sc
    .from('celebrations')
    .select('id, name, bride_name, groom_name, event_date, city, type, plan')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!cel) redirect('/celebrate/new')

  const [
    { count: pendingTasks },
    { count: pendingGuests },
  ] = await Promise.all([
    sc.from('celebration_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('celebration_id', id)
      .neq('status', 'done'),
    sc.from('celebration_guests')
      .select('id', { count: 'exact', head: true })
      .eq('celebration_id', id)
      .eq('rsvp_status', 'pending'),
  ])

  return (
    <MySidebarClient
      id={id}
      celebration={cel as { id: string; name: string; bride_name: string | null; groom_name: string | null; event_date: string | null; city: string | null; type: string; plan: string | null }}
      pendingTasks={pendingTasks ?? 0}
      pendingGuests={pendingGuests ?? 0}
    >
      {children}
    </MySidebarClient>
  )
}
