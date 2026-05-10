import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VehiclesClient from './VehiclesClient'

export default async function VehiclesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?next=/my/${id}/vehicles`)

  const sc = createServiceClient()
  const [{ data: cel }, { data: vehicles }] = await Promise.all([
    sc.from('celebrations').select('id').eq('id', id).eq('user_id', user.id).single(),
    sc.from('celebration_vehicles').select('*').eq('celebration_id', id).order('created_at'),
  ])

  if (!cel) redirect('/celebrate/new')

  return <VehiclesClient celebrationId={id} initialVehicles={vehicles ?? []} />
}
