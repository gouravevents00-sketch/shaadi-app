import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VendorsClient from './VendorsClient'

export default async function VendorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?next=/my/${id}/vendors`)

  const sc = createServiceClient()
  const [{ data: celebration }, { data: vendors }] = await Promise.all([
    sc.from('celebrations').select('id, plan').eq('id', id).eq('user_id', user.id).single(),
    sc.from('celebration_vendors').select('*').eq('celebration_id', id).order('created_at'),
  ])

  if (!celebration) redirect('/celebrate/new')
  const plan = (celebration as { plan?: string }).plan ?? 'free'

  return (
    <VendorsClient
      celebrationId={id}
      plan={plan}
      initialVendors={vendors ?? []}
    />
  )
}
