'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Plus, Trash2, Save, Printer, GripVertical, Clock, User2,
  Music, Lightbulb, Mic2, Truck, Sparkles, MoreHorizontal, ChevronDown, ChevronRight,
} from 'lucide-react'
import { saveShowFlow, type ShowFlowCue } from './actions'

// ── Types ──────────────────────────────────────────────────────
interface WeddingEvent {
  id: string; name: string; date: string
  start_time: string | null; end_time: string | null; venue: string | null
}
interface TeamMember { userId: string; role: string; name: string }

const CUE_TYPES: { value: ShowFlowCue['cue_type']; label: string; icon: React.ElementType; color: string }[] = [
  { value: 'ritual',    label: 'Ritual',    icon: Sparkles, color: 'bg-rose-100 text-rose-700' },
  { value: 'mc',        label: 'MC',        icon: Mic2,     color: 'bg-purple-100 text-purple-700' },
  { value: 'music',     label: 'Music',     icon: Music,    color: 'bg-blue-100 text-blue-700' },
  { value: 'lighting',  label: 'Lighting',  icon: Lightbulb,color: 'bg-amber-100 text-amber-700' },
  { value: 'logistics', label: 'Logistics', icon: Truck,    color: 'bg-stone-100 text-stone-700' },
  { value: 'other',     label: 'Other',     icon: MoreHorizontal, color: 'bg-stone-100 text-stone-500' },
]

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}
function addMinutes(time: string, mins: number) {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + mins
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

// ── Auto-generate cues from event name ────────────────────────
const EVENT_CUES: Record<string, { label: string; duration_min: number; cue_type: ShowFlowCue['cue_type'] }[]> = {
  Haldi:     [{ label: 'MC Welcome', duration_min: 5, cue_type: 'mc' }, { label: 'Haldi ceremony begins', duration_min: 30, cue_type: 'ritual' }, { label: 'Photo session', duration_min: 15, cue_type: 'other' }],
  Mehandi:   [{ label: 'Guests seated, mehandi starts', duration_min: 5, cue_type: 'ritual' }, { label: 'Live music', duration_min: 60, cue_type: 'music' }, { label: 'Snacks served', duration_min: 20, cue_type: 'logistics' }],
  Sagai:     [{ label: 'MC intro & welcome', duration_min: 5, cue_type: 'mc' }, { label: 'Ring exchange ceremony', duration_min: 20, cue_type: 'ritual' }, { label: 'Gifts presented', duration_min: 15, cue_type: 'ritual' }, { label: 'Photo session', duration_min: 15, cue_type: 'other' }],
  Sangeet:   [{ label: 'MC opens show', duration_min: 5, cue_type: 'mc' }, { label: 'Performances begin', duration_min: 60, cue_type: 'music' }, { label: 'Couple dance', duration_min: 10, cue_type: 'music' }, { label: 'Dinner open', duration_min: 30, cue_type: 'logistics' }],
  Baraat:    [{ label: 'Groom mounted on ghodi', duration_min: 5, cue_type: 'ritual' }, { label: 'Baraat procession starts', duration_min: 30, cue_type: 'ritual' }, { label: 'Dhol / band playing', duration_min: 30, cue_type: 'music' }, { label: 'Milni ceremony', duration_min: 15, cue_type: 'ritual' }],
  Pheras:    [{ label: 'Pandit starts', duration_min: 5, cue_type: 'ritual' }, { label: 'Jai mala', duration_min: 10, cue_type: 'ritual' }, { label: 'Saat pheras', duration_min: 45, cue_type: 'ritual' }, { label: 'Sindoor ceremony', duration_min: 10, cue_type: 'ritual' }],
  Reception: [{ label: 'Doors open', duration_min: 5, cue_type: 'logistics' }, { label: 'Couple entrance', duration_min: 10, cue_type: 'ritual' }, { label: 'Welcome toast', duration_min: 10, cue_type: 'mc' }, { label: 'Dinner open', duration_min: 45, cue_type: 'logistics' }, { label: 'DJ / live music', duration_min: 60, cue_type: 'music' }],
  Vidaai:    [{ label: 'Vidaai rituals begin', duration_min: 20, cue_type: 'ritual' }, { label: 'Bride departs', duration_min: 10, cue_type: 'ritual' }, { label: 'Photo / video', duration_min: 15, cue_type: 'other' }],
}

function generateCuesForEvent(event: WeddingEvent): ShowFlowCue[] {
  const template = EVENT_CUES[event.name] ?? [{ label: `${event.name} begins`, duration_min: 30, cue_type: 'ritual' as ShowFlowCue['cue_type'] }]
  const startTime = event.start_time?.slice(0, 5) ?? '10:00'
  let currentTime = startTime
  return template.map(t => {
    const cue: ShowFlowCue = { id: crypto.randomUUID(), event_id: event.id, time: currentTime, duration_min: t.duration_min, label: t.label, assignee: '', cue_type: t.cue_type, notes: '' }
    currentTime = addMinutes(currentTime, t.duration_min)
    return cue
  })
}

// ── Cue row component ──────────────────────────────────────────
function CueRow({ cue, teamMembers, onChange, onDelete }: {
  cue: ShowFlowCue; teamMembers: TeamMember[]
  onChange: (updated: ShowFlowCue) => void; onDelete: () => void
}) {
  const typeInfo = CUE_TYPES.find(t => t.value === cue.cue_type) ?? CUE_TYPES[5]
  const TypeIcon = typeInfo.icon

  return (
    <div className="flex items-start gap-2 px-3 py-2.5 group hover:bg-stone-50 rounded-lg transition-colors">
      <GripVertical className="w-4 h-4 text-stone-200 mt-0.5 flex-shrink-0 cursor-grab group-hover:text-stone-400" />

      {/* Time */}
      <input type="time" value={cue.time} onChange={e => onChange({ ...cue, time: e.target.value })}
        className="w-20 text-xs font-mono border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-rose-400 flex-shrink-0" />

      {/* Duration */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <input type="number" min="1" max="240" value={cue.duration_min} onChange={e => onChange({ ...cue, duration_min: parseInt(e.target.value) || 5 })}
          className="w-14 text-xs border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-rose-400 text-right" />
        <span className="text-xs text-stone-400">min</span>
      </div>

      {/* Type badge */}
      <select value={cue.cue_type} onChange={e => onChange({ ...cue, cue_type: e.target.value as ShowFlowCue['cue_type'] })}
        className="flex-shrink-0">
        <option value="" disabled hidden />
        {CUE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>

      {/* Label */}
      <input value={cue.label} onChange={e => onChange({ ...cue, label: e.target.value })}
        placeholder="Label / cue description"
        className="flex-1 min-w-0 text-sm border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-rose-400" />

      {/* Assignee */}
      <select value={cue.assignee} onChange={e => onChange({ ...cue, assignee: e.target.value })}
        className="w-32 text-xs border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-rose-400 flex-shrink-0">
        <option value="">Assign to…</option>
        {teamMembers.map(m => <option key={m.userId} value={m.name}>{m.name}</option>)}
      </select>

      {/* Delete */}
      <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500 flex-shrink-0 mt-0.5 transition-all">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function ShowFlowClient({
  weddingId, wedding, events, teamMembers, initialCues,
}: {
  weddingId: string
  wedding: { bride_name: string | null; groom_name: string | null; wedding_date: string | null }
  events: WeddingEvent[]
  teamMembers: TeamMember[]
  initialCues: ShowFlowCue[]
}) {
  const [cues, setCues] = useState<ShowFlowCue[]>(initialCues)
  const [saving, setSaving] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // Group by date → event
  const days = Array.from(new Set(events.map(e => e.date))).sort()

  function updateCue(id: string, updated: ShowFlowCue) {
    setCues(prev => prev.map(c => c.id === id ? updated : c))
  }
  function deleteCue(id: string) {
    setCues(prev => prev.filter(c => c.id !== id))
  }
  function addCue(eventId: string) {
    const eventCues = cues.filter(c => c.event_id === eventId)
    const lastCue = eventCues[eventCues.length - 1]
    const newTime = lastCue ? addMinutes(lastCue.time, lastCue.duration_min) : '10:00'
    const newCue: ShowFlowCue = { id: crypto.randomUUID(), event_id: eventId, time: newTime, duration_min: 15, label: '', assignee: '', cue_type: 'other', notes: '' }
    setCues(prev => [...prev, newCue])
  }
  function autoGenerate(event: WeddingEvent) {
    const existing = cues.filter(c => c.event_id === event.id)
    if (existing.length > 0 && !confirm(`Replace ${existing.length} existing cues for "${event.name}"?`)) return
    const generated = generateCuesForEvent(event)
    setCues(prev => [...prev.filter(c => c.event_id !== event.id), ...generated])
    toast.success(`Generated ${generated.length} cues for ${event.name}`)
  }

  const toggleCollapse = useCallback((eventId: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      next.has(eventId) ? next.delete(eventId) : next.add(eventId)
      return next
    })
  }, [])

  async function handleSave() {
    setSaving(true)
    const res = await saveShowFlow(weddingId, cues)
    setSaving(false)
    if ('error' in res) toast.error(res.error)
    else toast.success('Show flow saved!')
  }

  function handlePrint() {
    window.print()
  }

  const coupleName = [wedding.bride_name, wedding.groom_name].filter(Boolean).join(' & ') || 'Show Flow'

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6 print:p-0 print:space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Show Flow Manager</h1>
          <p className="text-stone-500 text-sm mt-1">Minute-by-minute runsheet for {coupleName}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint}
            className="flex items-center gap-1.5 text-sm text-stone-600 px-3 py-2 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors">
            <Printer className="w-4 h-4" /> Print runsheet
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 text-sm bg-rose-700 text-white px-4 py-2 rounded-xl hover:bg-rose-800 disabled:opacity-50 transition-colors">
            <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block text-center pb-4 border-b border-stone-200">
        <h1 className="text-2xl font-bold text-stone-900">{coupleName} — Show Flow Runsheet</h1>
        {wedding.wedding_date && <p className="text-sm text-stone-500">{fmtDate(wedding.wedding_date)}</p>}
      </div>

      {events.length === 0 && (
        <div className="text-center py-16 border border-dashed border-stone-200 rounded-2xl">
          <Clock className="w-10 h-10 mx-auto mb-3 text-stone-200" />
          <p className="text-sm font-semibold text-stone-600">No ceremonies yet</p>
          <p className="text-xs text-stone-400 mt-1">Add ceremonies on the Ceremonies page first</p>
        </div>
      )}

      {/* Day groups */}
      {days.map(day => {
        const dayEvents = events.filter(e => e.date === day)
        return (
          <div key={day}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider px-2">
                {fmtDate(day)}
              </span>
              <div className="h-px flex-1 bg-stone-200" />
            </div>

            <div className="space-y-3">
              {dayEvents.map(event => {
                const eventCues = cues.filter(c => c.event_id === event.id).sort((a, b) => a.time.localeCompare(b.time))
                const isCollapsed = collapsed.has(event.id)

                return (
                  <div key={event.id} className="bg-white border border-stone-200 rounded-2xl overflow-hidden print:border-stone-300">
                    {/* Event header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 border-b border-rose-100 print:bg-white">
                      <button onClick={() => toggleCollapse(event.id)} className="text-stone-400 print:hidden">
                        {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-rose-800">{event.name}</span>
                          {event.start_time && (
                            <span className="text-xs text-rose-600 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> {event.start_time.slice(0, 5)}
                              {event.end_time && ` – ${event.end_time.slice(0, 5)}`}
                            </span>
                          )}
                          {event.venue && <span className="text-xs text-stone-400">{event.venue}</span>}
                        </div>
                        <p className="text-xs text-stone-400 mt-0.5">{eventCues.length} cue{eventCues.length !== 1 ? 's' : ''}</p>
                      </div>
                      <div className="flex items-center gap-2 print:hidden">
                        <button onClick={() => autoGenerate(event)}
                          className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 px-2.5 py-1.5 bg-purple-50 border border-purple-100 rounded-lg font-medium transition-colors">
                          <Sparkles className="w-3 h-3" /> Auto-generate
                        </button>
                        <button onClick={() => addCue(event.id)}
                          className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 px-2.5 py-1.5 bg-white border border-rose-200 rounded-lg font-medium transition-colors">
                          <Plus className="w-3 h-3" /> Add cue
                        </button>
                      </div>
                    </div>

                    {/* Cues */}
                    {!isCollapsed && (
                      <div>
                        {eventCues.length === 0 ? (
                          <div className="px-4 py-6 text-center">
                            <p className="text-xs text-stone-400">No cues yet — click Auto-generate or Add cue</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-stone-50 print:divide-stone-100">
                            {/* Column headers */}
                            <div className="flex items-center gap-2 px-3 py-2 bg-stone-50 print:hidden">
                              <div className="w-4 flex-shrink-0" />
                              <span className="w-20 text-[10px] font-semibold text-stone-400 uppercase tracking-wider flex-shrink-0">Time</span>
                              <span className="w-20 text-[10px] font-semibold text-stone-400 uppercase tracking-wider flex-shrink-0">Duration</span>
                              <span className="w-20 text-[10px] font-semibold text-stone-400 uppercase tracking-wider flex-shrink-0">Type</span>
                              <span className="flex-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">Cue / Description</span>
                              <span className="w-32 text-[10px] font-semibold text-stone-400 uppercase tracking-wider flex-shrink-0">Assigned to</span>
                              <div className="w-5 flex-shrink-0" />
                            </div>
                            {eventCues.map(cue => (
                              <div key={cue.id}>
                                {/* Print view */}
                                <div className="hidden print:flex items-center gap-4 px-4 py-2 text-sm">
                                  <span className="w-12 font-mono text-stone-700 flex-shrink-0">{cue.time}</span>
                                  <span className="w-14 text-stone-400 flex-shrink-0">{cue.duration_min}m</span>
                                  <span className="w-20 text-xs capitalize text-stone-500 flex-shrink-0">{cue.cue_type}</span>
                                  <span className="flex-1 font-medium text-stone-800">{cue.label}</span>
                                  {cue.assignee && (
                                    <span className="flex items-center gap-1 text-xs text-stone-500 flex-shrink-0">
                                      <User2 className="w-3 h-3" /> {cue.assignee}
                                    </span>
                                  )}
                                </div>
                                {/* Edit view */}
                                <div className="print:hidden">
                                  <CueRow cue={cue} teamMembers={teamMembers}
                                    onChange={updated => updateCue(cue.id, updated)}
                                    onDelete={() => deleteCue(cue.id)} />
                                </div>
                              </div>
                            ))}
                            {/* Add cue inline */}
                            <div className="px-4 py-2 print:hidden">
                              <button onClick={() => addCue(event.id)}
                                className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-rose-600 transition-colors">
                                <Plus className="w-3.5 h-3.5" /> Add another cue
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Summary footer */}
      {cues.length > 0 && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex flex-wrap gap-6 print:hidden">
          <div>
            <p className="text-xs text-stone-400">Total cues</p>
            <p className="text-lg font-bold text-stone-900">{cues.length}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400">Events covered</p>
            <p className="text-lg font-bold text-stone-900">{new Set(cues.map(c => c.event_id)).size}/{events.length}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400">Assigned</p>
            <p className="text-lg font-bold text-stone-900">{cues.filter(c => c.assignee).length}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400">Unassigned</p>
            <p className="text-lg font-bold text-rose-600">{cues.filter(c => !c.assignee).length}</p>
          </div>
        </div>
      )}
    </div>
  )
}
