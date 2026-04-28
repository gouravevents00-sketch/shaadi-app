import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, CalendarClock, CheckCircle2, Circle, CircleDot, Users, CalendarDays, CheckSquare, IndianRupee, ArrowRight, ShoppingBag } from 'lucide-react'
import InviteClientPanel from './InviteClientPanel'

const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export default async function OverviewPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const today = new Date().toISOString().split('T')[0]
  const in7  = new Date(Date.now() + 7  * 86400000).toISOString().split('T')[0]
  const in14 = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]

  const [
    { data: wedding },
    { data: overdueItems },
    { data: soonItems },
    { data: upcomingPayments },
    { data: upcomingEvents },
    { count: guestTotal },
    { count: rsvpYes },
    { count: rsvpNo },
    { count: rsvpPending },
    { count: checklistTotal },
    { count: checklistDone },
    { count: vendorCount },
    { data: enquiredVendors },
    { data: clientRequirements },
    { data: clientInvites },
  ] = await Promise.all([
    sc.from('weddings').select('*').eq('id', weddingId).single(),
    sc.from('checklist_items').select('id, title, category, status').eq('wedding_id', weddingId)
      .neq('status', 'done').lt('due_date', today).order('due_date').limit(5),
    sc.from('checklist_items').select('id, title, category, due_date, status').eq('wedding_id', weddingId)
      .neq('status', 'done').gte('due_date', today).lte('due_date', in7).order('due_date').limit(5),
    sc.from('vendor_payments')
      .select('id, amount, due_date, vendor_id, vendors!inner(name, category, wedding_id)')
      .eq('vendors.wedding_id', weddingId)
      .is('paid_date', null).gte('due_date', today).lte('due_date', in14).order('due_date').limit(5),
    sc.from('events').select('id, name, date, start_time, venue').eq('wedding_id', weddingId)
      .gte('date', today).order('date').limit(3),
    sc.from('guests').select('*', { count: 'exact', head: true }).eq('wedding_id', weddingId),
    sc.from('guests').select('*', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('rsvp_status', 'attending'),
    sc.from('guests').select('*', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('rsvp_status', 'declined'),
    sc.from('guests').select('*', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('rsvp_status', 'pending'),
    sc.from('checklist_items').select('*', { count: 'exact', head: true }).eq('wedding_id', weddingId),
    sc.from('checklist_items').select('*', { count: 'exact', head: true }).eq('wedding_id', weddingId).eq('status', 'done'),
    sc.from('vendors').select('*', { count: 'exact', head: true }).eq('wedding_id', weddingId),
    sc.from('vendors').select('id, name, category').eq('wedding_id', weddingId).eq('status', 'enquired').limit(3),
    sc.from('requirements').select('id, title, priority, status, side, created_at').eq('wedding_id', weddingId).order('created_at', { ascending: false }),
    sc.from('invites').select('email, accepted_at, token').eq('wedding_id', weddingId).eq('role', 'client').order('created_at', { ascending: false }),
  ])

  const daysLeft = wedding?.wedding_date
    ? Math.ceil((new Date(wedding.wedding_date).getTime() - Date.now()) / 86400000)
    : null

  const checklistPct = checklistTotal ? Math.round(((checklistDone ?? 0) / checklistTotal) * 100) : 0
  const rsvpPct = guestTotal ? Math.round(((rsvpYes ?? 0) / guestTotal) * 100) : 0

  const hasUrgent = (overdueItems?.length ?? 0) > 0 || (upcomingPayments?.length ?? 0) > 0
  const hasSoon = (soonItems?.length ?? 0) > 0 || (enquiredVendors?.length ?? 0) > 0

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">

      {/* Wedding header */}
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">
          {wedding?.bride_name} &amp; {wedding?.groom_name}
        </h1>
        <p className="text-stone-400 text-sm mt-0.5">
          {[wedding?.primary_venue, wedding?.primary_city].filter(Boolean).join(', ')}
          {wedding?.wedding_date && ` · ${new Date(wedding.wedding_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        </p>
      </div>

      {/* URGENT */}
      {hasUrgent && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700">Needs attention now</span>
          </div>
          {(overdueItems ?? []).map((item: { id: string; title: string; category: string; status: string }) => (
            <Link key={item.id} href={`/weddings/${weddingId}/checklist`}
              className="flex items-center gap-2.5 text-sm text-red-700 hover:text-red-900 group">
              {item.status === 'in_progress' ? <CircleDot className="w-3.5 h-3.5 flex-shrink-0" /> : <Circle className="w-3.5 h-3.5 flex-shrink-0" />}
              <span className="flex-1 truncate font-medium">{item.title}</span>
              <span className="text-xs text-red-400 flex-shrink-0">{item.category} · overdue</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 flex-shrink-0" />
            </Link>
          ))}
          {(upcomingPayments ?? []).map((p: { id: string; amount: number; due_date: string; vendors: { name: string; category: string } | { name: string; category: string }[] | null }) => {
            const vendor = Array.isArray(p.vendors) ? p.vendors[0] : p.vendors
            return (
              <Link key={p.id} href={`/weddings/${weddingId}/vendors`}
                className="flex items-center gap-2.5 text-sm text-red-700 hover:text-red-900 group">
                <CalendarClock className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="flex-1 truncate font-medium">{vendor?.name}</span>
                <span className="text-xs text-red-400 flex-shrink-0">payment due {fmtDate(p.due_date)}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 flex-shrink-0" />
              </Link>
            )
          })}
        </div>
      )}

      {/* DUE SOON */}
      {hasSoon && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 mb-1">
            <CalendarClock className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">This week</span>
          </div>
          {(soonItems ?? []).map((item: { id: string; title: string; due_date: string; status: string }) => (
            <Link key={item.id} href={`/weddings/${weddingId}/checklist`}
              className="flex items-center gap-2.5 text-sm text-amber-700 hover:text-amber-900 group">
              {item.status === 'in_progress' ? <CircleDot className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" /> : <Circle className="w-3.5 h-3.5 flex-shrink-0" />}
              <span className="flex-1 truncate">{item.title}</span>
              <span className="text-xs text-amber-400 flex-shrink-0">{fmtDate(item.due_date)}</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 flex-shrink-0" />
            </Link>
          ))}
          {(enquiredVendors ?? []).map((v: { id: string; name: string; category: string }) => (
            <Link key={v.id} href={`/weddings/${weddingId}/vendors`}
              className="flex items-center gap-2.5 text-sm text-amber-700 hover:text-amber-900 group">
              <ShoppingBag className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="flex-1 truncate">{v.name}</span>
              <span className="text-xs text-amber-400 flex-shrink-0">{v.category} · still enquired</span>
              <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href={`/weddings/${weddingId}/events`}
          className="bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-300 transition-colors">
          <p className="text-xs text-stone-400 font-medium mb-2">Days to go</p>
          <p className={`text-2xl font-bold ${daysLeft !== null && daysLeft <= 30 && daysLeft > 0 ? 'text-rose-600' : 'text-stone-900'}`}>
            {daysLeft === null ? '—' : daysLeft < 0 ? 'Done!' : daysLeft === 0 ? 'Today!' : daysLeft}
          </p>
          <p className="text-xs text-stone-400 mt-1">{wedding?.wedding_date ? fmtDate(wedding.wedding_date) : 'Set date'}</p>
        </Link>

        <Link href={`/weddings/${weddingId}/guests`}
          className="bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-300 transition-colors">
          <p className="text-xs text-stone-400 font-medium mb-2">Guests confirmed</p>
          <p className="text-2xl font-bold text-stone-900">{rsvpYes ?? 0}<span className="text-base font-normal text-stone-400">/{guestTotal ?? 0}</span></p>
          <div className="mt-2 h-1 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${rsvpPct}%` }} />
          </div>
          <p className="text-xs text-stone-400 mt-1">{rsvpPending ?? 0} pending · {rsvpNo ?? 0} declined</p>
        </Link>

        <Link href={`/weddings/${weddingId}/checklist`}
          className="bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-300 transition-colors">
          <p className="text-xs text-stone-400 font-medium mb-2">Checklist</p>
          <p className="text-2xl font-bold text-stone-900">{checklistPct}<span className="text-base font-normal text-stone-400">%</span></p>
          <div className="mt-2 h-1 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-400 rounded-full" style={{ width: `${checklistPct}%` }} />
          </div>
          <p className="text-xs text-stone-400 mt-1">{checklistDone ?? 0}/{checklistTotal ?? 0} done</p>
        </Link>

        <Link href={`/weddings/${weddingId}/vendors`}
          className="bg-white border border-stone-200 rounded-xl p-4 hover:border-stone-300 transition-colors">
          <p className="text-xs text-stone-400 font-medium mb-2">Vendors</p>
          <p className="text-2xl font-bold text-stone-900">{vendorCount ?? 0}</p>
          <p className="text-xs mt-1">
            {(enquiredVendors?.length ?? 0) > 0
              ? <span className="text-amber-600">{enquiredVendors!.length} need confirmation</span>
              : <span className="text-stone-400">all confirmed</span>}
          </p>
        </Link>
      </div>

      {/* Client portal panel */}
      <InviteClientPanel
        weddingId={weddingId}
        requirements={clientRequirements ?? []}
        existingInvites={clientInvites ?? []}
      />

      {/* Upcoming events */}
      {(upcomingEvents ?? []).length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Upcoming events</p>
            <Link href={`/weddings/${weddingId}/events`} className="text-xs text-stone-400 hover:text-stone-700">View all →</Link>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
            {(upcomingEvents ?? []).map((ev: { id: string; name: string; date: string; start_time: string | null; venue: string | null }, i: number) => (
              <div key={ev.id} className={`flex items-center gap-4 px-4 py-3 ${i > 0 ? 'border-t border-stone-100' : ''}`}>
                <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-4 h-4 text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800">{ev.name}</p>
                  {ev.venue && <p className="text-xs text-stone-400 truncate">{ev.venue}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-medium text-stone-700">{fmtDate(ev.date)}</p>
                  {ev.start_time && <p className="text-xs text-stone-400">{ev.start_time.slice(0, 5)}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick links when nothing urgent */}
      {!hasUrgent && !hasSoon && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Quick access</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { label: 'Add guests', href: `/weddings/${weddingId}/guests`, icon: Users },
              { label: 'Checklist', href: `/weddings/${weddingId}/checklist`, icon: CheckSquare },
              { label: 'Vendors', href: `/weddings/${weddingId}/vendors`, icon: ShoppingBag },
              { label: 'Budget', href: `/weddings/${weddingId}/budget`, icon: IndianRupee },
              { label: 'Events', href: `/weddings/${weddingId}/events`, icon: CalendarDays },
              { label: 'Rooms', href: `/weddings/${weddingId}/rooms`, icon: CheckCircle2 },
            ].map(({ label, href, icon: Icon }) => (
              <Link key={href} href={href}
                className="flex items-center gap-2.5 px-3 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-600 hover:border-stone-300 hover:text-stone-900 transition-colors">
                <Icon className="w-4 h-4 text-stone-400 flex-shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
