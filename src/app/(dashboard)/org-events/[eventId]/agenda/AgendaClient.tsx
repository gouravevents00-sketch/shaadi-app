'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Clock, MapPin, ChevronDown, ChevronRight, Mic, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { createSession, updateSession, deleteSession, assignSpeaker, removeSpeakerFromSession } from './actions'

type SessionType = 'keynote' | 'panel' | 'workshop' | 'break' | 'networking' | 'other'
type SessionStatus = 'scheduled' | 'live' | 'completed' | 'cancelled'

interface SessionSpeaker {
  speaker_id: string
  role: string
  speaker: { id: string; name: string; title: string | null; organization: string | null }
}

interface Session {
  id: string
  title: string
  description: string | null
  date: string | null
  start_time: string
  end_time: string | null
  venue: string | null
  type: SessionType
  status: SessionStatus
  order: number
  session_speakers: SessionSpeaker[]
}

interface Speaker {
  id: string
  name: string
  title: string | null
  organization: string | null
}

const SESSION_TYPES: { value: SessionType; label: string; color: string }[] = [
  { value: 'keynote',     label: 'Keynote',      color: 'bg-purple-100 text-purple-700' },
  { value: 'panel',       label: 'Panel',        color: 'bg-blue-100 text-blue-700' },
  { value: 'workshop',    label: 'Workshop',     color: 'bg-amber-100 text-amber-700' },
  { value: 'networking',  label: 'Networking',   color: 'bg-emerald-100 text-emerald-700' },
  { value: 'break',       label: 'Break',        color: 'bg-stone-100 text-stone-500' },
  { value: 'other',       label: 'Other',        color: 'bg-stone-100 text-stone-600' },
]

const STATUS_OPTS: { value: SessionStatus; label: string }[] = [
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'live',      label: 'Live' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function typeStyle(t: SessionType) {
  return SESSION_TYPES.find(s => s.value === t)?.color ?? 'bg-stone-100 text-stone-600'
}

function fmt12(t: string) {
  const [h, m] = t.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`
}

const EMPTY_FORM = {
  title: '', type: 'other' as SessionType, date: '', start_time: '', end_time: '',
  venue: '', description: '',
}

export default function AgendaClient({
  eventId,
  initialSessions,
  speakers,
}: {
  eventId: string
  initialSessions: Session[]
  speakers: Speaker[]
}) {
  const [sessions, setSessions] = useState<Session[]>(initialSessions)
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Session | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [assignOpen, setAssignOpen] = useState<string | null>(null)  // sessionId
  const [assignRole, setAssignRole] = useState('speaker')
  const [assignSpeakerId, setAssignSpeakerId] = useState('')

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setOpen(true)
  }

  function openEdit(s: Session) {
    setEditTarget(s)
    setForm({
      title: s.title, type: s.type, date: s.date ?? '',
      start_time: s.start_time, end_time: s.end_time ?? '',
      venue: s.venue ?? '', description: s.description ?? '',
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.start_time) { toast.error('Title and start time required'); return }
    setLoading(true)
    const payload = {
      title: form.title.trim(),
      type: form.type,
      date: form.date || null,
      start_time: form.start_time,
      end_time: form.end_time || null,
      venue: form.venue.trim() || null,
      description: form.description.trim() || null,
    }

    if (editTarget) {
      const res = await updateSession(eventId, editTarget.id, payload)
      if (res.error) { toast.error(res.error); setLoading(false); return }
      setSessions(ss => ss.map(s => s.id === editTarget.id ? { ...s, ...payload } : s))
      toast.success('Session updated')
    } else {
      const res = await createSession(eventId, payload)
      if (res.error) { toast.error(res.error); setLoading(false); return }
      setSessions(ss => [...ss, { ...payload, id: res.id!, order: 0, status: 'scheduled', session_speakers: [] }])
      toast.success('Session added')
    }
    setLoading(false)
    setOpen(false)
  }

  async function handleDelete(id: string) {
    const res = await deleteSession(eventId, id)
    if (res.error) { toast.error(res.error); return }
    setSessions(ss => ss.filter(s => s.id !== id))
    toast.success('Session deleted')
  }

  async function handleStatusChange(s: Session, status: SessionStatus) {
    const res = await updateSession(eventId, s.id, { status })
    if (res.error) { toast.error(res.error); return }
    setSessions(ss => ss.map(x => x.id === s.id ? { ...x, status } : x))
  }

  async function handleAssign() {
    if (!assignSpeakerId || !assignOpen) return
    setLoading(true)
    const res = await assignSpeaker(eventId, assignOpen, assignSpeakerId, assignRole)
    if (res.error) { toast.error(res.error); setLoading(false); return }
    const spk = speakers.find(s => s.id === assignSpeakerId)!
    setSessions(ss => ss.map(s => s.id === assignOpen
      ? { ...s, session_speakers: [...s.session_speakers.filter(ss => ss.speaker_id !== assignSpeakerId), { speaker_id: assignSpeakerId, role: assignRole, speaker: spk }] }
      : s
    ))
    toast.success('Speaker assigned')
    setLoading(false)
    setAssignOpen(null)
    setAssignSpeakerId('')
    setAssignRole('speaker')
  }

  async function handleRemoveSpeaker(sessionId: string, speakerId: string) {
    const res = await removeSpeakerFromSession(eventId, sessionId, speakerId)
    if (res.error) { toast.error(res.error); return }
    setSessions(ss => ss.map(s => s.id === sessionId
      ? { ...s, session_speakers: s.session_speakers.filter(x => x.speaker_id !== speakerId) }
      : s
    ))
  }

  // Group by date
  const grouped = sessions.reduce<Record<string, Session[]>>((acc, s) => {
    const key = s.date ?? 'No date'
    ;(acc[key] ??= []).push(s)
    return acc
  }, {})
  const sortedDates = Object.keys(grouped).sort()

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Agenda</h1>
          <p className="text-stone-500 text-sm mt-0.5">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate} className="bg-stone-900 hover:bg-stone-800">
          <Plus className="w-4 h-4 mr-1.5" /> Add session
        </Button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-stone-200 rounded-xl">
          <Clock className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 font-medium">No sessions yet</p>
          <p className="text-stone-400 text-sm mt-1">Add keynotes, panels, breaks and more.</p>
          <Button onClick={openCreate} className="mt-4 bg-stone-900 hover:bg-stone-800">
            <Plus className="w-4 h-4 mr-1.5" /> Add session
          </Button>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDates.map(date => (
            <div key={date}>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                {date === 'No date' ? 'Undated' : new Date(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <div className="space-y-2">
                {grouped[date].sort((a, b) => a.start_time.localeCompare(b.start_time)).map(s => {
                  const isExpanded = expanded.has(s.id)
                  return (
                    <div key={s.id} className="border border-stone-200 rounded-xl overflow-hidden">
                      {/* Row */}
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50">
                        <button
                          onClick={() => setExpanded(e => { const n = new Set(e); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n })}
                          className="text-stone-400"
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <span className="text-sm text-stone-500 w-28 flex-shrink-0">
                          {fmt12(s.start_time)}{s.end_time ? ` – ${fmt12(s.end_time)}` : ''}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${typeStyle(s.type)}`}>
                          {s.type}
                        </span>
                        <p className="font-medium text-stone-900 text-sm flex-1">{s.title}</p>
                        {s.venue && (
                          <span className="text-xs text-stone-400 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {s.venue}
                          </span>
                        )}
                        {/* Status select */}
                        <select
                          value={s.status}
                          onChange={e => handleStatusChange(s, e.target.value as SessionStatus)}
                          className="text-xs border border-stone-200 rounded-md px-2 py-1 text-stone-600 bg-white"
                          onClick={e => e.stopPropagation()}
                        >
                          {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                        <button onClick={() => openEdit(s)} className="text-xs text-stone-400 hover:text-stone-700 px-1">Edit</button>
                        <button onClick={() => handleDelete(s.id)} className="text-stone-300 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Expanded panel */}
                      {isExpanded && (
                        <div className="border-t border-stone-100 px-4 py-3 bg-stone-50 space-y-3">
                          {s.description && <p className="text-sm text-stone-600">{s.description}</p>}

                          {/* Speakers */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Speakers</p>
                              {speakers.length > 0 && (
                                <button
                                  onClick={() => { setAssignOpen(s.id); setAssignSpeakerId(''); setAssignRole('speaker') }}
                                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3" /> Assign
                                </button>
                              )}
                            </div>
                            {s.session_speakers.length === 0 ? (
                              <p className="text-xs text-stone-400">No speakers assigned</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {s.session_speakers.map(ss => (
                                  <div key={ss.speaker_id} className="flex items-center gap-1.5 bg-white border border-stone-200 rounded-lg px-2.5 py-1.5">
                                    <Mic className="w-3 h-3 text-stone-400" />
                                    <span className="text-xs font-medium text-stone-800">{ss.speaker.name}</span>
                                    <span className="text-xs text-stone-400 capitalize">{ss.role}</span>
                                    <button onClick={() => handleRemoveSpeaker(s.id, ss.speaker_id)} className="text-stone-300 hover:text-red-500 ml-1">
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit session' : 'Add session'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input placeholder="e.g. Opening Keynote" value={form.title} onChange={e => setF('title', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <select
                  value={form.type}
                  onChange={e => setF('type', e.target.value)}
                  className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 bg-white"
                >
                  {SESSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={e => setF('date', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start time *</Label>
                <Input type="time" value={form.start_time} onChange={e => setF('start_time', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>End time</Label>
                <Input type="time" value={form.end_time} onChange={e => setF('end_time', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Room / Venue</Label>
              <Input placeholder="e.g. Hall A, Main Stage" value={form.venue} onChange={e => setF('venue', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <textarea
                placeholder="Brief description of this session…"
                value={form.description}
                onChange={e => setF('description', e.target.value)}
                rows={2}
                className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 resize-none focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-stone-900 hover:bg-stone-800" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving…' : editTarget ? 'Update' : 'Add session'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign speaker dialog */}
      <Dialog open={!!assignOpen} onOpenChange={() => setAssignOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign speaker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Speaker</Label>
              <select
                value={assignSpeakerId}
                onChange={e => setAssignSpeakerId(e.target.value)}
                className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 bg-white"
              >
                <option value="">Select speaker…</option>
                {speakers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name}{s.organization ? ` — ${s.organization}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <select
                value={assignRole}
                onChange={e => setAssignRole(e.target.value)}
                className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-800 bg-white"
              >
                <option value="speaker">Speaker</option>
                <option value="moderator">Moderator</option>
                <option value="panelist">Panelist</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(null)}>Cancel</Button>
            <Button className="bg-stone-900 hover:bg-stone-800" onClick={handleAssign} disabled={loading || !assignSpeakerId}>
              {loading ? 'Assigning…' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
