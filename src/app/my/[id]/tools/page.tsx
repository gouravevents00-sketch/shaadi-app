import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ToolsClient from './ToolsClient'

export default async function ToolsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?next=/my/${id}/tools`)

  const sc = createServiceClient()
  const { data: cel } = await sc.from('celebrations').select('id, name, plan, bride_name, groom_name, event_date, city, wedding_style').eq('id', id).eq('user_id', user.id).single()
  if (!cel) redirect('/celebrate/new')

  const plan = process.env.NODE_ENV === 'development' ? 'pro' : ((cel as { plan?: string }).plan ?? 'free')
  return <ToolsClient celebrationId={id} plan={plan} celebration={cel as { name: string; bride_name?: string; groom_name?: string; event_date?: string; city?: string; wedding_style?: string }} />
}
