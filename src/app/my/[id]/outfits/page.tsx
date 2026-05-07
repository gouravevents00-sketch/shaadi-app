import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OutfitsClient from './OutfitsClient'

export default async function OutfitsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?next=/my/${id}/outfits`)

  const sc = createServiceClient()
  const [{ data: cel }, { data: outfits }, { data: functions }] = await Promise.all([
    sc.from('celebrations').select('id').eq('id', id).eq('user_id', user.id).single(),
    sc.from('celebration_outfits').select('*').eq('celebration_id', id).order('created_at'),
    sc.from('celebration_functions').select('id, name').eq('celebration_id', id).order('date'),
  ])

  if (!cel) redirect('/celebrate/new')

  return (
    <OutfitsClient
      celebrationId={id}
      initialOutfits={outfits ?? []}
      functions={functions ?? []}
    />
  )
}
