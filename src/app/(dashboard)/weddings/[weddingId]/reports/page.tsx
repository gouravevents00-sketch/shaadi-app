import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportsClient from './ReportsClient'

export default async function ReportsPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()

  const [
    { data: wedding },
    { data: guests },
    { data: guestEvents },
    { data: events },
    { data: vendors },
    { data: budgetItems },
    { data: budgetCategories },
    { data: checklist },
  ] = await Promise.all([
    sc.from('weddings').select('bride_name, groom_name, wedding_date, primary_venue, primary_city, budget_total').eq('id', weddingId).single(),
    sc.from('guests').select('id, name, phone, email, side, is_vip, dietary, dietary_notes, plus_count, rsvp_submitted_at, needs_pickup, arrival_mode, arrival_date, departure_date, notes').eq('wedding_id', weddingId).order('name'),
    sc.from('guest_events').select('guest_id, event_id, rsvp_status').in('event_id',
      (await sc.from('events').select('id').eq('wedding_id', weddingId)).data?.map((e: { id: string }) => e.id) ?? []
    ),
    sc.from('events').select('id, name, date, start_time, type').eq('wedding_id', weddingId).order('date').order('start_time'),
    sc.from('vendors').select('name, category, status, total_amount, paid_amount, phone, notes').eq('wedding_id', weddingId).order('category'),
    sc.from('budget_items').select('description, estimated, quoted, paid, due_date, category_id').eq('wedding_id', weddingId),
    sc.from('budget_categories').select('id, name').eq('wedding_id', weddingId),
    sc.from('checklist_items').select('title, category, side, status, due_date').eq('wedding_id', weddingId).order('category'),
  ])

  const catMap = Object.fromEntries((budgetCategories ?? []).map((c: { id: string; name: string }) => [c.id, c.name]))

  return (
    <ReportsClient
      weddingId={weddingId}
      weddingTitle={wedding ? `${wedding.bride_name} & ${wedding.groom_name}` : 'Wedding'}
      weddingDate={wedding?.wedding_date ?? null}
      budgetTotal={wedding?.budget_total ?? 0}
      guests={guests ?? []}
      guestEvents={guestEvents ?? []}
      events={events ?? []}
      vendors={vendors ?? []}
      budgetItems={(budgetItems ?? []).map((i: { description: string; estimated: number; quoted: number; paid: number; due_date: string | null; category_id: string }) => ({ ...i, category: catMap[i.category_id] ?? 'Other' }))}
      checklist={checklist ?? []}
    />
  )
}
