'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, CalendarDays, MapPin, Users, Clock } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { createEvent, updateEvent, deleteEvent } from './actions'

interface Event {
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

const EVENT_TYPES = ['ceremony', 'meal', 'ritual', 'party', 'other']

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
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const h12 = hour % 12 || 12
  return `${h12}:${m} ${ampm}`
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

export default function EventsClient({ weddingId, initialEvents, defaultVenue, defaultCity }: {
  weddingId: string
  initialEvents: Event[]
  defaultVenue: string
  defaultCity: string
}) {
  const empty = {
    name: '', date: '', start_time: '', end_time: '',
    venue: defaultVenue, city: defaultCity, expected_count: 0, type: 'ceremony', notes: ''
  }

  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Event | null>(null)
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  function set(key: string, value: string | number) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function openNew() {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }

  function openEdit(event: Event) {
    setEditing(event)
    setForm({
      name: event.name,
      date: event.date,
      start_time: event.start_time,
      end_time: event.end_time ?? '',
      venue: event.venue,
      city: event.city ?? '',
      expected_count: event.expected_count,
      type: event.type,
      notes: event.notes ?? '',
    })
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const payload = {
      ...form,
      end_time: form.end_time || form.start_time,
      expected_count: Number(form.expected_count),
    }

    if (editing) {
      const result = await updateEvent(weddingId, editing.id, payload)
      if (result.error) {
        toast.error(result.error)
      } else {
        setEvents(prev => prev.map(ev => ev.id === editing.id ? { ...ev, ...payload } : ev))
        toast.success('Event updated')
        setOpen(false)
      }
    } else {
      const result = await createEvent(weddingId, payload)
      if (result.error) {
        toast.error(result.error)
      } else {
        setEvents(prev => [...prev, { id: result.id!, ...payload, end_time: payload.end_time || null, city: payload.city || null, notes: payload.notes || null }])
        toast.success('Event created')
        setOpen(false)
      }
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const result = await deleteEvent(weddingId, id)
    if (result.error) {
      toast.error(result.error)
    } else {
      setEvents(prev => prev.filter(ev => ev.id !== id))
      toast.success('Event deleted')
      setDeleteId(null)
    }
  }

  // Group by date
  const byDate = events.reduce<Record<string, Event[]>>((acc, ev) => {
    acc[ev.date] = acc[ev.date] || []
    acc[ev.date].push(ev)
    return acc
  }, {})

  const sortedDates = Object.keys(byDate).sort()

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Events</h1>
          <p className="text-stone-500 text-sm mt-1">{events.length} event{events.length !== 1 ? 's' : ''} planned</p>
        </div>
        <Button onClick={openNew} className="bg-rose-700 hover:bg-rose-800">
          <Plus className="w-4 h-4 mr-1.5" /> Add event
        </Button>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-stone-200 rounded-xl">
          <CalendarDays className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 font-medium">No events yet</p>
          <p className="text-stone-400 text-sm mt-1">Add your first ceremony, ritual or party</p>
          <Button onClick={openNew} variant="outline" className="mt-4">
            <Plus className="w-4 h-4 mr-1.5" /> Add event
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(date => (
            <div key={date}>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                {formatDate(date)}
              </p>
              <div className="space-y-3">
                {byDate[date]
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map(ev => (
                    <div key={ev.id} className="bg-white border border-stone-200 rounded-xl p-4 flex items-start gap-4">
                      <div className="w-16 text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-stone-800">{formatTime(ev.start_time)}</p>
                        {ev.end_time && ev.end_time !== ev.start_time && (
                          <p className="text-xs text-stone-400">{formatTime(ev.end_time)}</p>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-stone-900">{ev.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLORS[ev.type]}`}>
                            {ev.type}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-stone-500">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {ev.venue}{ev.city ? `, ${ev.city}` : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> {ev.expected_count} guests
                          </span>
                        </div>
                        {ev.notes && <p className="text-xs text-stone-400 mt-1">{ev.notes}</p>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button size="icon-sm" variant="ghost" onClick={() => openEdit(ev)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => setDeleteId(ev.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit event' : 'Add event'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Event name *</Label>
              <Input placeholder="e.g. Haldi, Baraat, Pheras" value={form.name}
                onChange={e => set('name', e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={form.type ?? ''} onValueChange={v => set('type', v ?? '')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <Input type="date" value={form.date}
                  onChange={e => set('date', e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start time *</Label>
                <Input type="time" value={form.start_time}
                  onChange={e => set('start_time', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>End time</Label>
                <Input type="time" value={form.end_time}
                  onChange={e => set('end_time', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Venue *</Label>
                <Input placeholder="e.g. Nahargarh Palace" value={form.venue}
                  onChange={e => set('venue', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input placeholder="City" value={form.city}
                  onChange={e => set('city', e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Expected guests</Label>
              <Input type="number" min={0} value={form.expected_count}
                onChange={e => set('expected_count', e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Optional notes" value={form.notes}
                onChange={e => set('notes', e.target.value)} />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-rose-700 hover:bg-rose-800" disabled={loading}>
                {loading ? 'Saving…' : editing ? 'Save changes' : 'Add event'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete event?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-500">This will also remove all guest assignments for this event.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
