import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?next=/my/${id}/settings`)

  const sc = createServiceClient()
  const { data: celebration } = await sc
    .from('celebrations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!celebration) redirect('/celebrate/new')

  return <SettingsClient celebrationId={id} celebration={celebration} />
}
