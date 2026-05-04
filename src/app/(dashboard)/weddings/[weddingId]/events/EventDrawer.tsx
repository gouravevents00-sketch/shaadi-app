'use client'

import { useEffect, useState } from 'react'
import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet'
import { CalendarDays, MapPin, Users, Clock } from 'lucide-react'
import EventWorkspaceClient from './[eventId]/EventWorkspaceClient'
import { fetchEventDetails } from './[eventId]/actions'
import type { FbCount, DecorItem, VendorLink } from './[eventId]/page'

interface EventData {
  id: string
  name: string
  date: string
  start_time: string
  end_time: string | null
  venue: string
  city: string | null
  expected_count: number
  type: string
  notes: string | null
}

const TYPE_COLORS: Record<string, string> = {
  ceremony: 'bg-rose-50 text-rose-700',
  meal: 'bg-amber-50 text-amber-700',
  ritual: 'bg-purple-50 text-purple-700',
  party: 'bg-blue-50 text-blue-700',
  other: 'bg-stone-100 text-stone-600',
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric'
  })
}

export default function EventDrawer({
  open, onClose, weddingId, event,
}: {
  open: boolean
  onClose: () => void
  weddingId: string
  event: EventData
}) {
  const [data, setData] = useState<{
    fbCounts: FbCount[]
    decorItems: DecorItem[]
    vendorLinks: VendorLink[]
    guestCount: { confirmed: number; total: number }
  } | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetchEventDetails(weddingId, event.id).then(d => {
      setData(d as typeof data)
      setLoading(false)
    })
  }, [open, event.id, weddingId])

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-5 border-b border-stone-100 bg-white sticky top-0 z-10">
          <SheetHeader className="mb-0">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-stone-900">{event.name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLORS[event.type]}`}>
                    {event.type}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs text-stone-500">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" />
                    {formatDate(event.date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(event.start_time)}
                    {event.end_time && event.end_time !== event.start_time && ` – ${formatTime(event.end_time)}`}
                  </span>
                  {event.venue && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {event.venue}{event.city ? `, ${event.city}` : ''}
                    </span>
                  )}
                  {data && data.guestCount.total > 0 && (
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {data.guestCount.confirmed}/{data.guestCount.total} confirmed
                    </span>
                  )}
                </div>
                {event.notes && (
                  <p className="text-xs text-stone-400 mt-1.5 italic">{event.notes}</p>
                )}
              </div>
            </div>
          </SheetHeader>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {loading || !data ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-stone-100 rounded-xl" />
              ))}
            </div>
          ) : (
            <EventWorkspaceClient
              weddingId={weddingId}
              eventId={event.id}
              initialFbCounts={data.fbCounts}
              initialDecorItems={data.decorItems}
              vendorLinks={data.vendorLinks}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
