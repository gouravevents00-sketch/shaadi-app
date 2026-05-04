import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LogisticsClient from './LogisticsClient'

export default async function LogisticsPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()

  const [
    { data: wedding },
    { data: vehicles },
    { data: pickups },
    { data: arrivals },
    { data: guests },
    { data: events },
  ] = await Promise.all([
    sc.from('weddings').select('bride_name, groom_name, wedding_date').eq('id', weddingId).single(),
    sc.from('vehicles').select('*').eq('wedding_id', weddingId).order('created_at', { ascending: true }),
    sc.from('pickups')
      .select('*, guests(id, name, phone), vehicles(id, number, driver_name, driver_phone)')
      .eq('wedding_id', weddingId)
      .order('scheduled_time', { ascending: true }),
    sc.from('arrivals')
      .select('*, guests(id, name, phone), events(id, name)')
      .eq('wedding_id', weddingId)
      .order('arrival_time', { ascending: true }),
    sc.from('guests').select('id, name, phone, side').eq('wedding_id', weddingId).order('name'),
    sc.from('events').select('id, name, date').eq('wedding_id', weddingId).order('date'),
  ])

  const weddingName = wedding
    ? `${wedding.bride_name}${wedding.groom_name ? ` & ${wedding.groom_name}` : ''}`
    : ''

  return (
    <LogisticsClient
      weddingId={weddingId}
      weddingName={weddingName}
      initialVehicles={vehicles ?? []}
      initialPickups={pickups ?? []}
      initialArrivals={arrivals ?? []}
      guests={guests ?? []}
      events={events ?? []}
    />
  )
}
