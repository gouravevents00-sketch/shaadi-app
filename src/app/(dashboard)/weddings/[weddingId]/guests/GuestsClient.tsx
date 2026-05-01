'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Users, Search, Star, Link2, MessageCircle, Copy, ExternalLink, ScanLine, CheckCircle2 } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import { createGuest, updateGuest, deleteGuest, checkInGuest } from './actions'
import { assignGuestToEvent, unassignGuestFromEvent } from './assignActions'
import GuestImport from './GuestImport'

interface Wedding {
  bride_name: string
  groom_name: string
  wedding_date: string | null
  primary_city: string | null
}

interface Event {
  id: string
  name: string
  date: string
  start_time: string
  type: string
}

interface GuestEvent {
  guest_id: string
  event_id: string
  rsvp_status: string
}

interface Guest {
  id: string
  name: string
  phone: string | null
  email: string | null
  side: string
  is_vip: boolean
  dietary: string
  dietary_notes: string | null
  notes: string | null
  rsvp_token: string
  plus_count: number
  rsvp_submitted_at: string | null
  arrival_mode: string | null
  needs_pickup: boolean
  family_group: string | null
  checked_in_at: string | null
}

const SIDE_LABELS: Record<string, string> = {
  bride: 'Bride', groom: 'Groom', both: 'Both', shared: 'Shared', neutral: 'Neutral'
}
const DIETARY_LABELS: Record<string, string> = {
  veg: 'Veg', non_veg: 'Non-Veg', jain: 'Jain', other: 'Other'
}
const SIDE_COLORS: Record<string, string> = {
  bride: 'bg-pink-50 text-pink-700',
  groom: 'bg-blue-50 text-blue-700',
  both: 'bg-purple-50 text-purple-700',
  shared: 'bg-stone-100 text-stone-600',
  neutral: 'bg-stone-100 text-stone-500',
}

const INVITE_GROUPS = [
  { value: 'all',        label: 'All functions',    desc: 'Invited to every event' },
  { value: 'main_venue', label: 'Main venue only',  desc: 'All events at the primary venue' },
  { value: 'main_day',   label: 'Main day only',    desc: 'Events on the wedding date only' },
  { value: 'reception',  label: 'Reception / Sagai',desc: 'Last event only' },
  { value: 'custom',     label: 'Custom',           desc: 'Assign events manually' },
]

const empty = {
  name: '', phone: '', email: '', side: 'both',
  is_vip: false, dietary: 'veg', dietary_notes: '', notes: '',
  plus_count: 0, invite_group: 'all', family_group: '',
}

export default function GuestsClient({ weddingId, wedding, initialGuests, events, guestEvents: initialGuestEvents }: {
  weddingId: string
  wedding: Wedding
  initialGuests: Guest[]
  events: Event[]
  guestEvents: GuestEvent[]
}) {
  const [guests, setGuests] = useState<Guest[]>(initialGuests)
  const [guestEvents, setGuestEvents] = useState<GuestEvent[]>(initialGuestEvents)
  const [assigningGuest, setAssigningGuest] = useState<Guest | null>(null)
  const [search, setSearch] = useState('')
  const [filterSide, setFilterSide] = useState('all')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Guest | null>(null)
  const [form, setForm] = useState(empty)
  const [loading, setLoading] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [waOpen, setWaOpen] = useState(false)
  const [waSide, setWaSide] = useState<'all' | 'bride' | 'groom'>('all')
  const [groupByFamily, setGroupByFamily] = useState(false)
  const [checkInMode, setCheckInMode] = useState(false)

  function buildRsvpLink(token: string) {
    return `${window.location.origin}/rsvp/${token}`
  }

  function buildWaMessage(guest: Guest) {
    const link = buildRsvpLink(guest.rsvp_token)
    const coupleNames = `${wedding.bride_name} & ${wedding.groom_name}`
    const dateStr = wedding.wedding_date
      ? new Date(wedding.wedding_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : ''
    const city = wedding.primary_city ? `, ${wedding.primary_city}` : ''
    return `Hi ${guest.name}! 🎉\n\nYou're invited to ${coupleNames}'s wedding${dateStr ? ` on ${dateStr}` : ''}${city}.\n\nPlease confirm your attendance and share your travel details here:\n${link}\n\nLooking forward to celebrating with you! 🙏`
  }

  const waGuests = guests.filter(g => waSide === 'all' || g.side === waSide || g.side === 'both')

  function copyAllMessages() {
    const text = waGuests
      .map(g => `--- ${g.name}${g.phone ? ` (${g.phone})` : ''} ---\n${buildWaMessage(g)}`)
      .join('\n\n')
    navigator.clipboard.writeText(text)
    toast.success(`Copied messages for ${waGuests.length} guests`)
  }

  function copyAllLinks() {
    const text = waGuests
      .map(g => `${g.name}: ${buildRsvpLink(g.rsvp_token)}`)
      .join('\n')
    navigator.clipboard.writeText(text)
    toast.success(`Copied ${waGuests.length} RSVP links`)
  }

  function set(key: string, value: string | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function openNew() {
    setEditing(null)
    setForm(empty)
    setOpen(true)
  }

  function openEdit(guest: Guest) {
    setEditing(guest)
    setForm({
      name: guest.name,
      phone: guest.phone ?? '',
      email: guest.email ?? '',
      side: guest.side,
      is_vip: guest.is_vip,
      dietary: guest.dietary,
      dietary_notes: guest.dietary_notes ?? '',
      notes: guest.notes ?? '',
      plus_count: guest.plus_count ?? 0,
      invite_group: (guest as any).invite_group ?? 'all',
      family_group: guest.family_group ?? '',
    })
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    if (editing) {
      const result = await updateGuest(weddingId, editing.id, form)
      if (result.error) {
        toast.error(result.error)
      } else {
        setGuests(prev => prev.map(g => g.id === editing.id ? { ...g, ...form } : g))
        toast.success('Guest updated')
        setOpen(false)
      }
    } else {
      const result = await createGuest(weddingId, form)
      if (result.error) {
        toast.error(result.error)
      } else {
        setGuests(prev => [...prev, {
          id: result.id!,
          rsvp_token: result.rsvp_token!,
          ...form,
          phone: form.phone || null,
          email: form.email || null,
          dietary_notes: form.dietary_notes || null,
          notes: form.notes || null,
          rsvp_submitted_at: null,
          arrival_mode: null,
          needs_pickup: false,
          family_group: form.family_group || null,
          checked_in_at: null,
        }])
        toast.success('Guest added')
        setOpen(false)
      }
    }
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const result = await deleteGuest(weddingId, id)
    if (result.error) {
      toast.error(result.error)
    } else {
      setGuests(prev => prev.filter(g => g.id !== id))
      toast.success('Guest removed')
      setDeleteId(null)
    }
  }

  async function toggleEventAssignment(guestId: string, eventId: string, assigned: boolean) {
    if (assigned) {
      const result = await unassignGuestFromEvent(weddingId, guestId, eventId)
      if (result.error) { toast.error(result.error); return }
      setGuestEvents(prev => prev.filter(ge => !(ge.guest_id === guestId && ge.event_id === eventId)))
    } else {
      const result = await assignGuestToEvent(weddingId, guestId, eventId)
      if (result.error) { toast.error(result.error); return }
      setGuestEvents(prev => [...prev, { guest_id: guestId, event_id: eventId, rsvp_status: 'pending' }])
    }
  }

  function getGuestEventCount(guestId: string) {
    return guestEvents.filter(ge => ge.guest_id === guestId).length
  }

  async function handleCheckIn(guest: Guest) {
    const now = new Date().toISOString()
    const newVal = guest.checked_in_at ? null : now
    setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, checked_in_at: newVal } : g))
    const result = await checkInGuest(weddingId, guest.id, !guest.checked_in_at)
    if (result.error) {
      setGuests(prev => prev.map(g => g.id === guest.id ? { ...g, checked_in_at: guest.checked_in_at } : g))
      toast.error(result.error)
    }
  }

  const filtered = guests.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.phone?.includes(search) || g.email?.toLowerCase().includes(search.toLowerCase())
    const matchSide = filterSide === 'all' || g.side === filterSide
    return matchSearch && matchSide
  })

  const counts = {
    total: guests.length,
    totalPax: guests.reduce((sum, g) => sum + 1 + (g.plus_count ?? 0), 0),
    bride: guests.filter(g => g.side === 'bride').length,
    groom: guests.filter(g => g.side === 'groom').length,
    vip: guests.filter(g => g.is_vip).length,
    rsvped: guests.filter(g => g.rsvp_submitted_at).length,
    checkedIn: guests.filter(g => g.checked_in_at).length,
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Guests</h1>
          <p className="text-stone-500 text-sm mt-1">{counts.total} bookings · {counts.totalPax} pax · {counts.bride} bride · {counts.groom} groom · {counts.vip} VIP · {counts.rsvped} RSVP'd{counts.checkedIn > 0 ? ` · ${counts.checkedIn} checked in` : ''}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <GuestImport weddingId={weddingId} onImported={() => {}} />
          <Button variant="outline" size="sm" onClick={() => setWaOpen(true)}>
            <MessageCircle className="w-4 h-4 mr-1.5" /> Share RSVP
          </Button>
          <Button
            variant={checkInMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => setCheckInMode(m => !m)}
            className={checkInMode ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
          >
            <ScanLine className="w-4 h-4 mr-1.5" /> {checkInMode ? 'Exit check-in' : 'Check-in'}
          </Button>
          <Button onClick={openNew} className="bg-rose-700 hover:bg-rose-800">
            <Plus className="w-4 h-4 mr-1.5" /> Add guest
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input className="pl-9" placeholder="Search by name, phone, email…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filterSide} onValueChange={v => setFilterSide(v ?? '')}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sides</SelectItem>
            <SelectItem value="bride">Bride</SelectItem>
            <SelectItem value="groom">Groom</SelectItem>
            <SelectItem value="both">Both</SelectItem>
          </SelectContent>
        </Select>
        <Button variant={groupByFamily ? 'default' : 'outline'} size="sm"
          onClick={() => setGroupByFamily(f => !f)}
          className={groupByFamily ? 'bg-stone-800 hover:bg-stone-700' : ''}>
          <Users className="w-3.5 h-3.5 mr-1.5" /> Group by family
        </Button>
      </div>

      {guests.length === 0 ? (
        <div className="border border-dashed border-stone-200 rounded-xl p-8">
          <div className="text-center mb-6">
            <Users className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-700 font-semibold">Build your guest list</p>
            <p className="text-stone-400 text-sm mt-1 max-w-sm mx-auto">Add guests with their contact, side (bride/groom), family group and RSVP status</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto mb-6 text-xs text-stone-500">
            <div className="bg-stone-50 rounded-lg p-3">
              <p className="font-semibold text-stone-700 mb-1">What you can track</p>
              <ul className="space-y-0.5">
                <li>• RSVP status (pending / attending / declined)</li>
                <li>• Side: Bride or Groom family</li>
                <li>• Family group (e.g. Sharma Family)</li>
                <li>• VIP flag, dietary needs</li>
                <li>• Plus count (how many they bring)</li>
              </ul>
            </div>
            <div className="bg-rose-50 rounded-lg p-3">
              <p className="font-semibold text-rose-700 mb-1">Pro tips</p>
              <ul className="space-y-0.5 text-rose-600">
                <li>• Group by family to see side-wise count</li>
                <li>• Share portal link so guests RSVP themselves</li>
                <li>• Use seating page to assign tables</li>
              </ul>
            </div>
          </div>
          <div className="text-center">
            <Button onClick={openNew} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1.5" /> Add first guest
            </Button>
          </div>
        </div>
      ) : (() => {
        // Build grouped structure when groupByFamily is on
        const groupedMap = groupByFamily
          ? filtered.reduce<Record<string, Guest[]>>((acc, g) => {
              const key = g.family_group || '— Ungrouped —'
              acc[key] = acc[key] || []
              acc[key].push(g)
              return acc
            }, {})
          : { '': filtered }

        const GuestRow = ({ guest }: { guest: Guest }) => (
          <tr key={guest.id} className={`border-b border-stone-100 last:border-0 hover:bg-stone-50 ${guest.checked_in_at ? 'bg-emerald-50/40' : ''}`}>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                {guest.is_vip && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
                <span className="font-medium text-stone-900">{guest.name}</span>
                {guest.plus_count > 0 && (
                  <span className="text-xs bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded-full">+{guest.plus_count}</span>
                )}
                {guest.rsvp_submitted_at && (
                  <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">RSVP'd</span>
                )}
                {guest.checked_in_at && (
                  <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">✓ Checked in</span>
                )}
              </div>
              {guest.email && <p className="text-xs text-stone-400">{guest.email}</p>}
            </td>
            <td className="px-4 py-3 text-stone-600">{guest.phone || '—'}</td>
            <td className="px-4 py-3">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SIDE_COLORS[guest.side]}`}>
                {SIDE_LABELS[guest.side]}
              </span>
            </td>
            <td className="px-4 py-3 text-stone-600">{DIETARY_LABELS[guest.dietary]}</td>
            <td className="px-4 py-3">
              <button onClick={() => setAssigningGuest(guest)}
                className="text-xs text-rose-700 hover:underline font-medium">
                {getGuestEventCount(guest.id)}/{events.length} events
              </button>
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-1 justify-end">
                {checkInMode ? (
                  <Button
                    size="sm"
                    variant={guest.checked_in_at ? 'default' : 'outline'}
                    className={guest.checked_in_at ? 'bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-3' : 'h-7 px-3 border-emerald-400 text-emerald-700 hover:bg-emerald-50'}
                    onClick={() => handleCheckIn(guest)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    {guest.checked_in_at ? 'Checked in' : 'Check in'}
                  </Button>
                ) : (
                  <>
                    <Link href={`/weddings/${weddingId}/guests/${guest.id}`}>
                      <Button size="icon-sm" variant="ghost" title="Guest 360 — view all details">
                        <ExternalLink className="w-3.5 h-3.5 text-stone-400" />
                      </Button>
                    </Link>
                    <Button size="icon-sm" variant="ghost" title="Copy RSVP link"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/rsvp/${guest.rsvp_token}`)
                        toast.success('RSVP link copied')
                      }}>
                      <Link2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => openEdit(guest)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" onClick={() => setDeleteId(guest.id)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </td>
          </tr>
        )

        return (
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="text-left px-4 py-3 font-medium text-stone-500">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-500">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-500">Side</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-500">Dietary</th>
                  <th className="text-left px-4 py-3 font-medium text-stone-500">Events</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {groupByFamily
                  ? Object.entries(groupedMap).sort(([a], [b]) => a.localeCompare(b)).map(([group, groupGuests]) => (
                      <>
                        <tr key={`group-${group}`} className="bg-stone-50 border-b border-stone-200">
                          <td colSpan={6} className="px-4 py-2">
                            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{group}</span>
                            <span className="text-xs text-stone-400 ml-2">{groupGuests.length} guest{groupGuests.length !== 1 ? 's' : ''}</span>
                          </td>
                        </tr>
                        {groupGuests.map(g => <GuestRow key={g.id} guest={g} />)}
                      </>
                    ))
                  : filtered.map(g => <GuestRow key={g.id} guest={g} />)
                }
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-stone-400 text-sm py-8">No guests match your search</p>
            )}
          </div>
        )
      })()}

      {/* Add / Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit guest' : 'Add guest'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full name *</Label>
              <Input placeholder="e.g. Sharma Ji" value={form.name}
                onChange={e => set('name', e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input placeholder="+91 98765 43210" value={form.phone}
                  onChange={e => set('phone', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="email@example.com" value={form.email}
                  onChange={e => set('email', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Side</Label>
                <Select value={form.side ?? ''} onValueChange={v => set('side', v ?? '')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SIDE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Dietary</Label>
                <Select value={form.dietary ?? ''} onValueChange={v => set('dietary', v ?? '')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DIETARY_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Dietary notes</Label>
              <Input placeholder="e.g. No onion, no garlic" value={form.dietary_notes}
                onChange={e => set('dietary_notes', e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Extra guests in this booking</Label>
                <Input type="number" min={0} max={20} value={form.plus_count}
                  onChange={e => set('plus_count', e.target.value)}
                  placeholder="0" />
                <p className="text-xs text-stone-400">e.g. 3 = family of 4 total</p>
              </div>
              <div className="flex items-end pb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" id="is_vip" checked={form.is_vip}
                    onChange={e => set('is_vip', e.target.checked)}
                    className="rounded border-stone-300" />
                  <Label htmlFor="is_vip" className="cursor-pointer">VIP guest</Label>
                </label>
              </div>
            </div>

            {/* Invite group */}
            <div className="space-y-1.5">
              <Label>Invited to</Label>
              <div className="space-y-2">
                {INVITE_GROUPS.map(g => (
                  <label key={g.value}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      form.invite_group === g.value
                        ? 'border-rose-300 bg-rose-50'
                        : 'border-stone-200 hover:bg-stone-50'
                    }`}>
                    <input type="radio" name="invite_group" value={g.value}
                      checked={form.invite_group === g.value}
                      onChange={() => set('invite_group', g.value)}
                      className="text-rose-600" />
                    <div>
                      <p className="text-sm font-medium text-stone-900">{g.label}</p>
                      <p className="text-xs text-stone-400">{g.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Family / Group</Label>
                <Input placeholder="e.g. Sharma family, College friends" value={form.family_group}
                  onChange={e => set('family_group', e.target.value)} />
                <p className="text-xs text-stone-400">Group guests for easy filtering</p>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input placeholder="Any special requirements" value={form.notes}
                  onChange={e => set('notes', e.target.value)} />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-rose-700 hover:bg-rose-800" disabled={loading}>
                {loading ? 'Saving…' : editing ? 'Save changes' : 'Add guest'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Event assignment dialog */}
      <Dialog open={!!assigningGuest} onOpenChange={() => setAssigningGuest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign events — {assigningGuest?.name}</DialogTitle>
          </DialogHeader>
          {events.length === 0 ? (
            <p className="text-sm text-stone-500 py-4">No events yet. Add events first.</p>
          ) : (
            <>
              <div className="flex gap-2 pb-1">
                <button onClick={async () => {
                  if (!assigningGuest) return
                  for (const ev of events) {
                    const assigned = guestEvents.some(ge => ge.guest_id === assigningGuest.id && ge.event_id === ev.id)
                    if (!assigned) await toggleEventAssignment(assigningGuest.id, ev.id, false)
                  }
                }} className="text-xs text-rose-700 font-medium hover:underline">Assign all</button>
                <span className="text-stone-300">·</span>
                <button onClick={async () => {
                  if (!assigningGuest) return
                  for (const ev of events) {
                    const assigned = guestEvents.some(ge => ge.guest_id === assigningGuest.id && ge.event_id === ev.id)
                    if (assigned) await toggleEventAssignment(assigningGuest.id, ev.id, true)
                  }
                }} className="text-xs text-stone-500 hover:underline">Remove all</button>
              </div>
            <div className="space-y-2 py-2">
              {events.map(ev => {
                const assigned = guestEvents.some(
                  ge => ge.guest_id === assigningGuest?.id && ge.event_id === ev.id
                )
                return (
                  <label key={ev.id} className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 hover:bg-stone-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assigned}
                      onChange={() => assigningGuest && toggleEventAssignment(assigningGuest.id, ev.id, assigned)}
                      className="rounded border-stone-300"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900">{ev.name}</p>
                      <p className="text-xs text-stone-400">{new Date(ev.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {ev.type}</p>
                    </div>
                  </label>
                )
              })}
            </div>
            </>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssigningGuest(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remove guest?</DialogTitle></DialogHeader>
          <p className="text-sm text-stone-500">This will also remove all their event assignments.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteId && handleDelete(deleteId)}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* WhatsApp Share Dialog */}
      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Share RSVP links via WhatsApp</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
              {(['all', 'bride', 'groom'] as const).map(s => (
                <button key={s} onClick={() => setWaSide(s)}
                  className={`px-3 py-1 text-sm rounded-md font-medium transition-colors capitalize ${
                    waSide === s ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
                  }`}>
                  {s === 'all' ? `All (${guests.length})` : `${s === 'bride' ? 'Bride' : 'Groom'} (${guests.filter(g => g.side === s || g.side === 'both').length})`}
                </button>
              ))}
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={copyAllLinks}>
                <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy all links
              </Button>
              <Button variant="outline" size="sm" onClick={copyAllMessages}>
                <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy all messages
              </Button>
            </div>
          </div>

          <div className="overflow-auto flex-1 space-y-3 pr-1">
            {waGuests.length === 0 && (
              <p className="text-sm text-stone-400 text-center py-8">No guests found</p>
            )}
            {waGuests.map(guest => {
              const msg = buildWaMessage(guest)
              const waUrl = `https://wa.me/${(guest.phone || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`
              return (
                <div key={guest.id} className="border border-stone-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {guest.is_vip && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                      <span className="font-medium text-stone-900 text-sm">{guest.name}</span>
                      {guest.phone && <span className="text-xs text-stone-400">{guest.phone}</span>}
                      {guest.rsvp_submitted_at && (
                        <span className="text-xs bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full">RSVP'd</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { navigator.clipboard.writeText(msg); toast.success('Message copied') }}
                        className="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1">
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                      {guest.phone && (
                        <a href={waUrl} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-green-600 hover:text-green-700 flex items-center gap-1 font-medium">
                          <ExternalLink className="w-3 h-3" /> Open WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                  <pre className="text-xs text-stone-600 bg-stone-50 rounded-lg px-3 py-2 whitespace-pre-wrap font-sans leading-relaxed">
                    {msg}
                  </pre>
                </div>
              )
            })}
          </div>

          <DialogFooter className="flex-shrink-0">
            <Button variant="outline" onClick={() => setWaOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
