import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RitualsClient from './RitualsClient'

export default async function RitualsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?next=/my/${id}/rituals`)

  const sc = createServiceClient()
  const [{ data: cel }, { data: rituals }, { data: functions }] = await Promise.all([
    sc.from('celebrations').select('id').eq('id', id).eq('user_id', user.id).single(),
    sc.from('celebration_rituals').select('*').eq('celebration_id', id).order('sort_order').order('created_at'),
    sc.from('celebration_functions').select('id, name').eq('celebration_id', id).order('date'),
  ])

  if (!cel) redirect('/celebrate/new')

  return (
    <RitualsClient
      celebrationId={id}
      initialRituals={rituals ?? []}
      functions={functions ?? []}
    />
  )
}
