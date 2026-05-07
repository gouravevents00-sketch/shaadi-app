import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DocGenClient from './DocGenClient'

export default async function DocGenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?next=/my/${id}/tools/docs`)

  const sc = createServiceClient()
  const [{ data: celebration }, { data: vendors }] = await Promise.all([
    sc.from('celebrations').select('*').eq('id', id).eq('user_id', user.id).single(),
    sc.from('celebration_vendors').select('id, name, category, contact_name, phone').eq('celebration_id', id).order('created_at'),
  ])

  if (!celebration) redirect('/celebrate/new')

  return <DocGenClient celebrationId={id} celebration={celebration} vendors={vendors ?? []} />
}
