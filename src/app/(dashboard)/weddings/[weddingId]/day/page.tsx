import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DayClient from './DayClient'

export default async function DayPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [
    { data: wedding },
    { data: todayEvents },
    { data: allEvents },
    { data: checklistItems },
    { data: vendors },
    { data: guests },
    { data: guestEvents },
  ] = await Promise.all([
    supabase.from('weddings').select('bride_name, groom_name, wedding_date, primary_city').eq('id', weddingId).single(),
    supabase.from('events').select('*').eq('wedding_id', weddingId).eq('date', today).order('start_time'),
    supabase.from('events').select('id, name, date').eq('wedding_id', weddingId).order('date'),
    supabase.from('checklist_items')
      .select('id, title, category, status, due_date, assignee')
      .eq('wedding_id', weddingId)
      .neq('status', 'done')
      .or(`due_date.lte.${today},due_date.is.null`)
      .order('due_date', { ascending: true }),
    supabase.from('vendors')
      .select('id, name, category, phone, status')
      .eq('wedding_id', weddingId)
      .in('status', ['confirmed', 'booked']),
    supabase.from('guests').select('id, name, phone, is_vip, rsvp_submitted_at, needs_pickup').eq('wedding_id', weddingId),
    supabase.from('guest_events').select('guest_id, event_id')
      .in('event_id', (await supabase.from('events').select('id').eq('wedding_id', weddingId).eq('date', today)).data?.map(e => e.id) ?? []),
  ])

  return (
    <DayClient
      weddingId={weddingId}
      wedding={wedding ?? { bride_name: '', groom_name: '', wedding_date: null, primary_city: null }}
      today={today}
      todayEvents={todayEvents ?? []}
      allEvents={allEvents ?? []}
      checklistItems={(checklistItems ?? []).filter(i => i.due_date === today || i.due_date < today || !i.due_date)}
      vendors={vendors ?? []}
      guests={guests ?? []}
      guestEvents={guestEvents ?? []}
    />
  )
}
