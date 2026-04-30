import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SeatingClient from './SeatingClient'

export default async function SeatingPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: tables }, { data: assignments }, { data: guests }, { data: events }] = await Promise.all([
    supabase.from('seating_tables').select('*').eq('wedding_id', weddingId).order('sort_order').order('created_at'),
    supabase.from('seating_assignments')
      .select('id, table_id, guest_id')
      .in('table_id',
        (await supabase.from('seating_tables').select('id').eq('wedding_id', weddingId)).data?.map(t => t.id) ?? []
      ),
    supabase.from('guests').select('id, name, side, is_vip, plus_count, family_group').eq('wedding_id', weddingId).order('name'),
    supabase.from('events').select('id, name, date').eq('wedding_id', weddingId).order('date'),
  ])

  return (
    <SeatingClient
      weddingId={weddingId}
      initialTables={tables ?? []}
      initialAssignments={assignments ?? []}
      guests={guests ?? []}
      events={events ?? []}
    />
  )
}
