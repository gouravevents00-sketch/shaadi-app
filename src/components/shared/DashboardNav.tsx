'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, CalendarDays, CheckSquare,
  Wallet, Clock, LogOut, ChevronDown,
  Megaphone, ShoppingBag, Eye, EyeOff, UserCircle, BookTemplate, BarChart2,
  Mic, ListChecks, LayoutGrid, Sun, Music, Handshake, UserCheck, BedDouble,
  Trophy, Zap, FileText, MessageSquare, Store, Inbox, Sparkles, Heart, MapPin, Gift,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { usePrivacy } from '@/contexts/PrivacyContext'

interface NavProps {
  user: { name: string; email: string } | null
  company: { id: string; name: string; logo_url: string | null } | null
  role: string | null
  isPersonal?: boolean
  personalWeddingId?: string | null
  onNavigate?: () => void
}

// ── Agency nav ────────────────────────────────────────────────
const agencyMainNav = [
  { href: '/dashboard',           label: 'All Events',  icon: LayoutDashboard },
  { href: '/dashboard/templates', label: 'Templates',   icon: BookTemplate },
  { href: '/marketplace',         label: 'Marketplace', icon: Store },
  { href: '/leads',               label: 'Leads',       icon: Inbox },
]

const agencyWeddingNav = (id: string) => [
  { href: `/weddings/${id}/overview`,  label: 'Overview',    icon: LayoutDashboard },
  { href: `/weddings/${id}/events`,    label: 'Ceremonies',  icon: CalendarDays },
  { href: `/weddings/${id}/guests`,    label: 'Guests',      icon: Users },
  { href: `/weddings/${id}/vendors`,   label: 'Vendors',     icon: ShoppingBag },
  { href: `/weddings/${id}/budget`,    label: 'Finance',     icon: Wallet },
  { href: `/weddings/${id}/rooms`,     label: 'Rooms',       icon: BedDouble },
  { href: `/weddings/${id}/seating`,   label: 'Seating',     icon: LayoutGrid },
  { href: `/weddings/${id}/day`,       label: 'Ground Control', icon: Sun },
  { href: `/weddings/${id}/checklist`, label: 'Checklist',   icon: CheckSquare },
  { href: `/weddings/${id}/comms`,     label: 'Comms',       icon: Megaphone },
  { href: `/weddings/${id}/documents`,    label: 'Documents',    icon: FileText },
  { href: `/weddings/${id}/deliverables`, label: 'Deliverables', icon: Gift },
  { href: `/weddings/${id}/client`,       label: 'Client Portal', icon: UserCircle },
]

// All possible org-event nav items keyed by slug
const ORG_NAV_ALL = (id: string) => [
  { key: 'live',          href: `/org-events/${id}/live`,          label: 'Live Dashboard', icon: Zap          },
  { key: 'overview',      href: `/org-events/${id}/overview`,      label: 'Overview',       icon: LayoutDashboard },
  { key: 'agenda',        href: `/org-events/${id}/agenda`,        label: 'Agenda',         icon: CalendarDays },
  { key: 'speakers',      href: `/org-events/${id}/speakers`,      label: 'Speakers',       icon: Mic          },
  { key: 'delegates',     href: `/org-events/${id}/delegates`,     label: 'Delegates',      icon: Users        },
  { key: 'guests',        href: `/org-events/${id}/guests`,        label: 'Guests & VIPs',  icon: UserCheck    },
  { key: 'artists',       href: `/org-events/${id}/artists`,       label: 'Artists',        icon: Music        },
  { key: 'volunteers',    href: `/org-events/${id}/volunteers`,    label: 'Volunteers',     icon: Handshake    },
  { key: 'vendors',       href: `/org-events/${id}/vendors`,       label: 'Vendors',        icon: ShoppingBag  },
  { key: 'accommodation', href: `/org-events/${id}/accommodation`, label: 'Accommodation',  icon: BedDouble    },
  { key: 'sponsors',      href: `/org-events/${id}/sponsors`,      label: 'Sponsors',       icon: Trophy       },
  { key: 'timeline',      href: `/org-events/${id}/timeline`,      label: 'Run of Show',    icon: Clock        },
  { key: 'checklist',     href: `/org-events/${id}/checklist`,     label: 'Checklist',      icon: ListChecks   },
  { key: 'budget',        href: `/org-events/${id}/budget`,        label: 'Budget',         icon: Wallet       },
  { key: 'reports',       href: `/org-events/${id}/reports`,       label: 'Reports',        icon: BarChart2    },
  { key: 'comms',         href: `/org-events/${id}/comms`,         label: 'Comms',          icon: MessageSquare},
]

// Modules shown per sub_type (always includes: live, overview, vendors, budget, checklist, reports, comms)
const ORG_NAV_KEYS: Record<string, string[]> = {
  conference:        ['live','overview','agenda','speakers','delegates','guests','accommodation','sponsors','timeline','vendors','budget','checklist','reports','comms'],
  award_ceremony:    ['live','overview','agenda','guests','sponsors','timeline','vendors','budget','checklist','reports','comms'],
  product_launch:    ['live','overview','agenda','guests','timeline','vendors','budget','checklist','reports','comms'],
  corporate_dinner:  ['live','overview','agenda','guests','accommodation','timeline','vendors','budget','checklist','reports','comms'],
  agm:               ['live','overview','agenda','delegates','timeline','vendors','budget','checklist','reports','comms'],
  team_building:     ['live','overview','accommodation','volunteers','timeline','vendors','budget','checklist','reports','comms'],
  trade_fair:        ['live','overview','agenda','delegates','guests','sponsors','vendors','budget','checklist','reports','comms'],
  state_function:    ['live','overview','agenda','guests','accommodation','timeline','vendors','budget','checklist','reports','comms'],
  inauguration:      ['live','overview','agenda','guests','timeline','vendors','budget','checklist','reports','comms'],
  republic_day:      ['live','overview','agenda','guests','volunteers','timeline','vendors','budget','checklist','reports','comms'],
  felicitation:      ['live','overview','agenda','guests','timeline','vendors','budget','checklist','reports','comms'],
  public_address:    ['live','overview','agenda','guests','volunteers','timeline','vendors','budget','checklist','reports','comms'],
  concert:           ['live','overview','agenda','artists','guests','volunteers','accommodation','sponsors','timeline','vendors','budget','checklist','reports','comms'],
  festival:          ['live','overview','agenda','artists','guests','volunteers','sponsors','timeline','vendors','budget','checklist','reports','comms'],
  sports:            ['live','overview','agenda','guests','volunteers','timeline','vendors','budget','checklist','reports','comms'],
  fundraiser:        ['live','overview','agenda','guests','sponsors','timeline','vendors','budget','checklist','reports','comms'],
  brand_activation:  ['live','overview','volunteers','timeline','vendors','budget','checklist','reports','comms'],
  sampling_campaign: ['live','overview','volunteers','timeline','vendors','budget','checklist','reports','comms'],
  roadshow:          ['live','overview','volunteers','timeline','vendors','budget','checklist','reports','comms'],
  mall_activation:   ['live','overview','volunteers','timeline','vendors','budget','checklist','reports','comms'],
  rwa_activation:    ['live','overview','volunteers','timeline','vendors','budget','checklist','reports','comms'],
  kiosk_campaign:    ['live','overview','volunteers','timeline','vendors','budget','checklist','reports','comms'],
  van_campaign:      ['live','overview','volunteers','timeline','vendors','budget','checklist','reports','comms'],
  ipl_activation:    ['live','overview','artists','guests','volunteers','timeline','vendors','budget','checklist','reports','comms'],
  _default:          ['live','overview','agenda','guests','volunteers','vendors','accommodation','sponsors','timeline','budget','checklist','reports','comms'],
}

function orgEventNav(id: string, subType: string | null) {
  const keys = ORG_NAV_KEYS[subType ?? ''] ?? ORG_NAV_KEYS['_default']
  return ORG_NAV_ALL(id).filter(item => keys.includes(item.key))
}

// ── Self-planner nav ─────────────────────────────────────────
const selfPlannerNav = (id: string) => [
  { href: `/weddings/${id}/overview`,  label: 'Overview',       icon: Heart },
  { href: `/weddings/${id}/events`,    label: 'Ceremonies',     icon: CalendarDays },
  { href: `/weddings/${id}/guests`,    label: 'Guests & RSVP',  icon: Users },
  { href: `/weddings/${id}/vendors`,   label: 'Vendors',        icon: MapPin },
  { href: `/weddings/${id}/budget`,    label: 'Budget',         icon: Wallet },
  { href: `/weddings/${id}/checklist`, label: 'To-Do List',     icon: CheckSquare },
  { href: `/weddings/${id}/rooms`,     label: 'Rooms',          icon: BedDouble },
  { href: `/weddings/${id}/seating`,   label: 'Seating',        icon: LayoutGrid },
  { href: `/weddings/${id}/comms`,     label: 'Message Guests', icon: Megaphone },
]

function NavItem({ href, label, icon: Icon, onClick }: {
  href: string; label: string; icon: React.ElementType; onClick?: () => void
}) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        active ? 'bg-rose-50 text-rose-700' : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
      )}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </Link>
  )
}

export default function DashboardNav({ user, company, role, isPersonal, personalWeddingId, onNavigate }: NavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const { hidden, toggle } = usePrivacy()

  const weddingMatch = pathname.match(/\/weddings\/([^/]+)/)
  const weddingId = weddingMatch?.[1]

  const orgEventMatch = pathname.match(/\/org-events\/([^/]+)/)
  const orgEventId = orgEventMatch?.[1]

  const [orgEventSubType, setOrgEventSubType] = useState<string | null>(null)
  useEffect(() => {
    if (!orgEventId) { setOrgEventSubType(null); return }
    supabase.from('org_events').select('sub_type').eq('id', orgEventId).single()
      .then(({ data }) => setOrgEventSubType(data?.sub_type ?? null))
  }, [orgEventId])

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  // ── Self-planner experience ──────────────────────────────────
  if (isPersonal) {
    const wId = weddingId || personalWeddingId
    return (
      <aside className="w-60 min-h-screen bg-white border-r border-stone-200 flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm">✦</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-stone-900 truncate">My Wedding</p>
              <p className="text-xs text-stone-400">Personal planner</p>
            </div>
            <button onClick={toggle} title={hidden ? 'Show amounts' : 'Hide amounts'}
              className={cn('p-1.5 rounded-lg transition-colors flex-shrink-0',
                hidden ? 'bg-amber-100 text-amber-600' : 'text-stone-300 hover:text-stone-600 hover:bg-stone-100'
              )}>
              {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {wId ? (
            selfPlannerNav(wId).map(item => <NavItem key={item.href} {...item} onClick={onNavigate} />)
          ) : (
            <div className="px-3 py-4 text-xs text-stone-400 text-center">
              <Sparkles className="w-5 h-5 mx-auto mb-2 text-rose-300" />
              Set up your wedding to get started
            </div>
          )}
        </nav>

        {hidden && (
          <div className="mx-3 mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
            <EyeOff className="w-3 h-3 text-amber-500 flex-shrink-0" />
            <span className="text-[11px] text-amber-700 font-medium">Amounts hidden</span>
            <button onClick={toggle} className="text-[11px] text-amber-500 underline ml-auto">show</button>
          </div>
        )}

        {/* User footer */}
        <div className="px-3 py-3 border-t border-stone-100">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-stone-50 transition-colors">
              <Avatar className="w-7 h-7">
                <AvatarFallback className="text-xs bg-rose-100 text-rose-700">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-stone-800 truncate">{user?.name}</p>
                <p className="text-xs text-stone-400 truncate">{user?.email}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    )
  }

  // ── Agency experience ────────────────────────────────────────
  return (
    <aside className="w-60 min-h-screen bg-white border-r border-stone-200 flex flex-col">
      {/* Company header */}
      <div className="px-4 py-4 border-b border-stone-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-rose-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm font-bold">✦</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-stone-900 truncate">{company?.name || 'Creative Era OS'}</p>
            <p className="text-xs text-stone-400 capitalize">{role || 'member'}</p>
          </div>
          <button onClick={toggle} title={hidden ? 'Show amounts' : 'Hide amounts'}
            className={cn('p-1.5 rounded-lg transition-colors flex-shrink-0',
              hidden ? 'bg-amber-100 text-amber-600' : 'text-stone-300 hover:text-stone-600 hover:bg-stone-100'
            )}>
            {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {agencyMainNav.map(item => <NavItem key={item.href} {...item} onClick={onNavigate} />)}

        {weddingId && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">This Wedding</p>
            </div>
            {agencyWeddingNav(weddingId).map(item => <NavItem key={item.href} {...item} onClick={onNavigate} />)}
          </>
        )}

        {orgEventId && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">This Event</p>
            </div>
            {orgEventNav(orgEventId, orgEventSubType).map(({ key: _k, ...item }) => <NavItem key={item.href} {...item} onClick={onNavigate} />)}
          </>
        )}
      </nav>

      {hidden && (
        <div className="mx-3 mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2">
          <EyeOff className="w-3 h-3 text-amber-500 flex-shrink-0" />
          <span className="text-[11px] text-amber-700 font-medium">Amounts hidden</span>
          <button onClick={toggle} className="text-[11px] text-amber-500 underline ml-auto">show</button>
        </div>
      )}

      {/* User footer */}
      <div className="px-3 py-3 border-t border-stone-100">
        <DropdownMenu>
          <DropdownMenuTrigger className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-stone-50 transition-colors">
            <Avatar className="w-7 h-7">
              <AvatarFallback className="text-xs bg-rose-100 text-rose-700">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-stone-800 truncate">{user?.name}</p>
              <p className="text-xs text-stone-400 truncate">{user?.email}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings')}>Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/billing')}>Plans & Billing</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-red-600">
              <LogOut className="w-4 h-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
