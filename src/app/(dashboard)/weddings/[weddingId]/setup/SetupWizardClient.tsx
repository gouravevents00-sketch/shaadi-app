'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  CalendarDays, Users, CheckSquare, Building2,
  Plus, Trash2, ArrowRight, Check, Loader2, X, Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createEvent } from '../events/actions'
import { createGuest } from '../guests/actions'
import { bulkCreateRooms } from '../rooms/actions'

// ─── Types ──────────────────────────────────────────────────────────

type Wedding = {
  id: string; bride_name: string; groom_name: string
  date_from: string | null; date_to: string | null; wedding_date: string | null
  primary_venue: string | null; primary_city: string | null
}

type AddedEvent = { id: string; name: string; date: string; start_time: string; type: string }
type AddedGuest = { id: string; name: string; side: string; phone: string }
type AddedRoom  = { name: string; type: string; capacity: string }

// ─── Constants ──────────────────────────────────────────────────────

const CEREMONY_TEMPLATES = [
  { name: 'Ganesh Poojan', type: 'ritual',    time: '09:00' },
  { name: 'Mehandi',       type: 'ceremony',  time: '11:00' },
  { name: 'Haldi',         type: 'ritual',    time: '10:00' },
  { name: 'Mayera',        type: 'ceremony',  time: '11:00' },
  { name: 'Sham-e-Mehfil', type: 'party',     time: '19:00' },
  { name: 'Sagai',         type: 'ceremony',  time: '11:00' },
  { name: 'Baraat',        type: 'ceremony',  time: '20:00' },
  { name: 'Pheras',        type: 'ceremony',  time: '22:00' },
  { name: 'Reception',     type: 'party',     time: '19:00' },
  { name: 'Vidai',         type: 'ritual',    time: '00:00' },
]

const VENUE_SPACE_TEMPLATES = [
  { name: 'Main Lawn / Banquet',   type: 'hall',     capacity: '300' },
  { name: 'Bridal Suite',          type: 'suite',    capacity: '10'  },
  { name: 'Groom\'s Room',         type: 'room',     capacity: '10'  },
  { name: 'Mehandi Lawn',          type: 'lawn',     capacity: '100' },
  { name: 'Haldi Area',            type: 'lawn',     capacity: '80'  },
  { name: 'Baraat Entry Gate',     type: 'entrance', capacity: '500' },
  { name: 'Dining Hall',           type: 'hall',     capacity: '200' },
  { name: 'Parking Area',          type: 'parking',  capacity: '100' },
  { name: 'Stage / Mandap',        type: 'stage',    capacity: '20'  },
]

const TYPE_COLORS: Record<string, string> = {
  ceremony: 'bg-rose-50 text-rose-700',
  ritual:   'bg-purple-50 text-purple-700',
  party:    'bg-blue-50 text-blue-700',
  meal:     'bg-amber-50 text-amber-700',
  other:    'bg-stone-100 text-stone-600',
}

const STEPS = [
  { label: 'Ceremonies',     icon: CalendarDays },
  { label: 'Venue Spaces',   icon: Building2   },
  { label: 'Guest List',     icon: Users       },
  { label: 'Checklist',      icon: CheckSquare },
]

// ─── Step 1: Ceremonies ─────────────────────────────────────────────

function StepEvents({ weddingId, defaultDate, defaultVenue, defaultCity, quickDates, onAdded, added }: {
  weddingId: string
  defaultDate: string
  defaultVenue: string
  defaultCity: string
  quickDates: { label: string; value: string }[]
  onAdded: (e: AddedEvent) => void
  added: AddedEvent[]
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
      toast.success(`${adding.name} added`)
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium text-stone-700 mb-2">Quick-add common ceremonies</p>
        <div className="flex flex-wrap gap-2">
          {CEREMONY_TEMPLATES.map(t => {
            const alreadyAdded = added.some(a => a.name === t.name)
            return (
              <button key={t.name}
                onClick={() => !alreadyAdded && startAdd(t.name, t.type, t.time)}
                disabled={alreadyAdded}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  alreadyAdded
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default'
                    : 'bg-white border-stone-200 text-stone-700 hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50'
                }`}>
                {alreadyAdded ? <><Check className="w-3 h-3 inline mr-1" />{t.name}</> : `+ ${t.name}`}
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

      {/* Inline add form */}
      {adding && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-rose-800">Add ceremony details</p>
            <button onClick={() => setAdding(null)}><X className="w-4 h-4 text-rose-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Ceremony name</Label>
              <Input value={adding.name} onChange={e => setAdding(a => a ? { ...a, name: e.target.value } : a)}
                placeholder="e.g. Mehandi" className="mt-1 h-8 text-sm" autoFocus />
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
              <div className="relative mt-1">
                <Input type="date" value={adding.date}
                  onChange={e => setAdding(a => a ? { ...a, date: e.target.value } : a)}
                  className="h-8 text-sm" />
                {quickDates.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {quickDates.map(d => (
                      <button key={d.value} type="button"
                        onClick={() => setAdding(a => a ? { ...a, date: d.value } : a)}
                        className={`text-xs px-2 py-0.5 rounded border font-medium transition-colors ${
                          adding.date === d.value
                            ? 'bg-rose-700 border-rose-700 text-white'
                            : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                        }`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <Label className="text-xs">Start time</Label>
              <Input type="time" value={adding.start_time}
                onChange={e => setAdding(a => a ? { ...a, start_time: e.target.value } : a)}
                className="mt-1 h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={isPending}
              className="bg-rose-700 hover:bg-rose-800 h-8">
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Add'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAdding(null)} className="h-8">Cancel</Button>
          </div>
        </div>
      )}

      {/* Added list */}
      {added.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Added ({added.length})</p>
          <div className="space-y-1.5">
            {added.map(ev => (
              <div key={ev.id} className="flex items-center gap-3 bg-white border border-stone-100 rounded-lg px-3 py-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[ev.type] || TYPE_COLORS.other}`}>
                  {ev.type}
                </span>
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
        <p className="text-xs text-stone-400 text-center py-2">Click any ceremony above to add it — or skip this step</p>
      )}
    </div>
  )
}

// ─── Step 2: Venue Spaces ───────────────────────────────────────────

function StepVenue({ rooms, setRooms, venue }: {
  rooms: AddedRoom[]
  setRooms: (r: AddedRoom[]) => void
  venue: string
}) {
  function toggle(t: { name: string; type: string; capacity: string }) {
    const exists = rooms.some(r => r.name === t.name)
    if (exists) setRooms(rooms.filter(r => r.name !== t.name))
    else setRooms([...rooms, t])
  }

  function updateCapacity(name: string, val: string) {
    setRooms(rooms.map(r => r.name === name ? { ...r, capacity: val } : r))
  }

  return (
    <div className="space-y-5">
      {venue && (
        <div className="bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-600">
          <span className="text-stone-400 text-xs">Venue:</span> <span className="font-medium">{venue}</span>
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-stone-700 mb-2">Select venue spaces</p>
        <div className="flex flex-wrap gap-2">
          {VENUE_SPACE_TEMPLATES.map(t => {
            const selected = rooms.some(r => r.name === t.name)
            return (
              <button key={t.name} onClick={() => toggle(t)}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  selected
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-white border-stone-200 text-stone-700 hover:border-rose-300 hover:text-rose-700 hover:bg-rose-50'
                }`}>
                {selected ? <><Check className="w-3 h-3 inline mr-1" /></> : '+ '}{t.name}
              </button>
            )
          })}
        </div>
      </div>

      {rooms.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Set capacities</p>
          <div className="space-y-2">
            {rooms.map(r => (
              <div key={r.name} className="flex items-center gap-3 bg-white border border-stone-100 rounded-lg px-3 py-2">
                <span className="text-sm font-medium text-stone-800 flex-1">{r.name}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-stone-400">Capacity</span>
                  <Input type="number" value={r.capacity}
                    onChange={e => updateCapacity(r.name, e.target.value)}
                    className="w-20 h-7 text-sm text-center" />
                </div>
                <button onClick={() => setRooms(rooms.filter(x => x.name !== r.name))}>
                  <X className="w-3.5 h-3.5 text-stone-300 hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {rooms.length === 0 && (
        <p className="text-xs text-stone-400 text-center py-2">Select spaces above — or skip and add them later in Rooms section</p>
      )}
    </div>
  )
}

// ─── Step 3: Guest List ─────────────────────────────────────────────

function StepGuests({ weddingId, added, onAdded }: {
  weddingId: string
  added: AddedGuest[]
  onAdded: (g: AddedGuest) => void
}) {
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
      toast.success('Guest added')
    })
  }

  return (
    <div className="space-y-5">
      <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-stone-700">Add guests one by one</p>
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
        <div className="flex items-center gap-4">
          <Label className="text-xs text-stone-500">Side:</Label>
          {['bride', 'groom', 'both'].map(s => (
            <button key={s} onClick={() => setForm(f => ({ ...f, side: s }))}
              className={`text-xs px-3 py-1 rounded-full border font-medium transition-colors capitalize ${
                form.side === s ? 'bg-rose-700 border-rose-700 text-white' : 'border-stone-200 text-stone-600 hover:border-rose-200'
              }`}>
              {s}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={handleAdd} disabled={isPending || !form.name.trim()}
          className="bg-rose-700 hover:bg-rose-800 h-8">
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Plus className="w-3.5 h-3.5 mr-1" />Add guest</>}
        </Button>
      </div>

      {added.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{added.length} guests added</p>
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
        <p className="font-medium mb-0.5">Bulk import coming soon</p>
        <p>You can add all guests manually here, or skip and import a CSV later from the Guests section.</p>
      </div>
    </div>
  )
}

// ─── Step 4: Checklist ──────────────────────────────────────────────

function StepChecklist({ weddingId, eventsAdded }: { weddingId: string; eventsAdded: AddedEvent[] }) {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-stone-200 rounded-xl p-5 text-center">
        <Sparkles className="w-8 h-8 text-rose-400 mx-auto mb-3" />
        <p className="font-semibold text-stone-800">Ready to load your checklist</p>
        <p className="text-stone-500 text-sm mt-1 max-w-xs mx-auto">
          The checklist template has 45 tasks across 9 categories. Click Finish — it will load automatically.
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['Venue booking', 'Catering', 'Photography', 'Invites', 'Decor', 'Bridal wear', 'Jewelry', 'Music & DJ', 'Accommodation'].map(cat => (
          <div key={cat} className="text-xs bg-stone-50 border border-stone-100 text-stone-500 rounded-lg px-2 py-2 text-center">{cat}</div>
        ))}
      </div>
      {eventsAdded.length > 0 && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs text-emerald-700">
          <Check className="w-3.5 h-3.5 inline mr-1" />
          Due dates in checklist will be based on your {eventsAdded.length} ceremony dates
        </div>
      )}
    </div>
  )
}

// ─── Main Wizard ────────────────────────────────────────────────────

export default function SetupWizardClient({ weddingId, wedding, defaultDate, quickDates }: {
  weddingId: string
  wedding: Wedding
  defaultDate: string
  quickDates: { label: string; value: string }[]
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [isPending, startTransition] = useTransition()

  const [addedEvents, setAddedEvents]   = useState<AddedEvent[]>([])
  const [rooms, setRooms]               = useState<AddedRoom[]>([])
  const [addedGuests, setAddedGuests]   = useState<AddedGuest[]>([])

  const isLast = step === STEPS.length - 1

  async function handleFinish() {
    startTransition(async () => {
      // Save venue rooms
      if (rooms.length > 0) {
        await bulkCreateRooms(weddingId, rooms.map(r => ({
          room_number: r.name,
          type: r.type,
          capacity: parseInt(r.capacity) || 0,
          floor: null,
          notes: null,
        })))
      }

      // Load checklist template
      try {
        await fetch(`/api/weddings/${weddingId}/load-template`, { method: 'POST' })
      } catch { /* template load is best-effort */ }

      toast.success('Wedding setup complete!')
      router.push(`/weddings/${weddingId}/overview`)
    })
  }

  function handleSkipAll() {
    router.push(`/weddings/${weddingId}/overview`)
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-stone-200 px-4 sm:px-8 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-stone-900">
            {wedding.bride_name} &amp; {wedding.groom_name} — Wedding Setup
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">Step {step + 1} of {STEPS.length} · Set up the basics, skip what you want</p>
        </div>
        <button onClick={handleSkipAll} className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
          Skip all → go to dashboard
        </button>
      </div>

      {/* Progress steps */}
      <div className="bg-white border-b border-stone-100 px-4 sm:px-8 py-3">
        <div className="flex items-center gap-0 max-w-lg">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const done = i < step
            const active = i === step
            return (
              <div key={s.label} className="flex items-center flex-1">
                <div className={`flex items-center gap-1.5 ${active ? 'text-rose-700' : done ? 'text-emerald-600' : 'text-stone-300'}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    done ? 'bg-emerald-100' : active ? 'bg-rose-100' : 'bg-stone-100'
                  }`}>
                    {done ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-px mx-2 ${i < step ? 'bg-emerald-300' : 'bg-stone-200'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-stone-900">
              {step === 0 && 'Which ceremonies are you hosting?'}
              {step === 1 && 'What spaces does your venue have?'}
              {step === 2 && 'Add your first guests'}
              {step === 3 && 'Set up your checklist'}
            </h2>
            <p className="text-stone-500 text-sm mt-1">
              {step === 0 && 'Add all ceremonies — dates are pre-filled from your wedding dates. Adjust timing as needed.'}
              {step === 1 && `Spaces at ${wedding.primary_venue || 'your venue'} — helps with seating, rooms and vendor allocation.`}
              {step === 2 && 'Start building your guest list. You can also add more later or import a CSV.'}
              {step === 3 && 'A complete 45-task checklist will be loaded. You can customize it after setup.'}
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-2xl p-6">
            {step === 0 && (
              <StepEvents
                weddingId={weddingId}
                defaultDate={defaultDate}
                defaultVenue={wedding.primary_venue ?? ''}
                defaultCity={wedding.primary_city ?? ''}
                quickDates={quickDates}
                added={addedEvents}
                onAdded={e => setAddedEvents(prev => [...prev, e])}
              />
            )}
            {step === 1 && (
              <StepVenue rooms={rooms} setRooms={setRooms} venue={wedding.primary_venue ?? ''} />
            )}
            {step === 2 && (
              <StepGuests weddingId={weddingId} added={addedGuests} onAdded={g => setAddedGuests(prev => [...prev, g])} />
            )}
            {step === 3 && (
              <StepChecklist weddingId={weddingId} eventsAdded={addedEvents} />
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            <Button variant="outline" onClick={() => step === 0 ? handleSkipAll() : setStep(s => s - 1)}>
              {step === 0 ? 'Skip setup' : '← Back'}
            </Button>
            <div className="flex items-center gap-3">
              {!isLast && (
                <button onClick={() => setStep(s => s + 1)} className="text-sm text-stone-400 hover:text-stone-600">
                  Skip this step →
                </button>
              )}
              <Button
                onClick={isLast ? handleFinish : () => setStep(s => s + 1)}
                disabled={isPending}
                className="bg-rose-700 hover:bg-rose-800"
              >
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                {isLast ? 'Finish setup' : <>Next <ArrowRight className="w-4 h-4 ml-1.5" /></>}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
