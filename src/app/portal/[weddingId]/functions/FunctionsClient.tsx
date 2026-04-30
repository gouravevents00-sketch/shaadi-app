'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CalendarDays, MapPin, Users, Plus, Trash2, Clock, Sparkles, X } from 'lucide-react'
import { addFunctionRequest, deleteFunctionRequest } from './actions'

interface Event {
  id: string; name: string; date: string; start_time: string | null
  end_time: string | null; venue: string; city: string | null
  expected_count: number; type: string; notes: string | null
}

interface FuncReq { id: string; title: string; status: string; category: string }

const TYPE_COLORS: Record<string, string> = {
  ceremony: 'bg-rose-100 text-rose-700',
  celebration: 'bg-purple-100 text-purple-700',
  reception: 'bg-blue-100 text-blue-700',
  pre_wedding: 'bg-amber-100 text-amber-700',
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

const CEREMONY_SUGGESTIONS = [
  'Haldi', 'Mehendi', 'Sangeet', 'Tilak', 'Jai Mala', 'Vidai',
  'Reception', 'Ring Ceremony', 'Ganesh Puja', 'Grihapravesh',
]

export default function FunctionsClient({ weddingId, events, requirements }: {
  weddingId: string; events: Event[]; requirements: FuncReq[]
}) {
  const [reqs, setReqs] = useState<FuncReq[]>(requirements)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSuggestion(s: string) {
    setTitle(s)
    setShowForm(true)
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    const optimistic: FuncReq = { id: `opt-${Date.now()}`, title: title.trim(), status: 'open', category: 'Function Request' }
    setReqs(r => [...r, optimistic])
    setTitle(''); setNotes(''); setShowForm(false)
    startTransition(async () => {
      const res = await addFunctionRequest(weddingId, optimistic.title, notes || undefined)
      if ('error' in res) {
        toast.error(res.error)
        setReqs(r => r.filter(x => x.id !== optimistic.id))
      } else {
        setReqs(r => r.map(x => x.id === optimistic.id ? { ...x, id: res.id } : x))
        toast.success('Request sent!')
      }
    })
  }

  function handleDelete(req: FuncReq) {
    setReqs(r => r.filter(x => x.id !== req.id))
    startTransition(async () => {
      const res = await deleteFunctionRequest(weddingId, req.id)
      if ('error' in res) { toast.error(res.error); setReqs(r => [...r, req]) }
    })
  }

  // Group events by date
  const byDate = events.reduce<Record<string, Event[]>>((acc, e) => {
    acc[e.date] = acc[e.date] || []
    acc[e.date].push(e)
    return acc
  }, {})
  const dates = Object.keys(byDate).sort()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Functions & Ceremonies</h2>
        <p className="text-sm text-stone-400 mt-0.5">Your planned events · request additions below</p>
      </div>

      {/* Events */}
      {events.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
          <CalendarDays className="w-10 h-10 mx-auto mb-3 text-stone-200" />
          <p className="text-sm font-semibold text-stone-600">No events planned yet</p>
          <p className="text-xs text-stone-400 mt-1">Your coordinator will add events — you can request below</p>
        </div>
      ) : (
        <div className="space-y-4">
          {dates.map(date => (
            <div key={date}>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{fmtDate(date)}</p>
              <div className="bg-white border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100">
                {byDate[date].map(ev => (
                  <div key={ev.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-stone-800">{ev.name}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${TYPE_COLORS[ev.type] || 'bg-stone-100 text-stone-500'}`}>
                            {ev.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                          {ev.start_time && (
                            <span className="text-xs text-stone-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {ev.start_time.slice(0, 5)}{ev.end_time ? ` – ${ev.end_time.slice(0, 5)}` : ''}
                            </span>
                          )}
                          {ev.venue && (
                            <span className="text-xs text-stone-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {[ev.venue, ev.city].filter(Boolean).join(', ')}
                            </span>
                          )}
                          {ev.expected_count > 0 && (
                            <span className="text-xs text-stone-500 flex items-center gap-1">
                              <Users className="w-3 h-3" /> ~{ev.expected_count} guests
                            </span>
                          )}
                        </div>
                        {ev.notes && (
                          <p className="text-xs text-stone-400 mt-1.5 italic">{ev.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Request section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-800">Request a function</p>
            <p className="text-xs text-stone-400 mt-0.5">Ask your coordinator to add a ceremony or event</p>
          </div>
          <button onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-700 text-white text-xs rounded-lg hover:bg-rose-800 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Request
          </button>
        </div>

        {/* Quick suggestions */}
        {!showForm && (
          <div className="flex flex-wrap gap-2">
            {CEREMONY_SUGGESTIONS.map(s => (
              <button key={s} onClick={() => handleSuggestion(s)}
                className="text-xs px-3 py-1.5 bg-stone-100 text-stone-600 rounded-full hover:bg-rose-50 hover:text-rose-700 transition-colors">
                + {s}
              </button>
            ))}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleAdd} className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Ceremony / Function name *</label>
              <input required autoFocus value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Haldi, Reception, Tilak…"
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Notes (optional)</label>
              <input value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Only for close family, morning slot preferred"
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setShowForm(false); setTitle(''); setNotes('') }}
                className="text-sm text-stone-500 px-3 py-1.5 hover:text-stone-700">Cancel</button>
              <button type="submit" disabled={isPending}
                className="text-sm bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">
                Send request
              </button>
            </div>
          </form>
        )}

        {/* Existing requests */}
        {reqs.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Your requests</p>
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100">
              {reqs.map(req => (
                <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                  <span className="flex-1 text-sm text-stone-700">{req.title}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    req.status === 'done' ? 'bg-emerald-100 text-emerald-700' :
                    req.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {req.status === 'done' ? 'Added' : req.status === 'in_progress' ? 'In progress' : 'Pending'}
                  </span>
                  {req.status === 'open' && (
                    <button onClick={() => handleDelete(req)}
                      className="text-stone-200 hover:text-red-400 transition-colors flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
