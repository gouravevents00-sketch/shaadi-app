import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ShowFlowClient from './ShowFlowClient'

export default async function ShowFlowPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?next=/my/${id}/tools/show-flow`)

  const sc = createServiceClient()
  const [{ data: celebration }, { data: functions }] = await Promise.all([
    sc.from('celebrations').select('id, bride_name, groom_name').eq('id', id).eq('user_id', user.id).single(),
    sc.from('celebration_functions').select('id, name, date, start_time').eq('celebration_id', id).order('date').order('sort_order'),
  ])

  if (!celebration) redirect('/celebrate/new')

  return <ShowFlowClient celebrationId={id} celebration={celebration} functions={functions ?? []} />
}
