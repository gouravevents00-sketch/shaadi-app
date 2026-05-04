'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, CalendarDays, MapPin, Users, Zap } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { createEvent, updateEvent, deleteEvent, bulkCreateEvents } from './actions'
import SmartDatePicker from '@/components/shared/SmartDatePicker'
import EventDrawer from './EventDrawer'

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

const CEREMONY_TEMPLATES = [
  { name: 'Ganesh Poojan', type: 'ritual',   start_time: '09:00', end_time: '11:00' },
  { name: 'Mehandi',       type: 'ceremony', start_time: '11:00', end_time: '15:00' },
  { name: 'Tilak',         type: 'ritual',   start_time: '11:00', end_time: '13:00' },
  { name: 'Haldi',         type: 'ritual',   start_time: '10:00', end_time: '12:00' },
  { name: 'Mayera',        type: 'ceremony', start_time: '11:00', end_time: '13:00' },
  { name: 'Sangeet',       type: 'party',    start_time: '19:00', end_time: '23:00' },
  { name: 'Sham-e-Mehfil', type: 'party',    start_time: '19:00', end_time: '23:00' },
  { name: 'Sagai',         type: 'ceremony', start_time: '11:00', end_time: '13:00' },
  { name: 'Baraat',        type: 'ceremony', start_time: '20:00', end_time: '23:00' },
  { name: 'Pheras',        type: 'ceremony', start_time: '22:00', end_time: '02:00' },
  { name: 'Reception',     type: 'party',    start_time: '19:00', end_time: '23:00' },
  { name: 'Vidai',         type: 'ritual',   start_time: '00:00', end_time: '02:00' },
]

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

interface QuickItem {
  key: string
  name: string
  type: string
  start_time: string
  end_time: string
  date: string
  custom?: boolean
}


export default function EventsClient({ weddingId, initialEvents, defaultVenue, defaultCity, defaultDate = '', quickDates = [] }: {
  weddingId: string
  initialEvents: Event[]
  defaultVenue: string
  defaultCity: string
  defaultDate?: string
  quickDates?: { label: string; value: string }[]
}) {
  const empty = {
    name: '', date: defaultDate, start_time: '', end_time: '',
    venue: defaultVenue, city: defaultCity, expected_count: 0, type: 'ceremony', notes: ''
  }

  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [open, setOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [editing, setEditing] = useState<Event | null>(null)
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [drawerEvent, setDrawerEvent] = useState<Event | null>(null)

  function set(key: string, value: string | number) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function openNew() { setEditing(null); setForm(empty); setOpen(true) }

  function openEdit(event: Event) {
    setEditing(event)
    setForm({
      name: event.name, date: event.date, start_time: event.start_time,
      end_time: event.end_time ?? '', venue: event.venue, city: event.city ?? '',
      expected_count: event.expected_count, type: event.type, notes: event.notes ?? '',
    })
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const payload = { ...form, end_time: form.end_time || form.start_time, expected_count: Number(form.expected_count) }

    if (editing) {
      const result = await updateEvent(weddingId, editing.id, payload)
      if (result.error) { toast.error(result.error) }
      else { setEvents(prev => prev.map(ev => ev.id === editing.id ? { ...ev, ...payload } : ev)); toast.success('Event updated'); setOpen(false) }
    } else {
      const result = await createEvent(weddingId, payload)
      if (result.error) { toast.error(result.error) }
      else {
        setEvents(prev => [...prev, { id: result.id!, ...payload, end_time: payload.end_time || null, city: payload.city || null, notes: payload.notes || null }])
        toast.success('Event created'); setOpen(false)
      }
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const result = await deleteEvent(weddingId, id)
    if (result.error) { toast.error(result.error) }
    else { setEvents(prev => prev.filter(ev => ev.id !== id)); toast.success('Event deleted'); setDeleteId(null) }
  }

  // Group by date
  const byDate = events.reduce<Record<string, Event[]>>((acc, ev) => {
    acc[ev.date] = acc[ev.date] || []
    acc[ev.date].push(ev)
    return acc
  }, {})
  const sortedDates = Object.keys(byDate).sort()

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Ceremonies & Events</h1>
          <p className="text-stone-500 text-sm mt-1">{events.length} event{events.length !== 1 ? 's' : ''} planned</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setQuickOpen(true)} className="border-rose-200 text-rose-700 hover:bg-rose-50">
            <Zap className="w-4 h-4 mr-1.5" /> Quick add
          </Button>
          <Button onClick={openNew} className="bg-rose-700 hover:bg-rose-800">
            <Plus className="w-4 h-4 mr-1.5" /> Add event
          </Button>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="border border-dashed border-stone-200 rounded-xl p-8">
          <div className="text-center mb-6">
            <CalendarDays className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-700 font-semibold">Plan your wedding schedule</p>
            <p className="text-stone-400 text-sm mt-1">Add all ceremonies at once or one by one</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => setQuickOpen(true)} className="bg-rose-700 hover:bg-rose-800">
              <Zap className="w-4 h-4 mr-1.5" /> Quick-add ceremonies
            </Button>
            <Button variant="outline" onClick={openNew}>
              <Plus className="w-4 h-4 mr-1.5" /> Add one by one
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(date => (
            <div key={date}>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">{formatDate(date)}</p>
              <div className="space-y-3">
                {byDate[date]
                  .sort((a, b) => a.start_time.localeCompare(b.start_time))
                  .map(ev => (
                    <div key={ev.id} className="bg-white border border-stone-200 rounded-xl p-4 flex items-start gap-4 cursor-pointer hover:border-stone-300 hover:shadow-sm transition-all"
                      onClick={() => setDrawerEvent(ev)}>
                      <div className="w-16 text-right flex-shrink-0">
                        <p className="text-sm font-semibold text-stone-800">{formatTime(ev.start_time)}</p>
                        {ev.end_time && ev.end_time !== ev.start_time && (
                          <p className="text-xs text-stone-400">{formatTime(ev.end_time)}</p>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-stone-900">{ev.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLORS[ev.type]}`}>{ev.type}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-stone-500">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.venue}{ev.city ? `, ${ev.city}` : ''}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {ev.expected_count} guests</span>
                        </div>
                        {ev.notes && <p className="text-xs text-stone-400 mt-1">{ev.notes}</p>}
                      </div>
                      <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <Button size="icon-sm" variant="ghost" onClick={() => openEdit(ev)}><Pencil className="w-3.5 h-3.5" /></Button>
                        <Button size="icon-sm" variant="ghost" onClick={() => setDeleteId(ev.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Add Modal */}
      <QuickAddModalWithWeddingId
        open={quickOpen} onClose={() => setQuickOpen(false)}
        weddingId={weddingId} defaultVenue={defaultVenue} defaultCity={defaultCity}
        defaultDate={defaultDate} quickDates={quickDates}
        onCreated={created => setEvents(prev => [...prev, ...created])}
      />
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
                    {EVENT_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date *</Label>
                <SmartDatePicker value={form.date} onChange={v => set('date', v)} quickDates={quickDates} required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start time *</Label>
                <Input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>End time</Label>
                <Input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Venue *</Label>
                <Input placeholder="e.g. Taj Hotel" value={form.venue} onChange={e => set('venue', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input placeholder="City" value={form.city} onChange={e => set('city', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Expected guests</Label>
              <Input type="number" min={0} value={form.expected_count} onChange={e => set('expected_count', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Optional notes" value={form.notes} onChange={e => set('notes', e.target.value)} />
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
          <DialogHeader><DialogTitle>Delete event?</DialogTitle></DialogHeader>
          <p className="text-sm text-stone-500">This will also remove all guest assignments for this event.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event workspace drawer */}
      {drawerEvent && (
        <EventDrawer
          key={drawerEvent.id}
          open={!!drawerEvent}
          onClose={() => setDrawerEvent(null)}
          weddingId={weddingId}
          event={drawerEvent}
        />
      )}
    </div>
  )
}

// Separate named component to avoid hooks-in-callbacks issue
function QuickAddModalWithWeddingId({ open, onClose, weddingId, defaultVenue, defaultCity, defaultDate, quickDates, onCreated }: {
  open: boolean
  onClose: () => void
  weddingId: string
  defaultVenue: string
  defaultCity: string
  defaultDate: string
  quickDates: { label: string; value: string }[]
  onCreated: (events: Event[]) => void
}) {
  const [selected, setSelected] = useState<Record<string, QuickItem>>({})
  const [venue, setVenue] = useState(defaultVenue)
  const [city, setCity] = useState(defaultCity)
  const [loading, setLoading] = useState(false)
  const [customName, setCustomName] = useState('')

  function toggle(t: typeof CEREMONY_TEMPLATES[0]) {
    setSelected(prev => {
      if (prev[t.name]) { const next = { ...prev }; delete next[t.name]; return next }
      return { ...prev, [t.name]: { key: t.name, name: t.name, type: t.type, start_time: t.start_time, end_time: t.end_time, date: defaultDate } }
    })
  }

  function setDate(key: string, date: string) {
    setSelected(prev => prev[key] ? { ...prev, [key]: { ...prev[key], date } } : prev)
  }

  function addCustom() {
    const n = customName.trim(); if (!n) return
    const key = `custom_${n}`
    setSelected(prev => ({ ...prev, [key]: { key, name: n, type: 'ceremony', start_time: '11:00', end_time: '13:00', date: defaultDate, custom: true } }))
    setCustomName('')
  }

  function selectAll() {
    const next: Record<string, QuickItem> = {}
    for (const t of CEREMONY_TEMPLATES) next[t.name] = { key: t.name, name: t.name, type: t.type, start_time: t.start_time, end_time: t.end_time, date: defaultDate }
    setSelected(next)
  }

  async function handleSubmit() {
    const items = Object.values(selected)
    if (!items.length) { toast.error('Select at least one ceremony'); return }
    if (items.some(i => !i.date)) { toast.error('Set a date for each ceremony'); return }
    setLoading(true)
    const payload = items.map(i => ({
      name: i.name, date: i.date, start_time: i.start_time, end_time: i.end_time,
      venue, city, expected_count: 0, type: i.type, notes: ''
    }))
    const res = await bulkCreateEvents(weddingId, payload)
    if (res.error) { toast.error(res.error); setLoading(false); return }
    toast.success(`${res.created?.length ?? 0} ceremonies added`)
    onCreated((res.created ?? []) as Event[])
    onClose()
    setSelected({})
    setLoading(false)
  }

  const count = Object.keys(selected).length

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick-add ceremonies</DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-stone-400">{count} selected</span>
          <div className="flex gap-3">
            <button onClick={selectAll} className="text-xs text-rose-600 hover:underline">Select all</button>
            <button onClick={() => setSelected({})} className="text-xs text-stone-400 hover:underline">Clear</button>
          </div>
        </div>

        <div className="space-y-1.5 mb-4">
          {CEREMONY_TEMPLATES.map(t => {
            const isOn = !!selected[t.name]
            return (
              <div key={t.name}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors cursor-pointer ${isOn ? 'border-rose-200 bg-rose-50' : 'border-stone-100 bg-white hover:border-stone-200'}`}
                onClick={() => toggle(t)}>
                <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${isOn ? 'bg-rose-600 border-rose-600' : 'border-stone-300'}`}>
                  {isOn && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
                <span className={`text-sm font-medium flex-1 ${isOn ? 'text-rose-700' : 'text-stone-700'}`}>{t.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${TYPE_COLORS[t.type]}`}>{t.type}</span>
                {isOn && (
                  <div onClick={e => e.stopPropagation()} className="w-32">
                    <SmartDatePicker value={selected[t.name].date} onChange={v => setDate(t.name, v)} quickDates={quickDates}
                      className="h-7 text-xs px-2 border border-rose-200 rounded-md w-full bg-white" />
                  </div>
                )}
              </div>
            )
          })}

          {Object.values(selected).filter(i => i.custom).map(i => (
            <div key={i.key} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50">
              <div className="w-4 h-4 rounded border-2 bg-rose-600 border-rose-600 flex-shrink-0 flex items-center justify-center">
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              </div>
              <span className="text-sm font-medium text-rose-700 flex-1">{i.name}</span>
              <div onClick={e => e.stopPropagation()} className="w-32">
                <SmartDatePicker value={i.date} onChange={v => setDate(i.key, v)} quickDates={quickDates}
                  className="h-7 text-xs px-2 border border-rose-200 rounded-md w-full bg-white" />
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mb-4">
          <Input placeholder="+ Custom ceremony name" value={customName}
            onChange={e => setCustomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustom())}
            className="text-sm h-8" />
          <Button size="sm" variant="outline" onClick={addCustom} className="h-8 px-3 text-sm">Add</Button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-2">
          <div className="col-span-2 space-y-1">
            <Label className="text-xs">Venue (applies to all)</Label>
            <Input value={venue} onChange={e => setVenue(e.target.value)} className="h-8 text-sm" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">City</Label>
            <Input value={city} onChange={e => setCity(e.target.value)} className="h-8 text-sm" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="bg-rose-700 hover:bg-rose-800" onClick={handleSubmit} disabled={loading || count === 0}>
            {loading ? 'Adding…' : `Add ${count > 0 ? count : ''} ceremonies`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
