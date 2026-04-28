import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import RsvpForm from './RsvpForm'

export default async function RsvpPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const sc = createServiceClient()

  const { data: guest } = await sc
    .from('guests')
    .select('id, name, wedding_id')
    .eq('rsvp_token', token)
    .single()

  if (!guest) notFound()

  const { data: wedding } = await sc
    .from('weddings')
    .select('bride_name, groom_name, wedding_date, primary_venue, primary_city')
    .eq('id', guest.wedding_id)
    .single()

  const weddingTitle = wedding
    ? `${wedding.bride_name} & ${wedding.groom_name}`
    : 'Wedding'

  const weddingVenue = wedding?.primary_venue
    ? `${wedding.primary_venue}${wedding.primary_city ? `, ${wedding.primary_city}` : ''}`
    : null

  return (
    <RsvpForm
      guestId={guest.id}
      guestName={guest.name}
      weddingTitle={weddingTitle}
      weddingDate={wedding?.wedding_date ?? null}
      weddingVenue={weddingVenue}
    />
  )
}
