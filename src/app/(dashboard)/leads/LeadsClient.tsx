'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, X, Clock, User, CalendarDays, Users, MapPin, ExternalLink, Loader2, TrendingUp, IndianRupee } from 'lucide-react'
import Link from 'next/link'
import { acceptLead, declineLead } from './actions'

type ProgressInfo = { total: number; done: number; nextEvent: string | null }

interface Lead {
  id: string
  status: string
  message: string | null
  wedding_id: string | null
  created_at: string
  celebration: {
    id: string
    name: string
    type: string
    event_date: string | null
    venue: string | null
    city: string | null
    guest_count: number
    budget: number
  } | null
  client_email: string | null
}

const TYPE_LABELS: Record<string, string> = {
  wedding: 'Wedding', sagai: 'Sagai', sangeet: 'Sangeet', birthday: 'Birthday',
  anniversary: 'Anniversary', puja: 'Puja', namkaran: 'Namkaran',
  griha_pravesh: 'Griha Pravesh', godh_bharai: 'Godh Bharai',
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 24) return hours === 0 ? 'Just now' : `${hours}h ago`
  const days = Math.floor(diff / 86400000)
  return `${days}d ago`
}

// ── Lead Heat Score ────────────────────────────────────────────
// Score 0–100 based on urgency, budget, guest count, freshness
function computeLeadScore(lead: Lead): { score: number; label: string; color: string; flames: number } {
  let score = 0
  const cel = lead.celebration

  // 1. Days until event (most important — 40 pts)
  if (cel?.event_date) {
    const days = Math.ceil((new Date(cel.event_date).getTime() - Date.now()) / 86400000)
    if (days < 0) score += 0          // already passed
    else if (days <= 30) score += 40  // very urgent
    else if (days <= 90) score += 30  // urgent
    else if (days <= 180) score += 20 // planning phase
    else score += 10                  // early planning
  } else {
    score += 5 // no date = low urgency signal
  }

  // 2. Budget (25 pts)
  const budget = cel?.budget || 0
  if (budget >= 2000000) score += 25       // 20L+
  else if (budget >= 1000000) score += 20  // 10L+
  else if (budget >= 500000) score += 15   // 5L+
  else if (budget > 0) score += 10         // some budget
  else score += 5                          // no budget info (still a lead)

  // 3. Guest count (20 pts)
  const guests = cel?.guest_count || 0
  if (guests >= 500) score += 20
  else if (guests >= 300) score += 15
  else if (guests >= 100) score += 10
  else if (guests > 0) score += 5

  // 4. Freshness (15 pts) — leads that came in recently
  const daysSinceInquiry = Math.floor((Date.now() - new Date(lead.created_at).getTime()) / 86400000)
  if (daysSinceInquiry === 0) score += 15
  else if (daysSinceInquiry <= 2) score += 12
  else if (daysSinceInquiry <= 7) score += 8
  else score += 3

  const clamped = Math.min(100, score)
  const flames = clamped >= 80 ? 3 : clamped >= 50 ? 2 : 1
  const label = clamped >= 80 ? 'Hot lead' : clamped >= 50 ? 'Warm' : 'Cool'
  const color = clamped >= 80 ? 'text-red-600 bg-red-50 border-red-100' : clamped >= 50 ? 'text-amber-600 bg-amber-50 border-amber-100' : 'text-stone-500 bg-stone-50 border-stone-100'

  return { score: clamped, label, color, flames }
}

export default function LeadsClient({ initialLeads, progressMap = {} }: {
  initialLeads: Lead[]
  progressMap?: Record<string, ProgressInfo>
}) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const [processing, setProcessing] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<'pending' | 'accepted' | 'declined'>('pending')

  function handleAccept(lead: Lead) {
    setProcessing(lead.id)
    startTransition(async () => {
      const res = await acceptLead(lead.id)
      setProcessing(null)
      if ('error' in res) {
        toast.error(res.error)
        return
      }
      toast.success('Lead accepted! Wedding created and invite sent.')
      setLeads(prev => prev.map(l => l.id === lead.id
        ? { ...l, status: 'accepted', wedding_id: res.weddingId ?? null }
        : l
      ))
    })
  }

  function handleDecline(lead: Lead) {
    setProcessing(lead.id)
    startTransition(async () => {
      const res = await declineLead(lead.id)
      setProcessing(null)
      if ('error' in res) { toast.error(res.error); return }
      setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'declined' } : l))
    })
  }

  const filtered = leads.filter(l => l.status === tab)
  const pendingCount  = leads.filter(l => l.status === 'pending').length
  const acceptedCount = leads.filter(l => l.status === 'accepted').length
  const pipelineValue = leads
    .filter(l => l.status !== 'declined' && l.celebration?.budget)
    .reduce((s, l) => s + (l.celebration?.budget ?? 0), 0)

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Leads & CRM</h1>
        <p className="text-stone-500 text-sm mt-1">Manage client enquiries and active event pipeline</p>
      </div>

      {/* Pipeline metrics */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-amber-500" />
            <p className="text-xs text-stone-500 font-medium">Pending</p>
          </div>
          <p className="text-2xl font-bold text-stone-900">{pendingCount}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <p className="text-xs text-stone-500 font-medium">Active</p>
          </div>
          <p className="text-2xl font-bold text-stone-900">{acceptedCount}</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <IndianRupee className="w-4 h-4 text-rose-500" />
            <p className="text-xs text-stone-500 font-medium">Pipeline</p>
          </div>
          <p className="text-lg font-bold text-stone-900">
            {pipelineValue >= 100000
              ? `₹${(pipelineValue / 100000).toFixed(1)}L`
              : pipelineValue > 0 ? `₹${pipelineValue.toLocaleString('en-IN')}` : '—'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-xl p-1 w-fit">
        {(['pending', 'accepted', 'declined'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}>
            {t}
            {t === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-rose-600 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-stone-200 rounded-2xl">
          {tab === 'pending' ? (
            <>
              <Clock className="w-10 h-10 mx-auto mb-3 text-stone-200" />
              <p className="text-sm font-semibold text-stone-600">No pending leads</p>
              <p className="text-xs text-stone-400 mt-1">When clients connect with you, they'll appear here</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-stone-200" />
              <p className="text-sm text-stone-500">No {tab} leads yet</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(lead => (
            <div key={lead.id} className={`bg-white border rounded-2xl overflow-hidden ${
              lead.status === 'pending' ? 'border-rose-200 shadow-sm' : 'border-stone-200'
            }`}>
              {/* Lead header */}
              <div className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-semibold text-stone-900">
                        {lead.celebration?.name || 'Unnamed celebration'}
                      </span>
                      <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full font-medium">
                        {TYPE_LABELS[lead.celebration?.type ?? ''] || lead.celebration?.type || 'Event'}
                      </span>
                      {(() => {
                        const { label, color, flames, score } = computeLeadScore(lead)
                        return (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${color}`}>
                            {'🔥'.repeat(flames)} {label} · {score}
                          </span>
                        )
                      })()}
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5 flex items-center gap-1">
                      <User className="w-3 h-3" /> {lead.client_email || 'Unknown'} · {fmtAgo(lead.created_at)}
                    </p>
                  </div>
                  {lead.status === 'accepted' && (
                    <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium flex-shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Accepted
                    </span>
                  )}
                  {lead.status === 'declined' && (
                    <span className="text-xs bg-stone-100 text-stone-500 px-2 py-1 rounded-full font-medium flex-shrink-0">
                      Declined
                    </span>
                  )}
                </div>

                {/* Celebration details */}
                {lead.celebration && (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                    {lead.celebration.event_date && (
                      <span className="text-xs text-stone-500 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" /> {fmtDate(lead.celebration.event_date)}
                      </span>
                    )}
                    {(lead.celebration.venue || lead.celebration.city) && (
                      <span className="text-xs text-stone-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {[lead.celebration.venue, lead.celebration.city].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {lead.celebration.guest_count > 0 && (
                      <span className="text-xs text-stone-500 flex items-center gap-1">
                        <Users className="w-3 h-3" /> ~{lead.celebration.guest_count} guests
                      </span>
                    )}
                    {lead.celebration.budget > 0 && (
                      <span className="text-xs text-stone-500">
                        Budget: ₹{lead.celebration.budget.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                )}

                {/* Client message */}
                {lead.message && (
                  <div className="mt-3 bg-stone-50 rounded-lg px-3 py-2 text-sm text-stone-600 italic">
                    "{lead.message}"
                  </div>
                )}
              </div>

              {/* Actions */}
              {lead.status === 'pending' && (
                <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 flex items-center gap-2 justify-end">
                  <p className="text-xs text-stone-400 flex-1">
                    Accepting creates a new wedding and sends the client a portal invite
                  </p>
                  <button onClick={() => handleDecline(lead)}
                    disabled={isPending && processing === lead.id}
                    className="flex items-center gap-1.5 text-sm text-stone-500 px-3 py-1.5 rounded-lg hover:bg-stone-100 transition-colors">
                    <X className="w-3.5 h-3.5" /> Decline
                  </button>
                  <button onClick={() => handleAccept(lead)}
                    disabled={isPending && processing === lead.id}
                    className="flex items-center gap-1.5 text-sm bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50 transition-colors">
                    {isPending && processing === lead.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <CheckCircle2 className="w-3.5 h-3.5" />
                    }
                    Accept
                  </button>
                </div>
              )}

              {lead.status === 'accepted' && lead.wedding_id && (() => {
                const prog = progressMap[lead.wedding_id]
                const pct = prog && prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : null
                return (
                  <div className="px-5 py-3 bg-stone-50 border-t border-stone-100 space-y-2">
                    {prog && prog.total > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-stone-500">Checklist progress</span>
                          <span className="text-xs font-medium text-stone-700">{prog.done}/{prog.total} · {pct}%</span>
                        </div>
                        <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                    {prog?.nextEvent && (
                      <p className="text-xs text-stone-500 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" /> Next: {prog.nextEvent}
                      </p>
                    )}
                    <div className="flex gap-3 pt-1">
                      <Link href={`/weddings/${lead.wedding_id}/overview`}
                        className="flex items-center gap-1.5 text-sm text-rose-600 hover:text-rose-800 font-medium">
                        Open wedding <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      <Link href={`/weddings/${lead.wedding_id}/checklist`}
                        className="text-sm text-stone-500 hover:text-stone-700">
                        Checklist →
                      </Link>
                    </div>
                  </div>
                )
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
