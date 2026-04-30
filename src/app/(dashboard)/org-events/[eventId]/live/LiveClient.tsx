'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Users, UserCheck, UserX, Music, ShoppingBag, Building2,
  CheckSquare, Clock, RefreshCw, Zap, Star, Car, Shield,
  AlertCircle, CheckCircle2, Circle, Timer
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { checkInDelegate, checkInGuest, checkInVolunteer } from './actions'

type Delegate = { id: string; name: string; checked_in: boolean }
type Guest = { id: string; name: string; is_vvip: boolean; checked_in: boolean; requires_escort: boolean; requires_vehicle: boolean }
type Volunteer = { id: string; name: string; role: string | null; zone: string | null; checked_in: boolean }
type Artist = { id: string; name: string; act_type: string | null; performance_slot: string | null; arrival_time: string | null }
type Vendor = { id: string; name: string; category: string | null }
type Room = { id: string; room_number: string; room_type: string | null; is_allocated: boolean }
type ChecklistItem = { id: string; task: string; category: string; status: string }
type TimelineItem = { id: string; time: string; end_time: string | null; activity: string; category: string | null; owner: string | null }

type Props = {
  eventId: string
  event: { id: string; name: string; start_date: string | null; venue: string | null; city: string | null; status: string | null; sub_type: string | null } | null
  delegates: Delegate[]
  guests: Guest[]
  volunteers: Volunteer[]
  artists: Artist[]
  vendors: Vendor[]
  rooms: Room[]
  checklist: ChecklistItem[]
  timeline: TimelineItem[]
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 flex items-center gap-4">
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', color)}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-stone-900">{value}</p>
        <p className="text-xs text-stone-500">{label}</p>
        {sub && <p className="text-xs text-stone-400">{sub}</p>}
      </div>
    </div>
  )
}

function CheckInRow({ name, subtitle, checkedIn, isVvip, onToggle }: {
  name: string; subtitle?: string; checkedIn: boolean; isVvip?: boolean; onToggle: () => void
}) {
  return (
    <div className={cn(
      'flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors',
      checkedIn ? 'bg-green-50' : 'bg-stone-50 hover:bg-stone-100'
    )}>
      <div className="flex items-center gap-2 min-w-0">
        {isVvip && <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
        <div className="min-w-0">
          <p className={cn('text-sm font-medium truncate', checkedIn ? 'text-green-800' : 'text-stone-800')}>{name}</p>
          {subtitle && <p className="text-xs text-stone-400 truncate">{subtitle}</p>}
        </div>
      </div>
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0 ml-2',
          checkedIn ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-white border border-stone-200 text-stone-500 hover:border-blue-300 hover:text-blue-600'
        )}
      >
        {checkedIn ? <><UserCheck className="w-3.5 h-3.5" /> In</> : <><UserX className="w-3.5 h-3.5" /> —</>}
      </button>
    </div>
  )
}

export default function LiveClient({ eventId, event, delegates, guests, volunteers, artists, vendors, rooms, checklist, timeline }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'delegates' | 'guests' | 'volunteers'>('delegates')
  const [now, setNow] = useState(new Date())

  const [delegateState, setDelegateState] = useState(delegates)
  const [guestState, setGuestState] = useState(guests)
  const [volunteerState, setVolunteerState] = useState(volunteers)

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  // Auto-refresh server data every 60s
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 60000)
    return () => clearInterval(t)
  }, [router])

  // Check-in stats
  const dIn = delegateState.filter(d => d.checked_in).length
  const gIn = guestState.filter(g => g.checked_in).length
  const vIn = volunteerState.filter(v => v.checked_in).length
  const vvip = guestState.filter(g => g.is_vvip)
  const vvipIn = vvip.filter(g => g.checked_in).length
  const checklistDone = checklist.filter(c => c.status === 'done').length
  const roomsFree = rooms.filter(r => !r.is_allocated).length

  // Search-filtered lists
  const q = search.toLowerCase()
  const filteredDelegates = delegateState.filter(d => !q || d.name.toLowerCase().includes(q))
  const filteredGuests = guestState.filter(g => !q || g.name.toLowerCase().includes(q))
  const filteredVolunteers = volunteerState.filter(v => !q || v.name.toLowerCase().includes(q) || (v.role ?? '').toLowerCase().includes(q))

  function toggleDelegate(id: string) {
    const d = delegateState.find(x => x.id === id)
    if (!d) return
    startTransition(async () => {
      const res = await checkInDelegate(eventId, id, !d.checked_in)
      if ('error' in res) { toast.error(res.error); return }
      setDelegateState(prev => prev.map(x => x.id === id ? { ...x, checked_in: !d.checked_in } : x))
    })
  }

  function toggleGuest(id: string) {
    const g = guestState.find(x => x.id === id)
    if (!g) return
    startTransition(async () => {
      const res = await checkInGuest(eventId, id, !g.checked_in)
      if ('error' in res) { toast.error(res.error); return }
      setGuestState(prev => prev.map(x => x.id === id ? { ...x, checked_in: !g.checked_in } : x))
    })
  }

  function toggleVolunteer(id: string) {
    const v = volunteerState.find(x => x.id === id)
    if (!v) return
    startTransition(async () => {
      const res = await checkInVolunteer(eventId, id, !v.checked_in)
      if ('error' in res) { toast.error(res.error); return }
      setVolunteerState(prev => prev.map(x => x.id === id ? { ...x, checked_in: !v.checked_in } : x))
    })
  }

  const currentTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  const currentDate = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Live Event</span>
          </div>
          <h1 className="text-2xl font-bold text-stone-900">{event?.name ?? 'Event Dashboard'}</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {event?.venue && `${event.venue}`}{event?.city && `, ${event.city}`}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-stone-900 tabular-nums">{currentTime}</p>
          <p className="text-sm text-stone-400">{currentDate}</p>
          <button onClick={() => router.refresh()} className="text-xs text-blue-500 hover:text-blue-700 mt-1 flex items-center gap-1 ml-auto">
            <RefreshCw className={cn('w-3 h-3', isPending && 'animate-spin')} /> {isPending ? 'Refreshing…' : 'Refresh · auto 60s'}
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={Users} label="Delegates" value={`${dIn}/${delegateState.length}`} sub="checked in" color="bg-blue-50 text-blue-600" />
        <StatCard icon={Star} label="VVIPs" value={`${vvipIn}/${vvip.length}`} sub="arrived" color="bg-amber-50 text-amber-600" />
        <StatCard icon={Users} label="Volunteers" value={`${vIn}/${volunteerState.length}`} sub="on site" color="bg-purple-50 text-purple-600" />
        <StatCard icon={Music} label="Artists" value={artists.length} sub="booked" color="bg-rose-50 text-rose-600" />
        <StatCard icon={Building2} label="Rooms" value={roomsFree} sub="available" color="bg-teal-50 text-teal-600" />
        <StatCard icon={CheckSquare} label="Checklist" value={`${checklistDone}/${checklist.length}`} sub="done" color="bg-green-50 text-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Check-in panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-stone-100">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-stone-900 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500" /> Quick Check-in
                </h2>
              </div>
              {/* Search */}
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="mb-3"
              />
              {/* Tabs */}
              <div className="flex gap-1">
                {([
                  { key: 'delegates', label: `Delegates (${dIn}/${delegateState.length})` },
                  { key: 'guests', label: `Guests (${gIn}/${guestState.length})` },
                  { key: 'volunteers', label: `Volunteers (${vIn}/${volunteerState.length})` },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                      activeTab === tab.key
                        ? 'bg-blue-600 text-white'
                        : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100'
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 space-y-1 max-h-96 overflow-y-auto">
              {activeTab === 'delegates' && (
                filteredDelegates.length === 0
                  ? <p className="text-sm text-stone-400 text-center py-6">No delegates</p>
                  : filteredDelegates.map(d => (
                    <CheckInRow key={d.id} name={d.name} checkedIn={d.checked_in} onToggle={() => toggleDelegate(d.id)} />
                  ))
              )}
              {activeTab === 'guests' && (
                filteredGuests.length === 0
                  ? <p className="text-sm text-stone-400 text-center py-6">No guests</p>
                  : filteredGuests.map(g => (
                    <CheckInRow
                      key={g.id} name={g.name} checkedIn={g.checked_in} isVvip={g.is_vvip}
                      subtitle={[g.requires_escort ? 'Needs escort' : null, g.requires_vehicle ? 'Needs vehicle' : null].filter(Boolean).join(' · ') || undefined}
                      onToggle={() => toggleGuest(g.id)}
                    />
                  ))
              )}
              {activeTab === 'volunteers' && (
                filteredVolunteers.length === 0
                  ? <p className="text-sm text-stone-400 text-center py-6">No volunteers</p>
                  : filteredVolunteers.map(v => (
                    <CheckInRow
                      key={v.id} name={v.name} checkedIn={v.checked_in}
                      subtitle={[v.role, v.zone].filter(Boolean).join(' · ') || undefined}
                      onToggle={() => toggleVolunteer(v.id)}
                    />
                  ))
              )}
            </div>

            {/* Progress bar */}
            <div className="px-4 py-3 border-t border-stone-50 bg-stone-50">
              {activeTab === 'delegates' && (
                <div>
                  <div className="flex justify-between text-xs text-stone-500 mb-1">
                    <span>Delegate check-in</span>
                    <span>{delegateState.length > 0 ? Math.round(dIn / delegateState.length * 100) : 0}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-200 rounded-full">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${delegateState.length > 0 ? dIn / delegateState.length * 100 : 0}%` }} />
                  </div>
                </div>
              )}
              {activeTab === 'guests' && (
                <div>
                  <div className="flex justify-between text-xs text-stone-500 mb-1">
                    <span>Guest check-in</span>
                    <span>{guestState.length > 0 ? Math.round(gIn / guestState.length * 100) : 0}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-200 rounded-full">
                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${guestState.length > 0 ? gIn / guestState.length * 100 : 0}%` }} />
                  </div>
                </div>
              )}
              {activeTab === 'volunteers' && (
                <div>
                  <div className="flex justify-between text-xs text-stone-500 mb-1">
                    <span>Volunteers on site</span>
                    <span>{volunteerState.length > 0 ? Math.round(vIn / volunteerState.length * 100) : 0}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-stone-200 rounded-full">
                    <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${volunteerState.length > 0 ? vIn / volunteerState.length * 100 : 0}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Alerts: VVIP pending + escorts */}
          {vvip.filter(g => !g.checked_in).length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <p className="font-semibold text-amber-800 text-sm">VVIPs not yet arrived</p>
              </div>
              <div className="space-y-1">
                {vvip.filter(g => !g.checked_in).map(g => (
                  <div key={g.id} className="flex items-center justify-between text-sm">
                    <span className="text-amber-700 font-medium">{g.name}</span>
                    <div className="flex gap-2">
                      {g.requires_escort && <span className="flex items-center gap-1 text-xs text-amber-600"><Shield className="w-3 h-3" /> Escort ready?</span>}
                      {g.requires_vehicle && <span className="flex items-center gap-1 text-xs text-amber-600"><Car className="w-3 h-3" /> Vehicle ready?</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Run of Show - next items */}
          {timeline.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <h3 className="font-semibold text-stone-900 text-sm flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-blue-500" /> Run of Show
              </h3>
              <div className="space-y-2">
                {timeline.slice(0, 6).map((item, i) => (
                  <div key={item.id} className={cn('flex gap-3 text-sm', i === 0 && 'font-medium')}>
                    <span className="text-xs font-mono text-stone-400 flex-shrink-0 w-16">{item.time}</span>
                    <span className={cn('text-stone-700 flex-1 truncate', i === 0 && 'text-blue-700')}>{item.activity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Artists arrival */}
          {artists.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <h3 className="font-semibold text-stone-900 text-sm flex items-center gap-2 mb-3">
                <Music className="w-4 h-4 text-rose-500" /> Artists
              </h3>
              <div className="space-y-2">
                {artists.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-stone-800">{a.name}</p>
                      <p className="text-xs text-stone-400">{a.act_type}{a.performance_slot ? ` · ${a.performance_slot}` : ''}</p>
                    </div>
                    {a.arrival_time && (
                      <span className="text-xs text-stone-400">Arrival: {a.arrival_time}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Vendors on site */}
          {vendors.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <h3 className="font-semibold text-stone-900 text-sm flex items-center gap-2 mb-3">
                <ShoppingBag className="w-4 h-4 text-stone-500" /> Vendors
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {vendors.map(v => (
                  <span key={v.id} className="text-xs px-2 py-1 bg-stone-100 text-stone-600 rounded-lg">{v.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Rooms */}
          {rooms.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <h3 className="font-semibold text-stone-900 text-sm flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-teal-500" /> Rooms
              </h3>
              <div className="flex gap-3 text-sm">
                <div className="flex-1 text-center p-2 bg-teal-50 rounded-lg">
                  <p className="text-xl font-bold text-teal-700">{roomsFree}</p>
                  <p className="text-xs text-teal-600">Available</p>
                </div>
                <div className="flex-1 text-center p-2 bg-blue-50 rounded-lg">
                  <p className="text-xl font-bold text-blue-700">{rooms.length - roomsFree}</p>
                  <p className="text-xs text-blue-600">Occupied</p>
                </div>
              </div>
            </div>
          )}

          {/* Pending checklist items */}
          {checklist.filter(c => c.status !== 'done').length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 p-4">
              <h3 className="font-semibold text-stone-900 text-sm flex items-center gap-2 mb-3">
                <CheckSquare className="w-4 h-4 text-green-500" /> Pending Tasks
              </h3>
              <div className="space-y-1.5">
                {checklist.filter(c => c.status !== 'done').slice(0, 5).map(c => (
                  <div key={c.id} className="flex items-start gap-2 text-sm">
                    <Circle className="w-3.5 h-3.5 text-stone-300 flex-shrink-0 mt-0.5" />
                    <span className="text-stone-600">{c.task}</span>
                  </div>
                ))}
                {checklist.filter(c => c.status !== 'done').length > 5 && (
                  <p className="text-xs text-stone-400 pl-5">+{checklist.filter(c => c.status !== 'done').length - 5} more</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
