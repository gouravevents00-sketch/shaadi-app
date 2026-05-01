'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CalendarDays, Plane, BedDouble, Star, Utensils, StickyNote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { updateGuestField, toggleGuestEvent, upsertArrival, assignRoom } from './actions'
import type { WeddingEvent, ArrivalData, Room, RoomAlloc } from './page'

type Tab = 'profile' | 'events' | 'travel' | 'room'

const RSVP_COLORS: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  pending:   'bg-amber-100 text-amber-700',
  declined:  'bg-red-100 text-red-600',
}

interface GuestData {
  id: string; name: string; phone: string | null; email: string | null
  side: string; is_vip: boolean; dietary: string; dietary_notes: string | null
  notes: string | null; rsvp_token: string; plus_count: number
  rsvp_submitted_at: string | null; arrival_mode: string | null; needs_pickup: boolean
  family_group: string | null
}

export default function Guest360Client({ weddingId, guest, events, guestEvents, arrival, rooms, roomAlloc }: {
  weddingId: string
  guest: GuestData
  events: WeddingEvent[]
  guestEvents: { event_id: string; rsvp_status: string }[]
  arrival: ArrivalData | null
  rooms: Room[]
  roomAlloc: RoomAlloc | null
}) {
  const [tab, setTab] = useState<Tab>('profile')
  const [g, setG] = useState(guest)
  const [ge, setGe] = useState<{ event_id: string; rsvp_status: string }[]>(guestEvents)
  const [arr, setArr] = useState<ArrivalData | null>(arrival)
  const [alloc, setAlloc] = useState<RoomAlloc | null>(roomAlloc)
  const [saving, setSaving] = useState(false)

  // ─── Profile helpers ──────────────────────────────────────────

  async function saveField(field: string, value: string | number | boolean | null) {
    setG(prev => ({ ...prev, [field]: value }))
    const res = await updateGuestField(weddingId, guest.id, { [field]: value })
    if ('error' in res) { toast.error(res.error); setG(guest) }
    else toast.success('Saved')
  }

  // ─── Events helpers ───────────────────────────────────────────

  function getGe(eventId: string) {
    return ge.find(x => x.event_id === eventId)
  }

  async function cycleRsvp(ev: WeddingEvent) {
    const current = getGe(ev.id)
    let next: string
    if (!current) next = 'confirmed'
    else if (current.rsvp_status === 'confirmed') next = 'pending'
    else if (current.rsvp_status === 'pending') next = 'declined'
    else next = 'remove'

    setGe(prev => {
      if (next === 'remove') return prev.filter(x => x.event_id !== ev.id)
      const idx = prev.findIndex(x => x.event_id === ev.id)
      if (idx >= 0) { const n = [...prev]; n[idx] = { event_id: ev.id, rsvp_status: next }; return n }
      return [...prev, { event_id: ev.id, rsvp_status: next }]
    })
    await toggleGuestEvent(weddingId, guest.id, ev.id, next)
  }

  // ─── Arrival helpers ──────────────────────────────────────────

  const [arrForm, setArrForm] = useState<{
    mode: string; flight_train_no: string; arrival_time: string; pickup_required: boolean; status: string
  }>({
    mode: arr?.mode ?? 'self',
    flight_train_no: arr?.flight_train_no ?? '',
    arrival_time: arr?.arrival_time ? arr.arrival_time.slice(0, 16) : '',
    pickup_required: arr?.pickup_required ?? false,
    status: arr?.status ?? 'expected',
  })

  async function saveArrival() {
    setSaving(true)
    const res = await upsertArrival(weddingId, guest.id, {
      mode: arrForm.mode,
      flight_train_no: arrForm.flight_train_no || undefined,
      arrival_time: arrForm.arrival_time || undefined,
      pickup_required: arrForm.pickup_required,
      status: arrForm.status,
    })
    setSaving(false)
    if ('error' in res) toast.error(String(res.error))
    else toast.success('Travel info saved')
  }

  // ─── Room helpers ─────────────────────────────────────────────

  const [roomForm, setRoomForm] = useState<{ room_id: string; check_in: string; check_out: string }>({
    room_id: alloc?.room_id ?? '',
    check_in: alloc?.check_in ?? '',
    check_out: alloc?.check_out ?? '',
  })

  async function saveRoom() {
    if (!roomForm.room_id || !roomForm.check_in || !roomForm.check_out) {
      toast.error('Select room and check-in/out dates'); return
    }
    setSaving(true)
    const res = await assignRoom(weddingId, guest.id, roomForm.room_id, roomForm.check_in, roomForm.check_out)
    setSaving(false)
    if (res.error) toast.error(res.error)
    else {
      toast.success('Room assigned')
      const room = rooms.find(r => r.id === roomForm.room_id)
      setAlloc({ id: 'tmp', room_id: roomForm.room_id, check_in: roomForm.check_in, check_out: roomForm.check_out, rooms: room ? { room_number: room.room_number, type: room.type, floor: room.floor } : null })
    }
  }

  async function removeRoom() {
    setSaving(true)
    await assignRoom(weddingId, guest.id, '', '', '')
    setSaving(false)
    setAlloc(null)
    setRoomForm({ room_id: '', check_in: '', check_out: '' })
    toast.success('Room removed')
  }

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'profile', label: 'Profile',  icon: Star },
    { key: 'events',  label: 'Events',   icon: CalendarDays },
    { key: 'travel',  label: 'Travel',   icon: Plane },
    { key: 'room',    label: 'Room',     icon: BedDouble },
  ]

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-stone-100 rounded-xl mb-6 w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InlineField label="Phone" value={g.phone ?? ''} onSave={v => saveField('phone', v || null)} />
            <InlineField label="Email" value={g.email ?? ''} onSave={v => saveField('email', v || null)} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-xs text-stone-400">Side</Label>
              <Select value={g.side} onValueChange={v => saveField('side', v)}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['bride', 'groom', 'both', 'neutral'].map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-stone-400">Dietary</Label>
              <Select value={g.dietary} onValueChange={v => saveField('dietary', v)}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['veg', 'non_veg', 'jain', 'other'].map(d => (
                    <SelectItem key={d} value={d}>{d === 'non_veg' ? 'Non-Veg' : d.charAt(0).toUpperCase() + d.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-stone-400">+1 / Plus</Label>
              <Input type="number" min={0} className="mt-1 h-9 text-sm" value={g.plus_count}
                onChange={e => setG(p => ({ ...p, plus_count: parseInt(e.target.value) || 0 }))}
                onBlur={e => saveField('plus_count', parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-stone-400 flex items-center gap-1"><Utensils className="w-3 h-3" /> Dietary notes</Label>
            <InlineField label="" value={g.dietary_notes ?? ''} onSave={v => saveField('dietary_notes', v || null)} multiline />
          </div>
          <div>
            <Label className="text-xs text-stone-400 flex items-center gap-1"><StickyNote className="w-3 h-3" /> Internal notes</Label>
            <InlineField label="" value={g.notes ?? ''} onSave={v => saveField('notes', v || null)} multiline />
          </div>
          <div className="flex items-center gap-3 pt-2">
            <button onClick={() => saveField('is_vip', !g.is_vip)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${g.is_vip ? 'bg-amber-50 border-amber-200 text-amber-700' : 'border-stone-200 text-stone-500 hover:border-stone-300'}`}>
              <Star className={`w-3.5 h-3.5 ${g.is_vip ? 'fill-amber-400 text-amber-400' : ''}`} />
              {g.is_vip ? 'VIP' : 'Mark as VIP'}
            </button>
          </div>
        </div>
      )}

      {/* Events Tab */}
      {tab === 'events' && (
        <div className="space-y-2">
          <p className="text-xs text-stone-400 mb-3">Click to cycle RSVP: not invited → confirmed → pending → declined → remove</p>
          {events.length === 0 ? (
            <p className="text-stone-400 text-sm text-center py-8">No events planned yet</p>
          ) : events.map(ev => {
            const entry = getGe(ev.id)
            const status = entry?.rsvp_status ?? null
            return (
              <div key={ev.id} className="flex items-center gap-3 px-4 py-3 bg-white border border-stone-200 rounded-xl cursor-pointer hover:border-stone-300 transition-colors"
                onClick={() => cycleRsvp(ev)}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800 text-sm">{ev.name}</p>
                  <p className="text-xs text-stone-400">{new Date(ev.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${status ? RSVP_COLORS[status] : 'bg-stone-100 text-stone-400'}`}>
                  {status ?? 'not invited'}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Travel Tab */}
      {tab === 'travel' && (
        <div className="space-y-4 bg-white border border-stone-200 rounded-xl p-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Travel mode</Label>
              <Select value={arrForm.mode} onValueChange={v => setArrForm(f => ({ ...f, mode: v ?? 'self' }))}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['self', 'flight', 'train', 'bus', 'car'].map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Flight / Train no.</Label>
              <Input className="mt-1 h-9 text-sm" placeholder="e.g. 6E-302"
                value={arrForm.flight_train_no}
                onChange={e => setArrForm(f => ({ ...f, flight_train_no: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Arrival date & time</Label>
              <Input type="datetime-local" className="mt-1 h-9 text-sm"
                value={arrForm.arrival_time}
                onChange={e => setArrForm(f => ({ ...f, arrival_time: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={arrForm.status} onValueChange={v => setArrForm(f => ({ ...f, status: v ?? 'expected' }))}>
                <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['expected', 'arrived', 'no_show'].map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="pickup" checked={arrForm.pickup_required}
              onChange={e => setArrForm(f => ({ ...f, pickup_required: e.target.checked }))}
              className="rounded border-stone-300 text-rose-600" />
            <label htmlFor="pickup" className="text-sm text-stone-700">Needs pickup from airport/station</label>
          </div>
          <Button onClick={saveArrival} disabled={saving} className="bg-rose-700 hover:bg-rose-800 w-full">
            {saving ? 'Saving…' : 'Save travel info'}
          </Button>
        </div>
      )}

      {/* Room Tab */}
      {tab === 'room' && (
        <div className="space-y-4">
          {alloc && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-emerald-800">Room {alloc.rooms?.room_number}</p>
                <p className="text-xs text-emerald-600">{alloc.rooms?.type}{alloc.rooms?.floor ? `, ${alloc.rooms.floor}` : ''} · Check in {alloc.check_in} → {alloc.check_out}</p>
              </div>
              <button onClick={removeRoom} className="text-xs text-red-500 hover:underline">Remove</button>
            </div>
          )}
          <div className="bg-white border border-stone-200 rounded-xl p-5 space-y-4">
            <h3 className="font-medium text-stone-800 text-sm">{alloc ? 'Change room' : 'Assign room'}</h3>
            <div>
              <Label className="text-xs">Select room</Label>
              <Select value={roomForm.room_id} onValueChange={v => setRoomForm(f => ({ ...f, room_id: v ?? '' }))}>
                <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Choose a room…" /></SelectTrigger>
                <SelectContent>
                  {rooms.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      Room {r.room_number} · {r.type}{r.floor ? ` · ${r.floor}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Check-in date</Label>
                <Input type="date" className="mt-1 h-9 text-sm" value={roomForm.check_in}
                  onChange={e => setRoomForm(f => ({ ...f, check_in: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Check-out date</Label>
                <Input type="date" className="mt-1 h-9 text-sm" value={roomForm.check_out}
                  onChange={e => setRoomForm(f => ({ ...f, check_out: e.target.value }))} />
              </div>
            </div>
            <Button onClick={saveRoom} disabled={saving} className="bg-rose-700 hover:bg-rose-800 w-full">
              {saving ? 'Saving…' : 'Assign room'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function InlineField({ label, value, onSave, multiline = false }: {
  label: string; value: string; onSave: (v: string) => void; multiline?: boolean
}) {
  const [v, setV] = useState(value)
  const commit = () => { if (v !== value) onSave(v) }

  if (multiline) {
    return (
      <textarea value={v} onChange={e => setV(e.target.value)} onBlur={commit} rows={2}
        className="mt-1 w-full text-sm bg-white border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none" />
    )
  }

  return (
    <div>
      {label && <Label className="text-xs text-stone-400">{label}</Label>}
      <Input value={v} onChange={e => setV(e.target.value)} onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && commit()}
        className="mt-1 h-9 text-sm" />
    </div>
  )
}
