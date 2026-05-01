'use client'

import { useState, useTransition, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import {
  CalendarDays, Users, CheckSquare, Building2,
  Plus, X, ArrowRight, Check, Loader2, Sparkles,
  IndianRupee, ShoppingBag, UserPlus, ClipboardList,
  FileSpreadsheet, Download, Upload, CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createEvent } from '../events/actions'
import { createGuest } from '../guests/actions'
import { bulkCreateRooms } from '../rooms/actions'
import { createVendor } from '../vendors/actions'
import { updateWeddingDetails, inviteCoordinator } from './actions'
import { bulkImportPack, type GuestRow, type VendorRow, type BudgetRow } from '../overview/importPackActions'

// ─── Types ───────────────────────────────────────────────────────────────────

type Wedding = {
  id: string; bride_name: string; groom_name: string
  date_from: string | null; date_to: string | null; wedding_date: string | null
  primary_venue: string | null; primary_city: string | null; budget_total: number | null
  company_id: string | null
}

type AddedEvent    = { id: string; name: string; date: string; start_time: string; type: string }
type AddedGuest    = { id: string; name: string; side: string; phone: string }
type AddedRoom     = { name: string; type: string; capacity: string }
type AddedVendor   = { id: string; name: string; category: string }
type InvitedMember = { email: string; role: string }

// ─── Constants ───────────────────────────────────────────────────────────────

const CEREMONY_TEMPLATES = [
  { name: 'Ganesh Poojan', type: 'ritual',   time: '09:00' },
  { name: 'Mehandi',       type: 'ceremony', time: '11:00' },
  { name: 'Haldi',         type: 'ritual',   time: '10:00' },
  { name: 'Mayera',        type: 'ceremony', time: '11:00' },
  { name: 'Sham-e-Mehfil', type: 'party',    time: '19:00' },
  { name: 'Sangeet',       type: 'party',    time: '19:00' },
  { name: 'Sagai',         type: 'ceremony', time: '11:00' },
  { name: 'Baraat',        type: 'ceremony', time: '20:00' },
  { name: 'Pheras',        type: 'ceremony', time: '22:00' },
  { name: 'Reception',     type: 'party',    time: '19:00' },
  { name: 'Vidai',         type: 'ritual',   time: '00:00' },
]

const VENUE_SPACES = [
  { name: 'Main Lawn / Banquet',  type: 'hall',     capacity: '300' },
  { name: 'Bridal Suite',         type: 'suite',    capacity: '10'  },
  { name: "Groom's Room",         type: 'room',     capacity: '10'  },
  { name: 'Mehandi Lawn',         type: 'lawn',     capacity: '100' },
  { name: 'Haldi Area',           type: 'lawn',     capacity: '80'  },
  { name: 'Baraat Entry Gate',    type: 'entrance', capacity: '500' },
  { name: 'Dining Hall',          type: 'hall',     capacity: '200' },
  { name: 'Parking Area',         type: 'parking',  capacity: '100' },
  { name: 'Stage / Mandap',       type: 'stage',    capacity: '20'  },
]

const VENDOR_CATEGORIES = [
  'Photography', 'Videography', 'Decor', 'Catering',
  'Music / DJ', 'Mehandi', 'Makeup', 'Pandit', 'Transport',
]

const COORDINATOR_ROLES = [
  { value: 'coordinator',  label: 'Coordinator'       },
  { value: 'admin',        label: 'Admin'             },
  { value: 'hospitality',  label: 'Hospitality Team'  },
  { value: 'logistics',    label: 'Logistics Team'    },
  { value: 'fb_team',      label: 'F&B Team'          },
  { value: 'decor_team',   label: 'Decor Team'        },
  { value: 'photography',  label: 'Photography'       },
  { value: 'bride_family', label: "Bride's Family"    },
  { value: 'groom_family', label: "Groom's Family"    },
]

const TYPE_COLORS: Record<string, string> = {
  ceremony: 'bg-rose-50 text-rose-700',
  ritual:   'bg-purple-50 text-purple-700',
  party:    'bg-blue-50 text-blue-700',
  meal:     'bg-amber-50 text-amber-700',
  other:    'bg-stone-100 text-stone-600',
}

const STEPS = [
  { label: 'Event Details', icon: ClipboardList },
  { label: 'Ceremonies',    icon: CalendarDays  },
  { label: 'Venue Spaces',  icon: Building2     },
  { label: 'Guests',        icon: Users         },
  { label: 'Vendors',       icon: ShoppingBag   },
  { label: 'Team',          icon: UserPlus      },
  { label: 'Checklist',     icon: CheckSquare   },
]

// ─── Step 0: Event Details ────────────────────────────────────────────────────

function StepDetails({ weddingId, wedding, onSaved }: {
  weddingId: string
  wedding: Wedding
  onSaved: (data: { bride_name: string; groom_name: string; date_from: string; date_to: string; wedding_date: string; primary_venue: string; primary_city: string; budget_total: number }) => void
}) {
  const isPro = !wedding.groom_name  // B2C Pro: groom_name is ''
  const [form, setForm] = useState({
    bride_name:    wedding.bride_name || '',
    groom_name:    wedding.groom_name || '',
    date_from:     wedding.date_from  || '',
    date_to:       wedding.date_to    || '',
    wedding_date:  wedding.wedding_date || '',
    primary_venue: wedding.primary_venue || '',
    primary_city:  wedding.primary_city  || '',
    budget_total:  wedding.budget_total  ?? 0,
  })
  const [isPending, startTransition] = useTransition()

  function handleNext() {
    if (!form.bride_name.trim()) { toast.error('Enter event/host name'); return }
    startTransition(async () => {
      const res = await updateWeddingDetails(weddingId, {
        bride_name:    form.bride_name.trim(),
        groom_name:    form.groom_name.trim(),
        date_from:     form.date_from  || null,
        date_to:       form.date_to    || null,
        wedding_date:  form.wedding_date || form.date_to || form.date_from || null,
        primary_venue: form.primary_venue.trim() || null,
        primary_city:  form.primary_city.trim()  || null,
        budget_total:  form.budget_total,
      })
      if ('error' in res) { toast.error(res.error); return }
      onSaved({ ...form })
    })
  }

  const f = (k: keyof typeof form, v: string | number) => setForm(prev => ({ ...prev, [k]: v }))

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">{isPro ? 'Your name / host *' : "Bride's name *"}</Label>
          <Input value={form.bride_name} onChange={e => f('bride_name', e.target.value)}
            placeholder={isPro ? 'e.g. Priya Sharma' : 'e.g. Rupal'} className="mt-1 h-9" />
        </div>
        {!isPro && (
          <div>
            <Label className="text-xs">{"Groom's name"}</Label>
            <Input value={form.groom_name} onChange={e => f('groom_name', e.target.value)}
              placeholder="e.g. Gourav" className="mt-1 h-9" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Event start date</Label>
          <Input type="date" value={form.date_from}
            onChange={e => {
              f('date_from', e.target.value)
              if (!form.date_to) f('date_to', e.target.value)
              if (!form.wedding_date) f('wedding_date', e.target.value)
            }}
            className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs">Event end date</Label>
          <Input type="date" value={form.date_to}
            onChange={e => {
              f('date_to', e.target.value)
              f('wedding_date', e.target.value)
            }}
            className="mt-1 h-9" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-xs">Venue name</Label>
          <Input value={form.primary_venue} onChange={e => f('primary_venue', e.target.value)}
            placeholder="e.g. Nahargarh Palace" className="mt-1 h-9" />
        </div>
        <div>
          <Label className="text-xs">City</Label>
          <Input value={form.primary_city} onChange={e => f('primary_city', e.target.value)}
            placeholder="e.g. Sawai Madhopur" className="mt-1 h-9" />
        </div>
      </div>

      <div>
        <Label className="text-xs flex items-center gap-1"><IndianRupee className="w-3 h-3" />Total budget (₹)</Label>
        <Input type="number" value={form.budget_total || ''} onChange={e => f('budget_total', parseInt(e.target.value) || 0)}
          placeholder="e.g. 7000000" className="mt-1 h-9 max-w-xs" />
        {form.budget_total > 0 && (
          <p className="text-xs text-stone-400 mt-1">₹{Number(form.budget_total).toLocaleString('en-IN')}</p>
        )}
      </div>

      <Button onClick={handleNext} disabled={isPending} className="bg-rose-700 hover:bg-rose-800 w-full sm:w-auto">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
        Save & continue <ArrowRight className="w-4 h-4 ml-1.5" />
      </Button>
    </div>
  )
}

// ─── Step 1: Ceremonies ───────────────────────────────────────────────────────

function StepEvents({ weddingId, defaultDate, defaultVenue, defaultCity, quickDates, onAdded, added }: {
  weddingId: string; defaultDate: string; defaultVenue: string; defaultCity: string
  quickDates: { label: string; value: string }[]; onAdded: (e: AddedEvent) => void; added: AddedEvent[]
}) {
  const [adding, setAdding] = useState<{ name: string; date: string; start_time: string; type: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  function startAdd(name: string, type: string, time: string) {
    setAdding({ name, date: defaultDate, start_time: time, type })
  }

  function handleSave() {
    if (!adding?.name || !adding.date || !adding.start_time) { toast.error('Fill name, date and start time'); return }
    startTransition(async () => {
      const res = await createEvent(weddingId, {
        name: adding.name, date: adding.date, start_time: adding.start_time,
        end_time: adding.start_time, venue: defaultVenue, city: defaultCity,
        expected_count: 0, type: adding.type, notes: '',
      })
      if ('error' in res) { toast.error(res.error); return }
      onAdded({ id: res.id!, name: adding.name, date: adding.date, start_time: adding.start_time, type: adding.type })
      setAdding(null)
      toast.success(`${adding.name} added — checklist & vendors auto-updated`)
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-stone-700 mb-2">Quick-add ceremonies</p>
        <div className="flex flex-wrap gap-2">
          {CEREMONY_TEMPLATES.map(t => {
            const done = added.some(a => a.name === t.name)
            return (
              <button key={t.name} onClick={() => !done && startAdd(t.name, t.type, t.time)} disabled={done}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${done
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default'
                  : 'bg-white border-stone-200 text-stone-700 hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50'}`}>
                {done ? <><Check className="w-3 h-3 inline mr-1" />{t.name}</> : `+ ${t.name}`}
              </button>
            )
          })}
          {!adding && (
            <button onClick={() => startAdd('', 'ceremony', '')}
              className="text-sm px-3 py-1.5 rounded-lg border border-dashed border-stone-300 text-stone-500 hover:border-stone-400 transition-colors">
              + Custom
            </button>
          )}
        </div>
      </div>

      {adding && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-rose-800">Add ceremony details</p>
            <button onClick={() => setAdding(null)}><X className="w-4 h-4 text-rose-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input value={adding.name} onChange={e => setAdding(a => a ? { ...a, name: e.target.value } : a)}
                placeholder="e.g. Cocktail" className="mt-1 h-8 text-sm" autoFocus />
            </div>
            <div>
              <Label className="text-xs">Type</Label>
              <select value={adding.type} onChange={e => setAdding(a => a ? { ...a, type: e.target.value } : a)}
                className="mt-1 w-full border border-stone-200 rounded-md px-2 py-1.5 text-sm h-8">
                {['ceremony', 'ritual', 'party', 'meal', 'other'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={adding.date}
                onChange={e => setAdding(a => a ? { ...a, date: e.target.value } : a)}
                className="h-8 text-sm mt-1" />
              {quickDates.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {quickDates.map(d => (
                    <button key={d.value} type="button"
                      onClick={() => setAdding(a => a ? { ...a, date: d.value } : a)}
                      className={`text-xs px-2 py-0.5 rounded border font-medium transition-colors ${
                        adding.date === d.value ? 'bg-rose-700 border-rose-700 text-white' : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                      }`}>{d.label}</button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs">Start time</Label>
              <Input type="time" value={adding.start_time}
                onChange={e => setAdding(a => a ? { ...a, start_time: e.target.value } : a)}
                className="mt-1 h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={isPending} className="bg-rose-700 hover:bg-rose-800 h-8">
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(null)} className="h-8">Cancel</Button>
          </div>
        </div>
      )}

      {added.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Added ({added.length})</p>
          <div className="space-y-1.5">
            {added.map(ev => (
              <div key={ev.id} className="flex items-center gap-3 bg-white border border-stone-100 rounded-lg px-3 py-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[ev.type] || TYPE_COLORS.other}`}>{ev.type}</span>
                <span className="text-sm font-medium text-stone-800 flex-1">{ev.name}</span>
                <span className="text-xs text-stone-400">
                  {new Date(ev.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  {ev.start_time && ` · ${ev.start_time.slice(0, 5)}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {added.length === 0 && !adding && (
        <p className="text-xs text-stone-400 text-center py-2">Click any ceremony to add — or skip this step</p>
      )}
    </div>
  )
}

// ─── Step 2: Venue Spaces ─────────────────────────────────────────────────────

function StepVenue({ rooms, setRooms, venue }: { rooms: AddedRoom[]; setRooms: (r: AddedRoom[]) => void; venue: string }) {
  function toggle(t: { name: string; type: string; capacity: string }) {
    const exists = rooms.some(r => r.name === t.name)
    if (exists) setRooms(rooms.filter(r => r.name !== t.name))
    else setRooms([...rooms, t])
  }

  return (
    <div className="space-y-5">
      {venue && (
        <div className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-600">
          <span className="text-stone-400 text-xs">Venue:</span> <span className="font-medium">{venue}</span>
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-stone-700 mb-2">Select spaces at your venue</p>
        <div className="flex flex-wrap gap-2">
          {VENUE_SPACES.map(t => {
            const selected = rooms.some(r => r.name === t.name)
            return (
              <button key={t.name} onClick={() => toggle(t)}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${selected
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                  : 'bg-white border-stone-200 text-stone-700 hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50'}`}>
                {selected ? <><Check className="w-3 h-3 inline mr-1" /></> : '+ '}{t.name}
              </button>
            )
          })}
        </div>
      </div>
      {rooms.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Capacities</p>
          <div className="space-y-2">
            {rooms.map(r => (
              <div key={r.name} className="flex items-center gap-3 bg-white border border-stone-100 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-stone-800 flex-1">{r.name}</span>
                <Input type="number" value={r.capacity}
                  onChange={e => setRooms(rooms.map(x => x.name === r.name ? { ...x, capacity: e.target.value } : x))}
                  className="w-20 h-7 text-sm text-center" />
                <button onClick={() => setRooms(rooms.filter(x => x.name !== r.name))}>
                  <X className="w-3.5 h-3.5 text-stone-300 hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {rooms.length === 0 && (
        <p className="text-xs text-stone-400 text-center py-2">Select spaces — or skip and add later in Rooms</p>
      )}
    </div>
  )
}

// ─── Step 3: Guests ───────────────────────────────────────────────────────────

function StepGuests({ weddingId, added, onAdded }: { weddingId: string; added: AddedGuest[]; onAdded: (g: AddedGuest) => void }) {
  const [form, setForm] = useState({ name: '', phone: '', side: 'bride' })
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!form.name.trim()) { toast.error('Enter guest name'); return }
    startTransition(async () => {
      const res = await createGuest(weddingId, {
        name: form.name.trim(), phone: form.phone.trim(), email: '',
        side: form.side, is_vip: false, dietary: '', dietary_notes: '', notes: '',
        plus_count: 0, invite_group: '',
      })
      if ('error' in res) { toast.error(res.error); return }
      onAdded({ id: res.id!, name: form.name.trim(), phone: form.phone.trim(), side: form.side })
      setForm(f => ({ ...f, name: '', phone: '' }))
    })
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <Label className="text-xs">Guest name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Ramesh Sharma" className="mt-1 h-8 text-sm"
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }} />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+91 98765 43210" className="mt-1 h-8 text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Label className="text-xs text-stone-500">Side:</Label>
          {['bride', 'groom', 'both'].map(s => (
            <button key={s} onClick={() => setForm(f => ({ ...f, side: s }))}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors capitalize ${
                form.side === s ? 'bg-rose-700 border-rose-700 text-white' : 'border-stone-200 text-stone-600 hover:border-rose-200'
              }`}>{s}</button>
          ))}
        </div>
        <Button size="sm" onClick={handleAdd} disabled={isPending || !form.name.trim()} className="bg-rose-700 hover:bg-rose-800 h-8">
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Plus className="w-3.5 h-3.5 mr-1" />Add guest</>}
        </Button>
      </div>
      {added.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{added.length} added</p>
          <div className="space-y-1">
            {added.slice(-5).map(g => (
              <div key={g.id} className="flex items-center gap-3 bg-white border border-stone-100 rounded-lg px-3 py-2 text-sm">
                <span className="flex-1 font-medium text-stone-800">{g.name}</span>
                {g.phone && <span className="text-xs text-stone-400">{g.phone}</span>}
                <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${g.side === 'bride' ? 'bg-rose-50 text-rose-600' : g.side === 'groom' ? 'bg-blue-50 text-blue-600' : 'bg-stone-100 text-stone-500'}`}>{g.side}</span>
              </div>
            ))}
            {added.length > 5 && <p className="text-xs text-stone-400 text-center">+{added.length - 5} more</p>}
          </div>
        </div>
      )}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
        <p className="font-medium">Bulk CSV import available in the Guests section after setup.</p>
      </div>
    </div>
  )
}

// ─── Step 4: Vendors ──────────────────────────────────────────────────────────

function StepVendors({ weddingId, added, onAdded }: {
  weddingId: string; added: AddedVendor[]; onAdded: (v: AddedVendor) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [isPending, startTransition] = useTransition()

  const addedCats = new Set(added.map(v => v.category))

  function handleAdd() {
    if (!selected) return
    startTransition(async () => {
      const res = await createVendor(weddingId, {
        name: name.trim() || `TBD — ${selected}`,
        category: selected,
        status: 'enquired',
      })
      if ('error' in res) { toast.error(res.error); return }
      onAdded({ id: res.id!, name: name.trim() || `TBD — ${selected}`, category: selected })
      setSelected(null)
      setName('')
      toast.success(`${selected} vendor added`)
    })
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-stone-500">
        Add placeholder slots for vendors you&apos;ll need. You can fill contact details later from the Vendors section.
      </p>
      <div>
        <p className="text-sm font-medium text-stone-700 mb-2">Which vendors do you need?</p>
        <div className="flex flex-wrap gap-2">
          {VENDOR_CATEGORIES.map(cat => {
            const done = addedCats.has(cat)
            return (
              <button key={cat} onClick={() => { if (!done) setSelected(cat) }}
                disabled={done}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${done
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default'
                  : selected === cat
                    ? 'bg-rose-700 border-rose-700 text-white'
                    : 'bg-white border-stone-200 text-stone-700 hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50'}`}>
                {done ? <><Check className="w-3 h-3 inline mr-1" />{cat}</> : cat}
              </button>
            )
          })}
        </div>
      </div>

      {selected && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-medium text-rose-800">Add {selected} vendor</p>
          <div>
            <Label className="text-xs">Vendor name (optional — can fill later)</Label>
            <Input value={name} onChange={e => setName(e.target.value)} autoFocus
              placeholder={`e.g. Studio ${selected}`} className="mt-1 h-8 text-sm"
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAdd} disabled={isPending} className="bg-rose-700 hover:bg-rose-800 h-8">
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setSelected(null); setName('') }} className="h-8">Cancel</Button>
          </div>
        </div>
      )}

      {added.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{added.length} vendors added</p>
          <div className="space-y-1.5">
            {added.map(v => (
              <div key={v.id} className="flex items-center gap-3 bg-white border border-stone-100 rounded-lg px-3 py-2">
                <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">{v.category}</span>
                <span className="text-sm text-stone-700 flex-1">{v.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step 5: Team ─────────────────────────────────────────────────────────────

function StepTeam({ weddingId, companyId, userId, invited, onInvited }: {
  weddingId: string; companyId: string; userId: string
  invited: InvitedMember[]; onInvited: (m: InvitedMember) => void
}) {
  const [form, setForm] = useState({ email: '', role: 'coordinator' })
  const [isPending, startTransition] = useTransition()

  function handleInvite() {
    if (!form.email.trim()) { toast.error('Enter email'); return }
    startTransition(async () => {
      const res = await inviteCoordinator(companyId, userId, form.email, form.role, weddingId)
      if ('error' in res) { toast.error(res.error); return }
      onInvited({ email: form.email.trim().toLowerCase(), role: form.role })
      setForm(f => ({ ...f, email: '' }))
      toast.success(`Invite sent to ${form.email}`)
    })
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-stone-500">
        Invite coordinators, family members or assistants to help manage this event.
        They&apos;ll get an email to join.
      </p>
      <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <Label className="text-xs">Email address</Label>
            <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="e.g. dilip@family.com" className="mt-1 h-8 text-sm" type="email"
              onKeyDown={e => { if (e.key === 'Enter') handleInvite() }} />
          </div>
          <div>
            <Label className="text-xs">Role</Label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="mt-1 w-full border border-stone-200 rounded-md px-2 py-1.5 text-sm h-8">
              {COORDINATOR_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>
        </div>
        <Button size="sm" onClick={handleInvite} disabled={isPending || !form.email.trim()} className="bg-rose-700 hover:bg-rose-800 h-8">
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><UserPlus className="w-3.5 h-3.5 mr-1" />Send invite</>}
        </Button>
      </div>

      {invited.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{invited.length} invited</p>
          <div className="space-y-1">
            {invited.map((m, i) => (
              <div key={i} className="flex items-center gap-3 bg-white border border-stone-100 rounded-lg px-3 py-2 text-sm">
                <span className="flex-1 text-stone-700">{m.email}</span>
                <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full capitalize">{m.role}</span>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-stone-400">You can add more team members later from Settings → Team.</p>
    </div>
  )
}

// ─── Step 6: Checklist summary ────────────────────────────────────────────────

function StepChecklist({ eventsAdded, vendorsAdded }: { eventsAdded: AddedEvent[]; vendorsAdded: AddedVendor[] }) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-stone-200 rounded-xl p-5 text-center">
        <Sparkles className="w-8 h-8 text-rose-400 mx-auto mb-3" />
        <p className="font-semibold text-stone-800">Ready to load your checklist</p>
        <p className="text-stone-500 text-sm mt-1 max-w-xs mx-auto">
          A complete checklist will be loaded. Ceremony-specific tasks are already seeded from your functions.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {['Venue booking', 'Catering', 'Photography', 'Invites', 'Decor', 'Bridal wear', 'Jewellery', 'Music & DJ', 'Accommodation'].map(cat => (
          <div key={cat} className="text-xs bg-stone-50 border border-stone-100 text-stone-500 rounded-lg px-2 py-2 text-center">{cat}</div>
        ))}
      </div>

      {/* Setup summary */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-2 text-sm">
        <p className="font-semibold text-emerald-800 mb-1">Setup summary</p>
        {eventsAdded.length > 0 && (
          <div className="flex items-center gap-2 text-emerald-700">
            <Check className="w-3.5 h-3.5" />
            <span>{eventsAdded.length} ceremonies added — checklist tasks & vendor slots auto-created</span>
          </div>
        )}
        {vendorsAdded.length > 0 && (
          <div className="flex items-center gap-2 text-emerald-700">
            <Check className="w-3.5 h-3.5" />
            <span>{vendorsAdded.length} vendor placeholders added — fill contact details from Vendors</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-emerald-700">
          <Check className="w-3.5 h-3.5" />
          <span>Date-relative reminders seeded across checklist</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function SetupWizardClient({ weddingId, wedding, defaultDate, quickDates, companyId, userId }: {
  weddingId: string; wedding: Wedding; defaultDate: string
  quickDates: { label: string; value: string }[]
  companyId: string; userId: string
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()

  // Step 0 saved state — flows into subsequent steps
  const [savedDetails, setSavedDetails] = useState({
    bride_name:    wedding.bride_name,
    groom_name:    wedding.groom_name,
    date_from:     wedding.date_from || defaultDate,
    date_to:       wedding.date_to   || defaultDate,
    wedding_date:  wedding.wedding_date || defaultDate,
    primary_venue: wedding.primary_venue || '',
    primary_city:  wedding.primary_city  || '',
    budget_total:  wedding.budget_total  ?? 0,
  })

  const [addedEvents,  setAddedEvents]  = useState<AddedEvent[]>([])
  const [rooms,        setRooms]        = useState<AddedRoom[]>([])
  const [addedGuests,  setAddedGuests]  = useState<AddedGuest[]>([])
  const [addedVendors, setAddedVendors] = useState<AddedVendor[]>([])
  const [invitedTeam,  setInvitedTeam]  = useState<InvitedMember[]>([])
  // Excel fork state (shown after step 1 — ceremonies)
  const [excelFork,    setExcelFork]    = useState(false)
  const [xlParsed,     setXlParsed]     = useState<{ guests: GuestRow[]; vendors: VendorRow[]; budget: BudgetRow[] } | null>(null)
  const [xlFileName,   setXlFileName]   = useState('')
  const [xlImporting,  setXlImporting]  = useState(false)
  const [xlDone,       setXlDone]       = useState(false)
  const xlFileRef = useRef<HTMLInputElement>(null)

  const isLast = step === STEPS.length - 1

  // ── Excel fork helpers ───────────────────────────────────────────────────────
  function parseXlsx(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), { type: 'array' })
        const gs = wb.Sheets[wb.SheetNames.find(n => n.toLowerCase().includes('guest')) ?? '']
        const vs = wb.Sheets[wb.SheetNames.find(n => n.toLowerCase().includes('vendor')) ?? '']
        const bs = wb.Sheets[wb.SheetNames.find(n => n.toLowerCase().includes('budget')) ?? '']
        const toRows = (ws: XLSX.WorkSheet) => ws ? XLSX.utils.sheet_to_json<Record<string, string | number>>(ws, { defval: '' }) : []
        const gRows = toRows(gs).filter((r: Record<string, string | number>) => String(r['Name'] || r['Name *'] || '').trim()).map((r: Record<string, string | number>) => ({
          name: String(r['Name'] || r['Name *'] || ''), phone: String(r['Phone'] || ''), email: String(r['Email'] || ''),
          side: String(r['Side'] || 'Both'), is_vip: ['yes','1','true'].includes(String(r['VIP'] || 'no').toLowerCase()),
          dietary: String(r['Dietary'] || 'Veg').toLowerCase().replace(/[\s-]/g, '_'),
          dietary_notes: String(r['Dietary Notes'] || ''), family_group: String(r['Family Group'] || ''), notes: String(r['Notes'] || ''),
        })) as GuestRow[]
        const vRows = toRows(vs).filter((r: Record<string, string | number>) => String(r['Vendor Name'] || r['Vendor Name *'] || '').trim()).map((r: Record<string, string | number>) => ({
          category: String(r['Category'] || r['Category *'] || ''), name: String(r['Vendor Name'] || r['Vendor Name *'] || ''),
          contact_name: String(r['Contact Person'] || ''), phone: String(r['Phone'] || ''), email: String(r['Email'] || ''),
          status: String(r['Status'] || 'Enquired'), total_amount: Number(String(r['Total Amount (₹)'] ?? r['Total Amount'] ?? '0').replace(/[₹,\s]/g, '')) || 0,
          paid_amount: Number(String(r['Advance Paid (₹)'] ?? r['Advance Paid'] ?? '0').replace(/[₹,\s]/g, '')) || 0, notes: String(r['Notes'] || ''),
        })) as VendorRow[]
        const bRows = toRows(bs).filter((r: Record<string, string | number>) => String(r['Item'] || r['Item *'] || '').trim()).map((r: Record<string, string | number>) => ({
          category: String(r['Category'] || r['Category *'] || ''), item: String(r['Item'] || r['Item *'] || ''),
          estimated: Number(String(r['Estimated (₹)'] ?? r['Estimated'] ?? '0').replace(/[₹,\s]/g, '')) || 0,
          actual: Number(String(r['Actual (₹)'] ?? r['Actual'] ?? '0').replace(/[₹,\s]/g, '')) || 0,
          vendor_name: String(r['Vendor Name'] || ''), notes: String(r['Notes'] || ''),
        })) as BudgetRow[]
        setXlParsed({ guests: gRows, vendors: vRows, budget: bRows })
        setXlFileName(file.name)
      } catch { toast.error('Could not read file — use the .xlsx template') }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleXlDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f?.name.endsWith('.xlsx')) parseXlsx(f)
    else toast.error('Drop a .xlsx file')
  }, [])

  async function handleXlImport() {
    if (!xlParsed) return
    setXlImporting(true)
    const res = await bulkImportPack(weddingId, xlParsed.guests, xlParsed.vendors, xlParsed.budget)
    setXlImporting(false)
    if ('error' in res) { toast.error(res.error); return }
    setXlDone(true)
    const total = res.guests.imported + res.vendors.imported + res.budget.imported
    toast.success(`${total} records imported — skipping to final step!`)
    setTimeout(() => { setExcelFork(false); setStep(6) }, 1200)
  }

  // Derive quick dates from saved details
  const derivedQuickDates: { label: string; value: string }[] = quickDates.length > 0 ? quickDates : (() => {
    const from = savedDetails.date_from, to = savedDetails.date_to || savedDetails.date_from
    if (!from) return []
    const result: { label: string; value: string }[] = []
    const cur = new Date(from + 'T00:00:00'), end = new Date((to) + 'T00:00:00')
    while (cur <= end) {
      result.push({ label: cur.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), value: cur.toISOString().slice(0, 10) })
      cur.setDate(cur.getDate() + 1)
    }
    return result
  })()

  const eventTitle = savedDetails.groom_name
    ? `${savedDetails.bride_name} & ${savedDetails.groom_name}`
    : savedDetails.bride_name || 'Your Event'

  async function handleFinish() {
    startTransition(async () => {
      if (rooms.length > 0) {
        await bulkCreateRooms(weddingId, rooms.map(r => ({
          room_number: r.name, type: r.type, capacity: parseInt(r.capacity) || 0, floor: null, notes: null,
        })))
      }
      try { await fetch(`/api/weddings/${weddingId}/load-template`, { method: 'POST' }) } catch { /* best-effort */ }
      toast.success('Setup complete! Your dashboard is ready.')
      router.push(`/weddings/${weddingId}/overview`)
    })
  }

  const STEP_TITLES = [
    'Event details',
    'Which ceremonies are you hosting?',
    'What spaces does your venue have?',
    'Add your first guests',
    'Which vendors do you need?',
    'Invite your team',
    'Set up your checklist',
  ]

  const STEP_SUBTITLES = [
    "This info flows into all other steps — you won't need to re-enter it.",
    `Dates are pre-filled from your event dates. Add all ceremonies now — checklist tasks auto-generate for each.`,
    `Spaces at ${savedDetails.primary_venue || 'your venue'} — helps with seating, rooms and vendor allocation.`,
    'Start building your guest list. You can import a CSV later.',
    'Add vendor placeholders now — fill contact details anytime from the Vendors section.',
    'Invite coordinators or family members. They can manage specific parts of the event.',
    'A full checklist will load with ceremony-specific tasks already seeded.',
  ]

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-4 sm:px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-stone-900">{eventTitle} — Setup</h1>
          <p className="text-xs text-stone-400 mt-0.5">Step {step + 1} of {STEPS.length} · Skip any step you want</p>
        </div>
        <button onClick={() => router.push(`/weddings/${weddingId}/overview`)}
          className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
          Skip all → dashboard
        </button>
      </div>

      {/* Progress */}
      <div className="bg-white border-b border-stone-100 px-4 sm:px-8 py-3 overflow-x-auto">
        <div className="flex items-center gap-0 min-w-max">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const done = i < step, active = i === step
            return (
              <div key={s.label} className="flex items-center">
                <div className={`flex items-center gap-1.5 ${active ? 'text-rose-700' : done ? 'text-emerald-600' : 'text-stone-300'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    done ? 'bg-emerald-100' : active ? 'bg-rose-100' : 'bg-stone-100'
                  }`}>
                    {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs font-medium hidden sm:block whitespace-nowrap">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-6 sm:w-8 h-px mx-1 sm:mx-2 flex-shrink-0 ${i < step ? 'bg-emerald-300' : 'bg-stone-200'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-stone-900">
              {excelFork ? 'Set up guests, vendors & budget' : STEP_TITLES[step]}
            </h2>
            <p className="text-stone-500 text-sm mt-1">
              {excelFork
                ? 'Download the personalized Excel pack → fill it in → upload once. Or continue manually step by step.'
                : STEP_SUBTITLES[step]}
            </p>
          </div>

          <div className={`bg-white border border-stone-200 rounded-2xl p-6 ${step === 0 ? '' : ''}`}>
            {step === 0 && (
              <StepDetails weddingId={weddingId} wedding={wedding} onSaved={d => { setSavedDetails(d); setStep(1) }} />
            )}

            {/* ── Excel fork ── shown between step 1 and step 2 ── */}
            {excelFork && (
              <div className="space-y-5">
                {xlDone ? (
                  <div className="py-6 text-center space-y-3">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                    <p className="text-base font-semibold text-stone-800">Import complete — taking you to the final step!</p>
                  </div>
                ) : xlParsed ? (
                  /* Preview */
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-stone-700">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="font-medium">{xlFileName}</span>
                      </div>
                      <button onClick={() => { setXlParsed(null); setXlFileName('') }} className="text-stone-400 hover:text-stone-600"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Guests', count: xlParsed.guests.length, color: 'bg-rose-50 text-rose-700' },
                        { label: 'Vendors', count: xlParsed.vendors.length, color: 'bg-blue-50 text-blue-700' },
                        { label: 'Budget items', count: xlParsed.budget.length, color: 'bg-emerald-50 text-emerald-700' },
                      ].map(({ label, count, color }) => (
                        <div key={label} className={`rounded-xl p-3 text-center ${color}`}>
                          <p className="text-xl font-bold">{count}</p>
                          <p className="text-xs font-medium">{label}</p>
                        </div>
                      ))}
                    </div>
                    <Button onClick={handleXlImport} disabled={xlImporting} className="w-full bg-rose-700 hover:bg-rose-800">
                      {xlImporting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Importing…</> : `Import all ${xlParsed.guests.length + xlParsed.vendors.length + xlParsed.budget.length} rows →`}
                    </Button>
                    <button onClick={() => { setExcelFork(false); setStep(2) }} className="w-full text-xs text-stone-400 hover:text-stone-600 text-center py-1">
                      Or skip this and fill manually instead →
                    </button>
                  </div>
                ) : (
                  /* Download + Upload */
                  <div className="space-y-4">
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                      <p className="text-sm font-semibold text-rose-800 mb-0.5">Your personalized pack is ready</p>
                      <p className="text-xs text-rose-600">Pre-filled with vendor suggestions for your ceremonies. Download → fill in Excel → upload once.</p>
                    </div>
                    <a
                      href={`/api/weddings/${weddingId}/import/template`}
                      download
                      className="flex items-center justify-between w-full bg-stone-900 hover:bg-stone-700 text-white rounded-xl px-4 py-3 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="w-5 h-5 text-stone-400 group-hover:text-white" />
                        <div>
                          <p className="text-sm font-semibold">Download personalized pack</p>
                          <p className="text-xs text-stone-400">Guests · Vendors (pre-filled) · Budget · Sample data</p>
                        </div>
                      </div>
                      <Download className="w-4 h-4 text-stone-400" />
                    </a>
                    <div
                      onDragOver={e => e.preventDefault()}
                      onDrop={handleXlDrop}
                      onClick={() => xlFileRef.current?.click()}
                      className="border-2 border-dashed border-stone-200 hover:border-stone-300 rounded-xl p-6 text-center cursor-pointer transition-colors hover:bg-stone-50"
                    >
                      <Upload className="w-7 h-7 text-stone-300 mx-auto mb-2" />
                      <p className="text-sm font-medium text-stone-600">Upload the filled file</p>
                      <p className="text-xs text-stone-400 mt-0.5">Drag & drop or click — .xlsx only</p>
                      <input ref={xlFileRef} type="file" accept=".xlsx" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) parseXlsx(f); if (xlFileRef.current) xlFileRef.current.value = '' }} />
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button onClick={() => { setExcelFork(false); setStep(2) }}
                        className="flex-1 text-sm text-stone-500 hover:text-stone-800 border border-stone-200 rounded-lg py-2.5 transition-colors">
                        ← Fill manually instead
                      </button>
                    </div>
                    <p className="text-xs text-center text-stone-400">Safe to re-upload anytime — nothing gets deleted</p>
                  </div>
                )}
              </div>
            )}

            {step === 1 && !excelFork && (
              <StepEvents
                weddingId={weddingId}
                defaultDate={savedDetails.date_from || derivedQuickDates[0]?.value || ''}
                defaultVenue={savedDetails.primary_venue}
                defaultCity={savedDetails.primary_city}
                quickDates={derivedQuickDates}
                added={addedEvents}
                onAdded={e => setAddedEvents(prev => [...prev, e])}
              />
            )}

            {step === 2 && <StepVenue rooms={rooms} setRooms={setRooms} venue={savedDetails.primary_venue} />}
            {step === 3 && <StepGuests weddingId={weddingId} added={addedGuests} onAdded={g => setAddedGuests(prev => [...prev, g])} />}
            {step === 4 && <StepVendors weddingId={weddingId} added={addedVendors} onAdded={v => setAddedVendors(prev => [...prev, v])} />}
            {step === 5 && (
              <StepTeam
                weddingId={weddingId}
                companyId={companyId}
                userId={userId}
                invited={invitedTeam}
                onInvited={m => setInvitedTeam(prev => [...prev, m])}
              />
            )}
            {step === 6 && <StepChecklist eventsAdded={addedEvents} vendorsAdded={addedVendors} />}
          </div>

          {/* Nav — Step 0 has its own Save & Continue button */}
          {step > 0 && !excelFork && (
            <div className="flex items-center justify-between mt-6">
              <Button variant="outline" onClick={() => setStep(s => s - 1)}>← Back</Button>
              <div className="flex items-center gap-3">
                {!isLast && (
                  <button onClick={() => setStep(s => s + 1)} className="text-sm text-stone-400 hover:text-stone-600">
                    Skip →
                  </button>
                )}
                <Button
                  onClick={isLast ? handleFinish : step === 1 ? () => setExcelFork(true) : () => setStep(s => s + 1)}
                  disabled={isPending}
                  className="bg-rose-700 hover:bg-rose-800"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                  {isLast ? 'Finish setup' : step === 1 ? <>Continue <ArrowRight className="w-4 h-4 ml-1.5" /></> : <>Next <ArrowRight className="w-4 h-4 ml-1.5" /></>}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
