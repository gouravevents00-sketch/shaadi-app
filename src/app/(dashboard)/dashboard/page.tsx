import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarDays, Plus, ArrowRight, Building2, Landmark, Users, HeartHandshake, AlertTriangle, Info, Sparkles } from 'lucide-react'
import WeddingActions from './WeddingActions'
import { Suspense } from 'react'
import WelcomeScreen from './WelcomeScreen'

type DigestAlert = { weddingId: string; weddingName: string; level: 'urgent' | 'warn' | 'info'; message: string; href: string }

const STATUS_COLORS: Record<string, string> = {
  setup: 'bg-stone-100 text-stone-600',
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-stone-100 text-stone-400',
}

const ORG_TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string; iconBg: string }> = {
  corporate:  { label: 'Corporate',   icon: Building2,     color: 'bg-blue-100 text-blue-700',    iconBg: 'bg-blue-50 text-blue-600' },
  government: { label: 'Government',  icon: Landmark,      color: 'bg-amber-100 text-amber-700',  iconBg: 'bg-amber-50 text-amber-600' },
  public:     { label: 'Public',      icon: Users,         color: 'bg-emerald-100 text-emerald-700', iconBg: 'bg-emerald-50 text-emerald-600' },
}

const daysUntil = (date: string | null) => {
  if (!date) return null
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

const ALERT_STYLES: Record<DigestAlert['level'], { bar: string; icon: React.ElementType; iconColor: string }> = {
  urgent: { bar: 'border-l-red-500',   icon: AlertTriangle, iconColor: 'text-red-500' },
  warn:   { bar: 'border-l-amber-400', icon: AlertTriangle, iconColor: 'text-amber-500' },
  info:   { bar: 'border-l-blue-400',  icon: Info,          iconColor: 'text-blue-500' },
}

async function loadDigest(companyId: string): Promise<DigestAlert[]> {
  const sc = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)
  const ago3 = new Date(Date.now() - 3 * 86400000).toISOString()

  const { data: activeWeddings } = await sc
    .from('weddings').select('id, bride_name, groom_name')
    .eq('company_id', companyId).eq('status', 'active')

  if (!activeWeddings || activeWeddings.length === 0) return []

  const alerts: DigestAlert[] = []

  await Promise.all(activeWeddings.map(async (w: { id: string; bride_name: string; groom_name: string | null }) => {
    const name = w.groom_name ? `${w.bride_name} & ${w.groom_name}` : w.bride_name
    const base = `/weddings/${w.id}`

    const [
      { data: overdue },
      { data: unbooked },
      { data: stale },
    ] = await Promise.all([
      sc.from('checklist_items').select('id', { count: 'exact', head: true }).eq('wedding_id', w.id).neq('status', 'done').lt('due_date', today),
      sc.from('vendors').select('id', { count: 'exact', head: true }).eq('wedding_id', w.id).eq('status', 'enquired').eq('total_amount', 0).is('phone', null).is('contact_name', null).is('email', null),
      sc.from('vendors').select('id', { count: 'exact', head: true }).eq('wedding_id', w.id).eq('status', 'enquired').is('phone', null).lt('created_at', ago3),
    ])

    const overdueN = (overdue as unknown as { length?: number } | null)?.length ?? 0
    const unbookedN = (unbooked as unknown as { length?: number } | null)?.length ?? 0
    const staleN = (stale as unknown as { length?: number } | null)?.length ?? 0

    if (overdueN > 0) alerts.push({ weddingId: w.id, weddingName: name, level: 'urgent', message: `${overdueN} overdue task${overdueN > 1 ? 's' : ''}`, href: `${base}/checklist` })
    if (unbookedN > 0) alerts.push({ weddingId: w.id, weddingName: name, level: 'warn', message: `${unbookedN} vendor slot${unbookedN > 1 ? 's' : ''} unfilled from ceremonies`, href: `${base}/vendors` })
    if (staleN > 0) alerts.push({ weddingId: w.id, weddingName: name, level: 'info', message: `${staleN} vendor${staleN > 1 ? 's' : ''} enquired but not followed up (3+ days)`, href: `${base}/vendors` })
  }))

  const order = { urgent: 0, warn: 1, info: 2 }
  return alerts.sort((a, b) => order[a.level] - order[b.level]).slice(0, 8)
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('company_members')
    .select('company_id, role, companies(is_personal)')
    .eq('user_id', user.id)
    .single()

  // Self-planner: redirect straight to their wedding overview
  const rawCo = member?.companies
  const co = (Array.isArray(rawCo) ? rawCo[0] : rawCo) as { is_personal: boolean | null } | null
  if (co?.is_personal === true && member?.company_id) {
    const { data: pw } = await createServiceClient()
      .from('weddings').select('id').eq('company_id', member.company_id).limit(1).maybeSingle()
    if (pw?.id) redirect(`/weddings/${pw.id}/overview`)
    else redirect('/weddings/new')
  }

  const [{ data: weddings }, { data: orgEvents }, digest] = await Promise.all([
    supabase
      .from('weddings')
      .select('id, bride_name, groom_name, wedding_date, date_from, date_to, status, wedding_code, primary_venue, primary_city, budget_total')
      .eq('company_id', member?.company_id)
      .order('wedding_date', { ascending: true }),
    supabase
      .from('org_events')
      .select('id, name, type, status, start_date, end_date, venue, city, event_code')
      .eq('company_id', member?.company_id)
      .order('start_date', { ascending: true }),
    member?.company_id ? loadDigest(member.company_id) : Promise.resolve([]),
  ])

  const canCreate = member?.role === 'owner' || member?.role === 'admin'
  const total = (weddings?.length ?? 0) + (orgEvents?.length ?? 0)

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">All Events</h1>
          <p className="text-stone-500 text-sm mt-0.5">{total} event{total !== 1 ? 's' : ''} across weddings and corporate</p>
        </div>
        {canCreate && (
          <Button asChild className="bg-stone-900 hover:bg-stone-800">
            <Link href="/new">
              <Plus className="w-4 h-4 mr-2" />
              New event
            </Link>
          </Button>
        )}
      </div>

      {/* ── AI Digest ─────────────────────────────────────────────── */}
      {digest.length > 0 && (
        <div className="mb-8 bg-white border border-stone-200 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-100 bg-stone-50">
            <Sparkles className="w-4 h-4 text-rose-600" />
            <span className="text-sm font-semibold text-stone-700">AI Digest</span>
            <span className="text-xs text-stone-400 ml-1">— things that need attention</span>
          </div>
          <div className="divide-y divide-stone-50">
            {digest.map((alert, i) => {
              const style = ALERT_STYLES[alert.level]
              const Icon = style.icon
              return (
                <Link key={i} href={alert.href} className="flex items-start gap-3 px-4 py-3 hover:bg-stone-50 transition-colors border-l-4 border-l-transparent hover:border-l-stone-200 group" style={{ borderLeftColor: alert.level === 'urgent' ? '#ef4444' : alert.level === 'warn' ? '#f59e0b' : '#60a5fa' }}>
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${style.iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium text-stone-500">{alert.weddingName}</span>
                    <p className="text-sm text-stone-800">{alert.message}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-stone-500 transition-colors mt-0.5 flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {total === 0 ? (
        <Suspense fallback={null}>
          <WelcomeScreen canCreate={canCreate} />
        </Suspense>
      ) : (
        <div className="space-y-8">
          {/* ── Weddings ──────────────────────────────────────── */}
          {weddings && weddings.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <HeartHandshake className="w-4 h-4 text-rose-500" />
                <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Weddings</h2>
              </div>
              <div className="grid gap-3">
                {weddings.map(w => {
                  const days = daysUntil(w.wedding_date)
                  return (
                    <div key={w.id} className="relative">
                      <Link href={`/weddings/${w.id}/overview`}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer border-stone-200">
                          <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-11 h-11 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                                  <span className="text-rose-600 text-base font-medium">{w.bride_name[0]}{w.groom_name ? w.groom_name[0] : ''}</span>
                                </div>
                                <div>
                                  <h2 className="font-semibold text-stone-900">{w.bride_name}{w.groom_name ? ` & ${w.groom_name}` : ''}</h2>
                                  <div className="flex items-center gap-3 mt-0.5">
                                    {w.wedding_date && (
                                      <span className="text-sm text-stone-500 flex items-center gap-1">
                                        <CalendarDays className="w-3.5 h-3.5" />
                                        {new Date(w.wedding_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      </span>
                                    )}
                                    {w.primary_venue && <span className="text-sm text-stone-400">{w.primary_venue}</span>}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 mr-8">
                                {days !== null && days > 0 && (
                                  <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${days <= 14 ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'}`}>
                                    {days}d
                                  </span>
                                )}
                                <Badge className={STATUS_COLORS[w.status] + ' border-0 capitalize'}>{w.status}</Badge>
                                <ArrowRight className="w-4 h-4 text-stone-400" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <WeddingActions wedding={w} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Org Events ────────────────────────────────────── */}
          {orgEvents && orgEvents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-blue-500" />
                <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Corporate / Government / Public</h2>
              </div>
              <div className="grid gap-3">
                {orgEvents.map(e => {
                  const days = daysUntil(e.start_date)
                  const meta = ORG_TYPE_META[e.type] ?? ORG_TYPE_META.corporate
                  const Icon = meta.icon
                  return (
                    <Link key={e.id} href={`/org-events/${e.id}/overview`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer border-stone-200">
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.iconBg}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div>
                                <h2 className="font-semibold text-stone-900">{e.name}</h2>
                                <div className="flex items-center gap-3 mt-0.5">
                                  {e.start_date && (
                                    <span className="text-sm text-stone-500 flex items-center gap-1">
                                      <CalendarDays className="w-3.5 h-3.5" />
                                      {new Date(e.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                      {e.end_date && e.end_date !== e.start_date && ` – ${new Date(e.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                                    </span>
                                  )}
                                  {e.venue && <span className="text-sm text-stone-400">{e.venue}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {days !== null && days > 0 && (
                                <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${days <= 14 ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'}`}>
                                  {days}d
                                </span>
                              )}
                              <Badge className={`${meta.color} border-0 capitalize`}>{meta.label}</Badge>
                              <Badge className={STATUS_COLORS[e.status] + ' border-0 capitalize'}>{e.status}</Badge>
                              <ArrowRight className="w-4 h-4 text-stone-400" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
