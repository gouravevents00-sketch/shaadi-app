import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConnectClient from './ConnectClient'

export default async function ConnectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?mode=signin`)

  const sc = createServiceClient()

  // Verify celebration belongs to user
  const { data: celebration } = await sc.from('celebrations')
    .select('id, name').eq('id', id).eq('user_id', user.id).single()
  if (!celebration) redirect('/celebrate/new')

  const [{ data: companies }, { data: connections }] = await Promise.all([
    sc.from('companies').select('id, name, slug, logo_url').order('name'),
    sc.from('planner_connections')
      .select('id, company_id, status, created_at, wedding_id')
      .eq('celebration_id', id).eq('user_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  return (
    <ConnectClient
      celebrationId={id}
      companies={companies ?? []}
      initialConnections={connections ?? []}
    />
  )
}
