import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, MapPin, Users, Wallet, Mic, ListChecks, ArrowRight, Music, Handshake, ShoppingBag, BedDouble, Trophy, UserCheck, Zap, BarChart2, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const TYPE_LABELS: Record<string, string> = {
  corporate: 'Corporate',
  government: 'Government',
  public: 'Public',
}
const TYPE_COLORS: Record<string, string> = {
  corporate: 'bg-blue-100 text-blue-700',
  government: 'bg-amber-100 text-amber-700',
  public: 'bg-emerald-100 text-emerald-700',
}
const STATUS_COLORS: Record<string, string> = {
  setup: 'bg-stone-100 text-stone-600',
  active: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-stone-100 text-stone-400',
}

const ALL_QUICK_LINKS = (id: string) => [
  { key: 'live',          href: `/org-events/${id}/live`,          label: 'Live Dashboard', icon: Zap,           desc: 'Real-time event day view'      },
  { key: 'agenda',        href: `/org-events/${id}/agenda`,        label: 'Agenda',         icon: CalendarDays,  desc: 'Sessions & schedule'           },
  { key: 'delegates',     href: `/org-events/${id}/delegates`,     label: 'Delegates',      icon: Users,         desc: 'Attendee management'           },
  { key: 'speakers',      href: `/org-events/${id}/speakers`,      label: 'Speakers',       icon: Mic,           desc: 'Speaker profiles'              },
  { key: 'guests',        href: `/org-events/${id}/guests`,        label: 'Guests & VIPs',  icon: UserCheck,     desc: 'VIP & guest list'              },
  { key: 'artists',       href: `/org-events/${id}/artists`,       label: 'Artists',        icon: Music,         desc: 'Performers & entertainment'    },
  { key: 'volunteers',    href: `/org-events/${id}/volunteers`,    label: 'Volunteers',     icon: Handshake,     desc: 'Ground team management'        },
  { key: 'vendors',       href: `/org-events/${id}/vendors`,       label: 'Vendors',        icon: ShoppingBag,   desc: 'Supplier payments'             },
  { key: 'accommodation', href: `/org-events/${id}/accommodation`, label: 'Accommodation',  icon: BedDouble,     desc: 'Room allocations'              },
  { key: 'sponsors',      href: `/org-events/${id}/sponsors`,      label: 'Sponsors',       icon: Trophy,        desc: 'Sponsor tracking'              },
  { key: 'checklist',     href: `/org-events/${id}/checklist`,     label: 'Checklist',      icon: ListChecks,    desc: 'Task tracking'                 },
  { key: 'budget',        href: `/org-events/${id}/budget`,        label: 'Budget',         icon: Wallet,        desc: 'Expense management'            },
  { key: 'reports',       href: `/org-events/${id}/reports`,       label: 'Reports',        icon: BarChart2,     desc: 'Attendance & summary'          },
  { key: 'comms',         href: `/org-events/${id}/comms`,         label: 'Comms',          icon: MessageSquare, desc: 'Message delegates & guests'    },
]

const SUB_TYPE_KEYS: Record<string, string[]> = {
  conference:        ['live','agenda','speakers','delegates','guests','accommodation','sponsors','vendors','checklist','budget','reports','comms'],
  award_ceremony:    ['live','agenda','guests','sponsors','vendors','checklist','budget','reports','comms'],
  product_launch:    ['live','agenda','guests','vendors','checklist','budget','reports','comms'],
  corporate_dinner:  ['live','agenda','guests','accommodation','vendors','checklist','budget','reports','comms'],
  agm:               ['live','agenda','delegates','vendors','checklist','budget','reports','comms'],
  team_building:     ['live','accommodation','volunteers','vendors','checklist','budget','reports','comms'],
  trade_fair:        ['live','agenda','delegates','guests','sponsors','vendors','checklist','budget','reports','comms'],
  state_function:    ['live','agenda','guests','accommodation','vendors','checklist','budget','reports','comms'],
  inauguration:      ['live','agenda','guests','vendors','checklist','budget','reports','comms'],
  republic_day:      ['live','agenda','guests','volunteers','vendors','checklist','budget','reports','comms'],
  felicitation:      ['live','agenda','guests','vendors','checklist','budget','reports','comms'],
  public_address:    ['live','agenda','guests','volunteers','vendors','checklist','budget','reports','comms'],
  concert:           ['live','agenda','artists','guests','volunteers','accommodation','sponsors','vendors','checklist','budget','reports','comms'],
  festival:          ['live','agenda','artists','guests','volunteers','sponsors','vendors','checklist','budget','reports','comms'],
  sports:            ['live','agenda','guests','volunteers','vendors','checklist','budget','reports','comms'],
  fundraiser:        ['live','agenda','guests','sponsors','vendors','checklist','budget','reports','comms'],
  brand_activation:  ['live','volunteers','vendors','checklist','budget','reports','comms'],
  sampling_campaign: ['live','volunteers','vendors','checklist','budget','reports','comms'],
  roadshow:          ['live','volunteers','vendors','checklist','budget','reports','comms'],
  mall_activation:   ['live','volunteers','vendors','checklist','budget','reports','comms'],
  rwa_activation:    ['live','volunteers','vendors','checklist','budget','reports','comms'],
  kiosk_campaign:    ['live','volunteers','vendors','checklist','budget','reports','comms'],
  van_campaign:      ['live','volunteers','vendors','checklist','budget','reports','comms'],
  ipl_activation:    ['live','artists','guests','volunteers','vendors','checklist','budget','reports','comms'],
}

function getQuickLinks(id: string, subType: string | null) {
  const keys = SUB_TYPE_KEYS[subType ?? ''] ?? ALL_QUICK_LINKS(id).map(l => l.key)
  return ALL_QUICK_LINKS(id).filter(l => keys.includes(l.key))
}

export default async function OrgEventOverviewPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: event } = await supabase
    .from('org_events')
    .select('*')
    .eq('id', eventId)
    .single()
  if (!event) redirect('/dashboard')

  // Summary counts
  const [{ count: delegateCount }, { count: speakerCount }, { count: sessionCount }, { count: checklistCount }, { count: checklistDone }] =
    await Promise.all([
      supabase.from('delegates').select('*', { count: 'exact', head: true }).eq('org_event_id', eventId),
      supabase.from('speakers').select('*', { count: 'exact', head: true }).eq('org_event_id', eventId),
      supabase.from('agenda_sessions').select('*', { count: 'exact', head: true }).eq('org_event_id', eventId),
      supabase.from('org_checklist_items').select('*', { count: 'exact', head: true }).eq('org_event_id', eventId),
      supabase.from('org_checklist_items').select('*', { count: 'exact', head: true }).eq('org_event_id', eventId).eq('status', 'done'),
    ])

  const daysUntil = event.start_date
    ? Math.ceil((new Date(event.start_date).getTime() - Date.now()) / 86400000)
    : null

  const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Badge className={`${TYPE_COLORS[event.type]} border-0 capitalize`}>{TYPE_LABELS[event.type]}</Badge>
            <Badge className={`${STATUS_COLORS[event.status]} border-0 capitalize`}>{event.status}</Badge>
            <span className="text-xs text-stone-400 font-mono">{event.event_code}</span>
          </div>
          <h1 className="text-2xl font-semibold text-stone-900">{event.name}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-stone-500">
            {event.start_date && (
              <span className="flex items-center gap-1.5">
                <CalendarDays className="w-4 h-4" />
                {fmt(event.start_date)}{event.end_date && event.end_date !== event.start_date ? ` – ${fmt(event.end_date)}` : ''}
              </span>
            )}
            {event.venue && (
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                {event.venue}{event.city ? `, ${event.city}` : ''}
              </span>
            )}
            {event.expected_count > 0 && (
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {event.expected_count} expected
              </span>
            )}
          </div>
        </div>
        {daysUntil !== null && daysUntil > 0 && (
          <div className={`text-sm font-semibold px-3 py-2 rounded-xl text-center flex-shrink-0 ${
            daysUntil <= 14 ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'
          }`}>
            <p className="text-2xl font-bold leading-tight">{daysUntil}</p>
            <p className="text-xs font-medium">days to go</p>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Sessions',  value: sessionCount ?? 0,  icon: CalendarDays, color: 'text-blue-600' },
          { label: 'Speakers',  value: speakerCount ?? 0,  icon: Mic,          color: 'text-purple-600' },
          { label: 'Delegates', value: delegateCount ?? 0, icon: Users,        color: 'text-emerald-600' },
          { label: 'Checklist', value: `${checklistDone ?? 0}/${checklistCount ?? 0}`, icon: ListChecks, color: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="border-stone-200">
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`w-8 h-8 ${color} flex-shrink-0`} />
              <div>
                <p className="text-xl font-bold text-stone-900">{value}</p>
                <p className="text-xs text-stone-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Budget bar */}
      {event.budget_total > 0 && (
        <Card className="border-stone-200">
          <CardContent className="p-4 flex items-center gap-3">
            <Wallet className="w-5 h-5 text-stone-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-stone-800">
                ₹{event.budget_total.toLocaleString('en-IN')} budget
              </p>
              <p className="text-xs text-stone-400">Total event budget</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick links */}
      <div>
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-3">Manage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {getQuickLinks(eventId, event.sub_type ?? null).map(({ href, label, icon: Icon, desc }) => (
            <Link key={label} href={href}>
              <Card className="border-stone-200 hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className="w-5 h-5 text-stone-500 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-stone-900 text-sm">{label}</p>
                    <p className="text-xs text-stone-400">{desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-300" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {event.notes && (
        <div className="bg-stone-50 rounded-xl p-4 text-sm text-stone-600">
          <p className="font-medium text-stone-700 mb-1">Notes</p>
          <p className="whitespace-pre-line">{event.notes}</p>
        </div>
      )}
    </div>
  )
}
