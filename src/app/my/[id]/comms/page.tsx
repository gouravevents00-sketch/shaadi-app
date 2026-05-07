import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CommsClient from './CommsClient'

export default async function CommsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?next=/my/${id}/comms`)

  const sc = createServiceClient()
  const [{ data: cel }, { data: guests }, { data: vendors }, { data: remarks }] = await Promise.all([
    sc.from('celebrations').select('id').eq('id', id).eq('user_id', user.id).single(),
    sc.from('celebration_guests').select('id, name, phone, rsvp_status').eq('celebration_id', id).order('name'),
    sc.from('celebration_vendors').select('id, name, phone, category').eq('celebration_id', id).order('name'),
    sc.from('celebration_remarks').select('*').eq('celebration_id', id).order('created_at', { ascending: false }),
  ])

  if (!cel) redirect('/celebrate/new')

  return (
    <CommsClient
      celebrationId={id}
      initialGuests={guests ?? []}
      initialVendors={vendors ?? []}
      initialRemarks={remarks ?? []}
    />
  )
}
