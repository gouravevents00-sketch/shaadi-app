import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RoomsClient from './RoomsClient'

export default async function RoomsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?next=/my/${id}/rooms`)

  const sc = createServiceClient()
  const [{ data: rooms }, { data: guests }] = await Promise.all([
    sc.from('celebration_rooms').select('*').eq('celebration_id', id).order('created_at'),
    sc.from('celebration_guests').select('id, name, plus_count, room_id').eq('celebration_id', id).order('name'),
  ])

  return (
    <RoomsClient
      celebrationId={id}
      initialRooms={rooms ?? []}
      initialGuests={guests ?? []}
    />
  )
}
