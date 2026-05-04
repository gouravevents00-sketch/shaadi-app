'use client'

import { useState, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Circle, CircleDot, CircleCheck, Sparkles, ChevronDown, ChevronRight, Clock, Users, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createTimelineItem, updateTimelineItem, deleteTimelineItem, seedFromEvents } from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = 'pending' | 'in_progress' | 'done'

interface Event {
  id: string; name: string; date: string
  start_time: string; end_time: string | null; venue: string
}

interface TItem {
  id: string; event_id: string | null; time: string; duration_mins: number
  title: string; description: string | null; team: string; status: Status
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_NEXT: Record<Status, Status> = { pending: 'in_progress', in_progress: 'done', done: 'pending' }

const TEAMS = ['All', 'Coordinator', 'Photographer', 'Videographer', 'Bride team', 'Groom team', 'Catering', 'Decor', 'Pandit', 'DJ / Band', 'Venue staff']

const TEAM_COLOR: Record<string, string> = {
  'All': 'bg-stone-100 text-stone-600',
  'Coordinator': 'bg-purple-100 text-purple-700',
  'Photographer': 'bg-blue-100 text-blue-700',
  'Videographer': 'bg-indigo-100 text-indigo-700',
  'Bride team': 'bg-rose-100 text-rose-700',
  'Groom team': 'bg-sky-100 text-sky-700',
  'Catering': 'bg-orange-100 text-orange-700',
  'Decor': 'bg-pink-100 text-pink-700',
  'Pandit': 'bg-amber-100 text-amber-700',
  'DJ / Band': 'bg-green-100 text-green-700',
  'Venue staff': 'bg-teal-100 text-teal-700',
}

function teamStyle(team: string) {
  return TEAM_COLOR[team] ?? 'bg-stone-100 text-stone-600'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(t: string) {
  const [h, m] = t.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

function fmtDuration(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60), m = mins % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

function timeToMins(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// ─── Status icon ──────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: Status }) {
  if (status === 'done')        return <CircleCheck className="w-5 h-5 text-green-500" />
  if (status === 'in_progress') return <CircleDot   className="w-5 h-5 text-blue-500" />
  return <Circle className="w-5 h-5 text-stone-300" />
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TimelineClient({ weddingId, initialEvents, initialItems }: {
  weddingId: string
  initialEvents: Event[]
  initialItems: TItem[]
}) {
  const [items, setItems] = useState<TItem[]>(initialItems)
  const [activeEventId, setActiveEventId] = useState<string>(initialEvents[0]?.id ?? '')
  const [seeding, setSeeding] = useState(false)
  const [teamFilter, setTeamFilter] = useState('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Add row state
  const [adding, setAdding] = useState(false)
  const [addForm, setAddForm] = useState({ time: '', title: '', duration_mins: '30', team: 'All', description: '' })
  const addTitleRef = useRef<HTMLInputElement>(null)

  // ─── Active event items ─────────────────────────────────────────────────────

  const activeEvent = initialEvents.find(e => e.id === activeEventId)

  const eventItems = useMemo(() => {
    const base = items.filter(i => i.event_id === activeEventId)
    const filtered = teamFilter === 'All' ? base : base.filter(i => i.team === teamFilter)
    return filtered.sort((a, b) => timeToMins(a.time) - timeToMins(b.time))
  }, [items, activeEventId, teamFilter])

  // Teams used in current event
  const usedTeams = useMemo(() => {
    const s = new Set(items.filter(i => i.event_id === activeEventId).map(i => i.team))
    s.delete('All')
    return ['All', ...TEAMS.filter(t => s.has(t)), ...([...s].filter(t => !TEAMS.includes(t)))]
  }, [items, activeEventId])

  // Stats
  const done = eventItems.filter(i => i.status === 'done').length
  const inProgress = eventItems.filter(i => i.status === 'in_progress').length
  const totalMins = eventItems.reduce((s, i) => s + i.duration_mins, 0)

  // ─── Handlers ──────────────────────────────────────────────────────────────

  async function handleSeed() {
    setSeeding(true)
    const r = await seedFromEvents(weddingId)
    setSeeding(false)
    if ('error' in r && r.error) { toast.error(r.error); return }
    toast.success(r.created ? `${r.created} items added from events` : 'Already seeded')
    window.location.reload()
  }

  async function cycleStatus(item: TItem) {
    const next = STATUS_NEXT[item.status]
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: next } : i))
    const r = await updateTimelineItem(weddingId, item.id, { status: next })
    if ('error' in r) {
      toast.error(r.error)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: item.status } : i))
    }
  }

  async function handleAdd() {
    if (!addForm.time || !addForm.title.trim()) return
    const data = {
      event_id: activeEventId,
      time: addForm.time,
      title: addForm.title.trim(),
      duration_mins: parseInt(addForm.duration_mins) || 30,
      team: addForm.team,
      description: addForm.description.trim() || undefined,
    }
    const tmp: TItem = { id: 'tmp-' + Date.now(), status: 'pending', event_id: data.event_id, time: data.time, title: data.title, duration_mins: data.duration_mins, team: data.team, description: data.description ?? null }
    setItems(prev => [...prev, tmp])
    setAdding(false)
    setAddForm({ time: '', title: '', duration_mins: '30', team: 'All', description: '' })

    const r = await createTimelineItem(weddingId, data)
    if ('error' in r) {
      toast.error(r.error)
      setItems(prev => prev.filter(i => i.id !== tmp.id))
    } else {
      setItems(prev => prev.map(i => i.id === tmp.id ? { ...i, id: r.id! } : i))
    }
  }

  async function handleDelete(item: TItem) {
    setItems(prev => prev.filter(i => i.id !== item.id))
    await deleteTimelineItem(weddingId, item.id)
  }

  async function handleFieldSave(item: TItem, field: keyof TItem, value: string | number) {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, [field]: value } : i))
    await updateTimelineItem(weddingId, item.id, { [field]: value })
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (initialEvents.length === 0) {
    return (
      <div className="p-4 sm:p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-stone-900 mb-2">Run of Show</h1>
        <div className="border-2 border-dashed border-stone-200 rounded-xl py-20 text-center">
          <Clock className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 font-medium">No events yet</p>
          <p className="text-stone-400 text-sm mt-1">Add events first, then build the run of show from them.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Run of Show</h1>
          {eventItems.length > 0 && (
            <p className="text-sm text-stone-400 mt-0.5">
              {done}/{eventItems.length} done
              {inProgress > 0 && <span className="text-blue-500"> · {inProgress} in progress</span>}
              {' · '}{fmtDuration(totalMins)} total
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
            <Sparkles className="w-3.5 h-3.5 mr-1" />{seeding ? 'Seeding…' : 'Seed from events'}
          </Button>
          <Button size="sm" className="bg-rose-700 hover:bg-rose-800"
            onClick={() => { setAdding(true); setTimeout(() => addTitleRef.current?.focus(), 50) }}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add item
          </Button>
        </div>
      </div>

      {/* Event tabs */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1">
        {initialEvents.map(ev => (
          <button key={ev.id} onClick={() => { setActiveEventId(ev.id); setTeamFilter('All') }}
            className={`flex-shrink-0 px-3 py-2 rounded-xl text-sm font-medium transition-colors border ${
              activeEventId === ev.id
                ? 'bg-stone-900 text-white border-stone-900'
                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
            }`}>
            <span className="block leading-tight">{ev.name}</span>
            <span className={`text-[11px] font-normal ${activeEventId === ev.id ? 'text-stone-300' : 'text-stone-400'}`}>
              {fmtDate(ev.date)}
            </span>
          </button>
        ))}
      </div>

      {/* Active event info bar */}
      {activeEvent && (
        <div className="flex items-center gap-4 px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl mb-4 text-sm text-stone-500">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{fmtTime(activeEvent.start_time)}{activeEvent.end_time ? ` – ${fmtTime(activeEvent.end_time)}` : ''}</span>
          <span className="text-stone-300">·</span>
          <span className="truncate">{activeEvent.venue}</span>
          {eventItems.length > 0 && (
            <div className="ml-auto h-1.5 w-24 bg-stone-200 rounded-full overflow-hidden flex-shrink-0">
              <div className="h-full bg-green-400 rounded-full transition-all"
                style={{ width: `${eventItems.length ? (done / eventItems.length) * 100 : 0}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Team filter */}
      {usedTeams.length > 1 && (
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {usedTeams.map(t => (
            <button key={t} onClick={() => setTeamFilter(t)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                teamFilter === t ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}>
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Empty state for event */}
      {eventItems.length === 0 && !adding && (
        <div className="border-2 border-dashed border-stone-200 rounded-xl py-14 text-center">
          <Clock className="w-8 h-8 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 font-medium text-sm">No items yet for {activeEvent?.name}</p>
          <p className="text-stone-400 text-xs mt-1 mb-4">Seed from events or add manually</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={handleSeed} disabled={seeding}>
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Seed from events
            </Button>
            <Button size="sm" className="bg-rose-700 hover:bg-rose-800"
              onClick={() => { setAdding(true); setTimeout(() => addTitleRef.current?.focus(), 50) }}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add manually
            </Button>
          </div>
        </div>
      )}

      {/* Timeline items */}
      {eventItems.length > 0 && (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-[4.5rem] top-0 bottom-0 w-px bg-stone-100" />

          <div className="space-y-0">
            {eventItems.map((item, idx) => {
              const isExpanded = expandedId === item.id
              // Gap from previous item
              const prevItem = idx > 0 ? eventItems[idx - 1] : null
              const gap = prevItem ? timeToMins(item.time) - timeToMins(prevItem.time) - prevItem.duration_mins : 0

              return (
                <div key={item.id}>
                  {/* Gap indicator */}
                  {gap > 5 && (
                    <div className="flex items-center gap-2 py-1 pl-20">
                      <span className="text-[10px] text-stone-300 italic">{fmtDuration(gap)} gap</span>
                    </div>
                  )}

                  {/* Item row */}
                  <div className={`group flex gap-0 ${item.status === 'done' ? 'opacity-60' : ''}`}>
                    {/* Time column */}
                    <div className="w-16 flex-shrink-0 pt-3 text-right pr-3">
                      <InlineTimeEdit value={item.time} onSave={v => handleFieldSave(item, 'time', v)} />
                    </div>

                    {/* Status dot */}
                    <div className="w-8 flex-shrink-0 flex flex-col items-center pt-3.5 relative z-10">
                      <button onClick={() => cycleStatus(item)} className="hover:scale-110 transition-transform">
                        <StatusIcon status={item.status} />
                      </button>
                    </div>

                    {/* Content */}
                    <div className={`flex-1 min-w-0 mb-2 rounded-xl border transition-all ${
                      isExpanded ? 'border-stone-300 bg-white shadow-sm' : 'border-transparent bg-transparent hover:border-stone-200 hover:bg-white'
                    }`}>
                      <div className="flex items-start gap-2 px-3 py-2.5 cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}>

                        {/* Title */}
                        <div className="flex-1 min-w-0">
                          <InlineTitleEdit value={item.title} status={item.status}
                            onSave={v => handleFieldSave(item, 'title', v)} />
                          {item.description && !isExpanded && (
                            <p className="text-xs text-stone-400 mt-0.5 truncate">{item.description}</p>
                          )}
                        </div>

                        {/* Duration + team badges */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span className="text-[11px] text-stone-400 font-medium">{fmtDuration(item.duration_mins)}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${teamStyle(item.team)}`}>
                            {item.team}
                          </span>
                          {isExpanded ? <ChevronDown className="w-3 h-3 text-stone-400" /> : <ChevronRight className="w-3 h-3 text-stone-400 opacity-0 group-hover:opacity-100" />}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-3 border-t border-stone-100 pt-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="text-[10px] text-stone-400 font-medium uppercase block mb-1">Duration</label>
                              <input
                                type="number"
                                defaultValue={item.duration_mins}
                                onBlur={e => handleFieldSave(item, 'duration_mins', parseInt(e.target.value) || 30)}
                                className="w-full text-sm border border-stone-200 rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-rose-300"
                              />
                              <span className="text-[10px] text-stone-400">minutes</span>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-[10px] text-stone-400 font-medium uppercase block mb-1">Team</label>
                              <div className="flex gap-1 flex-wrap">
                                {TEAMS.map(t => (
                                  <button key={t} onClick={() => handleFieldSave(item, 'team', t)}
                                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium transition-colors ${
                                      item.team === t ? teamStyle(t) + ' ring-1 ring-offset-1 ring-stone-300' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                                    }`}>
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-stone-400 font-medium uppercase block mb-1">Notes</label>
                            <textarea
                              defaultValue={item.description ?? ''}
                              onBlur={e => handleFieldSave(item, 'description', e.target.value)}
                              rows={2}
                              placeholder="Add notes, instructions…"
                              className="w-full text-sm border border-stone-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-rose-300 resize-none"
                            />
                          </div>
                          <button onClick={() => handleDelete(item)}
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 transition-colors">
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
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

      {/* Add item form */}
      {adding && (
        <div className="mt-3 bg-white border border-stone-300 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">New item</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div>
              <label className="text-[10px] text-stone-400 block mb-1">Time *</label>
              <input
                type="time"
                value={addForm.time}
                onChange={e => setAddForm(f => ({ ...f, time: e.target.value }))}
                className="w-full text-sm border border-stone-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <div className="col-span-2 sm:col-span-2">
              <label className="text-[10px] text-stone-400 block mb-1">Title *</label>
              <input
                ref={addTitleRef}
                value={addForm.title}
                onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setAdding(false) }}
                placeholder="e.g. Pheras begin"
                className="w-full text-sm border border-stone-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
            <div>
              <label className="text-[10px] text-stone-400 block mb-1">Duration (min)</label>
              <input
                type="number"
                value={addForm.duration_mins}
                onChange={e => setAddForm(f => ({ ...f, duration_mins: e.target.value }))}
                className="w-full text-sm border border-stone-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>
          </div>

          {/* Team chips */}
          <div className="mb-3">
            <label className="text-[10px] text-stone-400 block mb-1.5">Team</label>
            <div className="flex gap-1 flex-wrap">
              {TEAMS.map(t => (
                <button key={t} onClick={() => setAddForm(f => ({ ...f, team: t }))}
                  className={`text-[10px] px-2 py-1 rounded-full font-medium transition-colors ${
                    addForm.team === t ? teamStyle(t) : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <label className="text-[10px] text-stone-400 block mb-1">Notes (optional)</label>
            <input
              value={addForm.description}
              onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Responsible party, location, instructions…"
              className="w-full text-sm border border-stone-200 rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-rose-300"
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" className="bg-rose-700 hover:bg-rose-800" onClick={handleAdd}
              disabled={!addForm.time || !addForm.title.trim()}>
              Add item
            </Button>
          </div>
        </div>
      )}

      {!adding && eventItems.length > 0 && (
        <button onClick={() => { setAdding(true); setTimeout(() => addTitleRef.current?.focus(), 50) }}
          className="mt-3 ml-24 flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add item
        </button>
      )}
    </div>
  )
}

// ─── Inline editable time ──────────────────────────────────────────────────────

function InlineTimeEdit({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)

  if (editing) return (
    <input autoFocus type="time" defaultValue={value}
      onBlur={e => { setEditing(false); if (e.target.value) onSave(e.target.value) }}
      onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
      className="w-14 text-xs border border-rose-300 rounded px-1 py-0.5 outline-none"
    />
  )
  return (
    <button onClick={() => setEditing(true)}
      className="text-xs font-semibold text-stone-600 hover:text-rose-600 transition-colors whitespace-nowrap">
      {fmtTime(value)}
    </button>
  )
}

// ─── Inline editable title ────────────────────────────────────────────────────

function InlineTitleEdit({ value, status, onSave }: { value: string; status: Status; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  function commit() {
    setEditing(false)
    if (val.trim() && val.trim() !== value) onSave(val.trim())
    else setVal(value)
  }

  if (editing) return (
    <input autoFocus value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setEditing(false); setVal(value) } }}
      onClick={e => e.stopPropagation()}
      className="w-full text-sm font-medium border border-rose-300 rounded px-1 py-0.5 outline-none bg-white"
    />
  )
  return (
    <p onClick={e => { e.stopPropagation(); setVal(value); setEditing(true) }}
      className={`text-sm font-medium cursor-text leading-snug ${status === 'done' ? 'line-through text-stone-400' : 'text-stone-800 hover:text-rose-700'}`}>
      {value}
    </p>
  )
}
