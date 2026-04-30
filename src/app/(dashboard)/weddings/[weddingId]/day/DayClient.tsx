'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, CircleDot, Phone, Users, MapPin, Clock, Star, AlertCircle, CalendarDays, ChevronRight } from 'lucide-react'
import { updateItem } from '../checklist/actions'
import { toast } from 'sonner'
import Link from 'next/link'

interface Wedding {
  bride_name: string; groom_name: string; wedding_date: string | null; primary_city: string | null
}

interface WEvent {
  id: string; name: string; date: string; start_time: string; end_time: string | null
  venue: string; city: string | null; expected_count: number; type: string; notes: string | null
}

interface CheckItem {
  id: string; title: string; category: string; status: string; due_date: string | null; assignee: string | null
}

interface Vendor {
  id: string; name: string; category: string; phone: string | null; status: string
}

interface Guest {
  id: string; name: string; phone: string | null; is_vip: boolean; rsvp_submitted_at: string | null; needs_pickup: boolean
}

interface GuestEvent {
  guest_id: string; event_id: string
}

function formatTime(t: string) {
  const [h, m] = t.split(':')
  const hour = parseInt(h)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  return `${hour % 12 || 12}:${m} ${ampm}`
}

const TYPE_COLORS: Record<string, string> = {
  ceremony: 'bg-rose-100 text-rose-700',
  meal: 'bg-amber-100 text-amber-700',
  ritual: 'bg-purple-100 text-purple-700',
  party: 'bg-blue-100 text-blue-700',
  other: 'bg-stone-100 text-stone-600',
}

export default function DayClient({ weddingId, wedding, today, todayEvents, allEvents, checklistItems, vendors, guests, guestEvents }: {
  weddingId: string
  wedding: Wedding
  today: string
  todayEvents: WEvent[]
  allEvents: { id: string; name: string; date: string }[]
  checklistItems: CheckItem[]
  vendors: Vendor[]
  guests: Guest[]
  guestEvents: GuestEvent[]
}) {
  const [items, setItems] = useState<CheckItem[]>(checklistItems)
  const todayDate = new Date(today + 'T00:00:00')
  const isWeddingDay = wedding.wedding_date === today

  const overdueItems = items.filter(i => i.due_date && i.due_date < today)
  const todayItems = items.filter(i => i.due_date === today)
  const noDateItems = items.filter(i => !i.due_date)

  function getEventGuests(eventId: string) {
    const ids = new Set(guestEvents.filter(ge => ge.event_id === eventId).map(ge => ge.guest_id))
    return guests.filter(g => ids.has(g.id))
  }

  async function toggleItem(item: CheckItem) {
    const next = item.status === 'done' ? 'pending' : 'done'
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: next } : i))
    const res = await updateItem(weddingId, item.id, { status: next })
    if (res.error) {
      toast.error(res.error)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: item.status } : i))
    }
  }

  const pickupGuests = guests.filter(g => g.needs_pickup)

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-semibold text-stone-900">
            {isWeddingDay ? '🎊 Wedding Day' : 'Day Dashboard'}
          </h1>
        </div>
        <p className="text-stone-500 text-sm">
          {wedding.bride_name} & {wedding.groom_name} ·{' '}
          {todayDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          {wedding.primary_city ? ` · ${wedding.primary_city}` : ''}
        </p>
      </div>

      {/* No events today */}
      {todayEvents.length === 0 && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl px-5 py-6 text-center">
          <CalendarDays className="w-8 h-8 text-stone-300 mx-auto mb-2" />
          <p className="text-stone-500 font-medium">No events scheduled today</p>
          {allEvents.length > 0 && (
            <p className="text-stone-400 text-sm mt-1">
              Next: {allEvents.find(e => e.date > today)?.name ?? 'none upcoming'}
            </p>
          )}
        </div>
      )}

      {/* Today's events timeline */}
      {todayEvents.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
            Today's Schedule — {todayEvents.length} event{todayEvents.length !== 1 ? 's' : ''}
          </h2>
          <div className="space-y-3">
            {todayEvents.map(ev => {
              const evGuests = getEventGuests(ev.id)
              const rsvped = evGuests.filter(g => g.rsvp_submitted_at).length
              return (
                <div key={ev.id} className="bg-white border border-stone-200 rounded-xl p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-16 flex-shrink-0 text-right">
                      <p className="text-sm font-bold text-stone-800">{formatTime(ev.start_time)}</p>
                      {ev.end_time && ev.end_time !== ev.start_time && (
                        <p className="text-xs text-stone-400">{formatTime(ev.end_time)}</p>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-stone-900">{ev.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLORS[ev.type] ?? TYPE_COLORS.other}`}>
                          {ev.type}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {ev.venue}{ev.city ? `, ${ev.city}` : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {evGuests.length > 0
                            ? `${evGuests.length} assigned · ${rsvped} RSVP'd · ${ev.expected_count} expected`
                            : `${ev.expected_count} expected`}
                        </span>
                      </div>
                      {ev.notes && <p className="text-xs text-stone-400 mt-1">{ev.notes}</p>}
                      {/* VIP guests at this event */}
                      {evGuests.filter(g => g.is_vip).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {evGuests.filter(g => g.is_vip).map(g => (
                            <span key={g.id} className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
                              <Star className="w-2.5 h-2.5 fill-amber-500" /> {g.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Checklist — overdue + today */}
      {(overdueItems.length > 0 || todayItems.length > 0) && (
        <div>
          <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
            Tasks
          </h2>
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            {overdueItems.map(item => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-3 border-b border-stone-100 bg-red-50/50">
                <button onClick={() => toggleItem(item)} className="flex-shrink-0 mt-0.5">
                  {item.status === 'done'
                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                    : item.status === 'in_progress'
                    ? <CircleDot className="w-4 h-4 text-blue-500" />
                    : <Circle className="w-4 h-4 text-red-400" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${item.status === 'done' ? 'line-through text-stone-400' : 'text-stone-800'}`}>{item.title}</p>
                  <p className="text-xs text-stone-400">{item.category}</p>
                </div>
                <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0">OVERDUE</span>
                {item.assignee && <span className="text-xs text-stone-400 flex-shrink-0">👤 {item.assignee}</span>}
              </div>
            ))}
            {todayItems.map(item => (
              <div key={item.id} className="flex items-start gap-3 px-4 py-3 border-b border-stone-100 last:border-0">
                <button onClick={() => toggleItem(item)} className="flex-shrink-0 mt-0.5">
                  {item.status === 'done'
                    ? <CheckCircle2 className="w-4 h-4 text-green-500" />
                    : item.status === 'in_progress'
                    ? <CircleDot className="w-4 h-4 text-blue-500" />
                    : <Circle className="w-4 h-4 text-stone-300" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${item.status === 'done' ? 'line-through text-stone-400' : 'text-stone-800'}`}>{item.title}</p>
                  <p className="text-xs text-stone-400">{item.category} · due today</p>
                </div>
                {item.assignee && <span className="text-xs text-stone-400 flex-shrink-0">👤 {item.assignee}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Vendor contacts for today */}
        {vendors.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
              Vendor Contacts
            </h2>
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              {vendors.map((v, i) => (
                <div key={v.id} className={`flex items-center gap-3 px-4 py-3 ${i < vendors.length - 1 ? 'border-b border-stone-100' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{v.name}</p>
                    <p className="text-xs text-stone-400">{v.category}</p>
                  </div>
                  {v.phone ? (
                    <a href={`tel:${v.phone}`} className="flex items-center gap-1.5 text-xs text-rose-700 font-medium hover:text-rose-800">
                      <Phone className="w-3.5 h-3.5" /> {v.phone}
                    </a>
                  ) : (
                    <span className="text-xs text-stone-300">No phone</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pickup guests */}
        {pickupGuests.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
              Needs Pickup ({pickupGuests.length})
            </h2>
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              {pickupGuests.map((g, i) => (
                <div key={g.id} className={`flex items-center gap-3 px-4 py-3 ${i < pickupGuests.length - 1 ? 'border-b border-stone-100' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{g.name}</p>
                    {g.rsvp_submitted_at && <p className="text-xs text-green-600">RSVP'd</p>}
                  </div>
                  {g.phone ? (
                    <a href={`tel:${g.phone}`} className="flex items-center gap-1.5 text-xs text-rose-700 font-medium hover:text-rose-800">
                      <Phone className="w-3.5 h-3.5" /> {g.phone}
                    </a>
                  ) : (
                    <span className="text-xs text-stone-300">No phone</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
        <Link href={`/weddings/${weddingId}/guests`} className="text-xs text-stone-500 hover:text-rose-700 flex items-center gap-1">
          <Users className="w-3.5 h-3.5" /> Guest list <ChevronRight className="w-3 h-3" />
        </Link>
        <Link href={`/weddings/${weddingId}/checklist`} className="text-xs text-stone-500 hover:text-rose-700 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Full checklist <ChevronRight className="w-3 h-3" />
        </Link>
        <Link href={`/weddings/${weddingId}/vendors`} className="text-xs text-stone-500 hover:text-rose-700 flex items-center gap-1">
          <Phone className="w-3.5 h-3.5" /> All vendors <ChevronRight className="w-3 h-3" />
        </Link>
        <Link href={`/weddings/${weddingId}/timeline`} className="text-xs text-stone-500 hover:text-rose-700 flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> Run of show <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}
