import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CalendarDays, MapPin, Users } from 'lucide-react'
import EventWorkspaceClient from './EventWorkspaceClient'

export default async function EventWorkspacePage({
  params,
}: {
  params: Promise<{ weddingId: string; eventId: string }>
}) {
  const { weddingId, eventId } = await params
  const sc = createServiceClient()

  const [{ data: event }, { data: fbCounts }, { data: decorItems }, { data: vendorEvents }] = await Promise.all([
    sc.from('events').select('*').eq('id', eventId).single(),
    sc.from('fb_counts').select('*').eq('event_id', eventId),
    sc.from('decor_items').select('*').eq('event_id', eventId).order('created_at'),
    sc.from('vendor_events')
      .select('vendor_id, vendors(id, name, category, status, contact_name, phone)')
      .eq('event_id', eventId),
  ])

  if (!event) notFound()

  // Guest count per event (from guest_events)
  const { data: guestEvents } = await sc.from('guest_events')
    .select('guest_id, rsvp_status').eq('event_id', eventId)

  const confirmed = (guestEvents ?? []).filter((ge: { rsvp_status: string }) => ge.rsvp_status === 'confirmed').length
  const total = guestEvents?.length ?? 0

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      {/* Back + header */}
      <div className="mb-6">
        <Link href={`/weddings/${weddingId}/events`} className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to events
        </Link>
        <h1 className="text-2xl font-semibold text-stone-900">{event.name}</h1>
        <div className="flex items-center gap-4 mt-1.5 text-sm text-stone-500">
          {event.date && (
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" />
              {new Date(event.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          )}
          {event.venue && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" /> {event.venue}{event.city ? `, ${event.city}` : ''}
            </span>
          )}
          {total > 0 && (
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4" /> {confirmed}/{total} confirmed
            </span>
          )}
        </div>
      </div>

      <EventWorkspaceClient
        weddingId={weddingId}
        eventId={eventId}
        initialFbCounts={(fbCounts ?? []) as FbCount[]}
        initialDecorItems={(decorItems ?? []) as DecorItem[]}
        vendorLinks={(vendorEvents ?? []) as VendorLink[]}
      />
    </div>
  )
}

// Type exports for client
export type FbCount = {
  id: string; event_id: string; meal_type: string
  veg: number; non_veg: number; jain: number; other: number; notes: string | null
}

export type DecorItem = {
  id: string; event_id: string; title: string
  status: 'pending' | 'in_progress' | 'done' | 'issue'
  issue_note: string | null; completed_at: string | null
}

export type VendorLink = {
  vendor_id: string
  vendors: {
    id: string; name: string; category: string; status: string
    contact_name: string | null; phone: string | null
  } | null
}
