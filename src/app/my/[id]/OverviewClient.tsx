'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  CalendarDays, AlertCircle, CheckCircle2, Users, Wallet,
  Store, Plus, ArrowRight, Sparkles, Crown, Hotel,
  Flame, Shirt, Clock, MapPin,
} from 'lucide-react'

type CelebFunction = {
  id: string; name: string; date: string
  start_time: string | null; end_time: string | null
  venue_space: string | null; expected_count: number | null; sort_order: number
}
type TaskRow = { id: string; status: string; due_date: string | null; title: string; category: string }
type GuestRow = { id: string; rsvp_status: string }
type BudgetRow = { id: string; estimated: number; actual: number | null; status: string }
type VendorRow = { id: string; status: string; category: string }

type Mode = 'plan' | 'track' | 'execute'

const FUNCTION_COLORS = [
  'bg-rose-50 border-rose-200 text-rose-700',
  'bg-amber-50 border-amber-200 text-amber-700',
  'bg-violet-50 border-violet-200 text-violet-700',
  'bg-emerald-50 border-emerald-200 text-emerald-700',
  'bg-blue-50 border-blue-200 text-blue-700',
  'bg-orange-50 border-orange-200 text-orange-700',
  'bg-pink-50 border-pink-200 text-pink-700',
]

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtShort(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
function isOverdue(d: string | null) {
  if (!d) return false
  return new Date(d + 'T00:00:00') < new Date(new Date().toDateString())
}
function daysUntil(d: string) {
  return Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86400000)
}

export default function OverviewClient({
  id, celebration, plan, functions, tasks, guests, budget, vendors, roomCount,
}: {
  id: string
  celebration: Record<string, unknown>
  plan: string
  functions: CelebFunction[]
  tasks: TaskRow[]
  guests: GuestRow[]
  budget: BudgetRow[]
  vendors: VendorRow[]
  roomCount: number
}) {
  const [mode, setMode] = useState<Mode>('plan')
  const isPro = plan === 'pro'

  // ── Stats ──
  const totalTasks = tasks.length
  const doneTasks = tasks.filter(t => t.status === 'done').length
  const overdueTasks = tasks.filter(t => t.status !== 'done' && isOverdue(t.due_date))
  const pct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0

  const totalGuests = guests.length
  const confirmedGuests = guests.filter(g => g.rsvp_status === 'confirmed').length
  const pendingGuests = guests.filter(g => g.rsvp_status === 'pending').length

  const totalEstimated = budget.reduce((s, b) => s + (b.estimated ?? 0), 0)
  const totalPaid = budget.reduce((s, b) => s + (b.actual ?? 0), 0)

  const totalVendors = vendors.length
  const bookedVendors = vendors.filter(v => ['booked', 'confirmed', 'paid'].includes(v.status)).length

  const celebName = (celebration.bride_name as string) && (celebration.groom_name as string)
    ? `${celebration.bride_name} & ${celebration.groom_name}`
    : (celebration.bride_name as string) || (celebration.groom_name as string) || (celebration.name as string)
  const eventDate = celebration.event_date as string | null
  const daysLeft = eventDate ? Math.ceil((new Date(eventDate).getTime() - Date.now()) / 86400000) : null

  // ── Needs Attention (rule-based) ──
  const alerts: { level: 'urgent' | 'warn' | 'info'; msg: string; href: string }[] = []

  if (functions.length === 0) {
    alerts.push({ level: 'info', msg: 'Add your wedding functions to get started', href: '#add-functions' })
  }
  if (overdueTasks.length > 0) {
    alerts.push({ level: 'urgent', msg: `${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''} overdue`, href: `/my/${id}/checklist` })
  }
  if (isPro && pendingGuests > 0 && daysLeft !== null && daysLeft <= 30) {
    alerts.push({ level: 'warn', msg: `${pendingGuests} guests haven't RSVP'd — ${daysLeft} days left`, href: `/my/${id}/guests` })
  }
  if (functions.some(fn => daysUntil(fn.date) <= 60 && daysUntil(fn.date) > 0) && totalVendors === 0) {
    alerts.push({ level: 'warn', msg: 'Functions coming up but no vendors added yet', href: `/my/${id}/vendors` })
  }
  if (isPro && totalGuests > 0 && roomCount === 0) {
    alerts.push({ level: 'info', msg: 'Room assignments not set up yet', href: `/my/${id}/rooms` })
  }

  const alertColors = {
    urgent: 'border-l-4 border-l-red-500 bg-red-50',
    warn:   'border-l-4 border-l-amber-400 bg-amber-50',
    info:   'border-l-4 border-l-blue-400 bg-blue-50',
  }
  const alertIconColors = { urgent: 'text-red-500', warn: 'text-amber-500', info: 'text-blue-500' }

  // ── Sections grid (execute mode shows minimal) ──
  const sections = [
    { href: `/my/${id}/checklist`, icon: CheckCircle2, label: 'Checklist',  value: `${pct}%`, sub: `${doneTasks}/${totalTasks} done`,  color: 'text-emerald-600 bg-emerald-50' },
    { href: `/my/${id}/guests`,    icon: Users,        label: 'Guests',     value: String(isPro ? totalGuests : (celebration.guest_count as number) ?? 0), sub: isPro ? `${confirmedGuests} confirmed` : 'estimated', color: 'text-blue-600 bg-blue-50' },
    { href: `/my/${id}/budget`,    icon: Wallet,       label: 'Budget',     value: totalEstimated > 0 ? `₹${(totalEstimated / 100000).toFixed(1)}L` : '—', sub: totalPaid > 0 ? `₹${(totalPaid / 100000).toFixed(1)}L paid` : 'Not set', color: 'text-amber-600 bg-amber-50' },
    { href: `/my/${id}/vendors`,   icon: Store,        label: 'Vendors',    value: String(totalVendors), sub: `${bookedVendors} booked`, color: 'text-violet-600 bg-violet-50' },
    { href: `/my/${id}/rooms`,     icon: Hotel,        label: 'Rooms',      value: String(roomCount), sub: roomCount > 0 ? 'configured' : 'Not set', color: 'text-stone-600 bg-stone-100' },
    { href: `/my/${id}/outfits`,   icon: Shirt,        label: 'Outfits',    value: '→', sub: 'Manage looks', color: 'text-pink-600 bg-pink-50' },
    { href: `/my/${id}/rituals`,   icon: Flame,        label: 'Rituals',    value: '→', sub: 'Poojan & samagri', color: 'text-orange-600 bg-orange-50' },
    { href: `/my/${id}/tools`,     icon: Sparkles,     label: 'Tools',      value: '→', sub: 'AI + generators', color: 'text-rose-600 bg-rose-50' },
  ]

  return (
    <div className="max-w-2xl md:max-w-4xl mx-auto px-4 pt-5 pb-8 space-y-6">

      {/* ── Upgrade banner ── */}
      {!isPro && (
        <Link href={`/my/${id}/checklist`}
          className="flex items-center gap-3 bg-gradient-to-r from-rose-600 to-rose-700 rounded-2xl px-4 py-3.5">
          <Sparkles className="w-5 h-5 text-rose-200 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Unlock full planning</p>
            <p className="text-xs text-rose-200">Guests, budget, vendors, show flow — all in one place</p>
          </div>
          <Crown className="w-4 h-4 text-rose-200 flex-shrink-0" />
        </Link>
      )}

      {/* ── Mode toggle ── */}
      <div className="flex items-center gap-2">
        <div className="flex bg-white border border-stone-200 rounded-xl overflow-hidden">
          {(['plan', 'track', 'execute'] as Mode[]).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-4 py-2 text-xs font-semibold capitalize transition-colors ${
                mode === m ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-50'
              }`}>
              {m}
            </button>
          ))}
        </div>
        <p className="text-xs text-stone-400">
          {mode === 'plan' ? 'Full planning view' : mode === 'track' ? 'Tasks + deadlines' : 'Day-of stripped view'}
        </p>
      </div>

      {/* ── Needs Attention ── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Needs Attention</p>
          {alerts.map((a, i) => (
            <Link key={i} href={a.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl ${alertColors[a.level]}`}>
              <AlertCircle className={`w-4 h-4 flex-shrink-0 ${alertIconColors[a.level]}`} />
              <p className="text-sm text-stone-800 flex-1">{a.msg}</p>
              <ArrowRight className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* ── Functions Hub ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5" /> Your Functions
          </p>
        </div>

        {functions.length === 0 ? (
          <div className="border-2 border-dashed border-stone-200 rounded-2xl py-12 text-center">
            <CalendarDays className="w-10 h-10 mx-auto mb-3 text-stone-200" />
            <p className="text-sm font-medium text-stone-500">No functions added yet</p>
            <p className="text-xs text-stone-400 mt-1 mb-4">Add Mehandi, Haldi, Pheras — each gets its own planning hub</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {functions.map((fn, i) => {
              const colorClass = FUNCTION_COLORS[i % FUNCTION_COLORS.length]
              const days = daysUntil(fn.date)
              return (
                <Link key={fn.id} href={`/my/${id}/functions/${fn.id}`}
                  className={`border rounded-2xl p-4 hover:shadow-sm transition-all group ${colorClass}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-white/60 rounded-xl flex flex-col items-center justify-center">
                      <span className="text-xs font-bold leading-none">
                        {new Date(fn.date + 'T00:00:00').getDate()}
                      </span>
                      <span className="text-[10px] leading-none mt-0.5">
                        {new Date(fn.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <p className="text-sm font-bold leading-snug">{fn.name}</p>
                  <div className="mt-1.5 space-y-0.5">
                    {fn.venue_space && (
                      <p className="text-xs opacity-70 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {fn.venue_space}
                      </p>
                    )}
                    {fn.start_time && (
                      <p className="text-xs opacity-70 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {fn.start_time.slice(0, 5)}
                      </p>
                    )}
                    {fn.expected_count && (
                      <p className="text-xs opacity-70 flex items-center gap-1">
                        <Users className="w-3 h-3" /> {fn.expected_count} guests
                      </p>
                    )}
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-current/10">
                    <p className="text-xs font-medium opacity-60">
                      {days > 0 ? `${days} days away` : days === 0 ? 'Today!' : 'Completed'}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Quick Stats Grid ── */}
      {mode !== 'execute' && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Overview</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {sections.slice(0, 4).map(({ href, icon: Icon, label, value, sub, color }) => (
              <Link key={href} href={href}
                className="bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-300 hover:shadow-sm transition-all group">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <p className="text-xl font-bold text-stone-900">{value}</p>
                <p className="text-xs text-stone-400 mt-0.5">{label}</p>
                <p className="text-xs text-stone-300 mt-0.5">{sub}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Execute mode: stripped view ── */}
      {mode === 'execute' && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Day-of Quick Access</p>
          {[
            { href: `/my/${id}/guests`, icon: Users, label: `${confirmedGuests} confirmed guests`, color: 'text-blue-600 bg-blue-50' },
            { href: `/my/${id}/vendors`, icon: Store, label: `${bookedVendors} vendors confirmed`, color: 'text-violet-600 bg-violet-50' },
            { href: `/my/${id}/checklist`, icon: CheckCircle2, label: `${totalTasks - doneTasks} tasks remaining`, color: 'text-emerald-600 bg-emerald-50' },
          ].map(({ href, icon: Icon, label, color }) => (
            <Link key={href} href={href}
              className="flex items-center gap-4 bg-white border border-stone-200 rounded-xl px-4 py-3.5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-sm font-semibold text-stone-800 flex-1">{label}</p>
              <ArrowRight className="w-4 h-4 text-stone-300" />
            </Link>
          ))}
        </div>
      )}

      {/* ── All Sections ── */}
      {mode === 'plan' && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">All Sections</p>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {sections.map(({ href, icon: Icon, label, value, sub, color }) => (
              <Link key={href} href={href}
                className="flex items-center gap-4 px-4 py-3.5 hover:bg-stone-50 transition-colors group">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800">{label}</p>
                  <p className="text-xs text-stone-400">{sub}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <p className="text-sm font-bold text-stone-600">{value}</p>
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-stone-500" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
