'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, CheckCircle2, Users, Wallet, Store, Hotel,
  Shirt, Flame, Sparkles, ArrowLeft, Crown, CalendarDays,
  MessageCircle, Download,
} from 'lucide-react'

type Celebration = {
  id: string; name: string; bride_name: string | null; groom_name: string | null
  event_date: string | null; city: string | null; type: string; plan: string | null
}

const TYPE_EMOJIS: Record<string, string> = {
  wedding: '💒', sagai: '💍', sangeet: '🎵', namkaran: '👶', mundan: '✂️',
  annaprashan: '🍚', janeu: '🧵', godh_bharai: '🤰', griha_pravesh: '🏠',
  puja: '🪔', birthday: '🎂', anniversary: '❤️', graduation: '🎓',
  retirement: '🎉', kitty: '👗', other: '✨',
}

export default function MySidebarClient({
  id,
  celebration,
  pendingTasks,
  pendingGuests,
  children,
}: {
  id: string
  celebration: Celebration
  pendingTasks: number
  pendingGuests: number
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const isPro = celebration.plan === 'pro'

  const daysLeft = celebration.event_date
    ? Math.ceil((new Date(celebration.event_date).getTime() - Date.now()) / 86400000)
    : null

  const coupleNames =
    celebration.bride_name && celebration.groom_name
      ? `${celebration.bride_name} & ${celebration.groom_name}`
      : celebration.bride_name || celebration.groom_name || celebration.name

  function isActive(href: string) {
    if (href === `/my/${id}`) return pathname === `/my/${id}`
    return pathname === href || pathname.startsWith(href + '/')
  }

  const navItems = [
    { href: `/my/${id}`,           icon: LayoutDashboard, label: 'Overview',   badge: 0 },
    { href: `/my/${id}/checklist`, icon: CheckCircle2,    label: 'Checklist',  badge: pendingTasks },
    { href: `/my/${id}/guests`,    icon: Users,           label: 'Guests',     badge: pendingGuests },
    { href: `/my/${id}/budget`,    icon: Wallet,          label: 'Budget',     badge: 0 },
    { href: `/my/${id}/vendors`,   icon: Store,           label: 'Vendors',    badge: 0 },
    { href: `/my/${id}/rooms`,     icon: Hotel,           label: 'Rooms',      badge: 0 },
    { href: `/my/${id}/outfits`,   icon: Shirt,           label: 'Outfits',    badge: 0 },
    { href: `/my/${id}/rituals`,   icon: Flame,           label: 'Rituals',    badge: 0 },
    { href: `/my/${id}/tools`,     icon: Sparkles,        label: 'Tools',      badge: 0 },
    { href: `/my/${id}/comms`,     icon: MessageCircle,   label: 'Comms',      badge: 0 },
    { href: `/my/${id}/exports`,   icon: Download,        label: 'Export',     badge: 0 },
  ]

  const mobileNav = [
    navItems[0], // Overview
    navItems[1], // Checklist
    navItems[2], // Guests
    navItems[3], // Budget
    navItems[8], // Tools
  ]

  const daysLabel =
    daysLeft === null ? 'Date not set'
    : daysLeft > 0 ? `${daysLeft} days left`
    : daysLeft === 0 ? 'Today! 🎉'
    : 'Completed ✓'

  return (
    <div className="min-h-screen bg-stone-50 flex">

      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-stone-100 fixed top-0 left-0 h-full z-20 overflow-y-auto">
        <div className="px-4 py-4 border-b border-stone-100 flex-shrink-0">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-rose-700 flex items-center justify-center">
              <span className="text-white text-xs font-bold">✦</span>
            </div>
            <span className="font-semibold text-stone-900 text-sm">Utsav</span>
          </div>
          <p className="font-semibold text-stone-900 text-sm leading-snug truncate">
            {TYPE_EMOJIS[celebration.type] || '✨'} {coupleNames}
          </p>
          <p className={`text-xs mt-0.5 truncate ${daysLeft !== null && daysLeft <= 30 && daysLeft > 0 ? 'text-rose-600 font-medium' : 'text-stone-400'}`}>
            {daysLabel}{celebration.city && ` · ${celebration.city}`}
          </p>
          {isPro && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium mt-1.5">
              <Crown className="w-2.5 h-2.5" /> Activated
            </span>
          )}
        </div>

        <nav className="flex-1 p-2 pt-3 space-y-0.5">
          {navItems.map(({ href, icon: Icon, label, badge }) => {
            const active = isActive(href)
            return (
              <Link key={href} href={href}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  active
                    ? 'bg-rose-50 text-rose-700 font-semibold'
                    : 'text-stone-500 hover:bg-stone-50 hover:text-stone-900'
                }`}>
                <div className="relative flex-shrink-0">
                  <Icon className="w-4 h-4" />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-rose-600 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className="text-sm">{label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-stone-100 flex-shrink-0">
          <Link href="/my"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-stone-400 hover:bg-stone-50 hover:text-stone-600 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> All celebrations
          </Link>
        </div>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">

        {/* Mobile header */}
        <header className="md:hidden bg-white border-b border-stone-100 sticky top-0 z-10 px-4 h-14 flex items-center gap-3">
          <Link href="/my" className="text-stone-400 hover:text-stone-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-stone-900 text-sm truncate leading-none">
              {TYPE_EMOJIS[celebration.type] || '✨'} {coupleNames}
            </p>
            <p className={`text-xs mt-0.5 truncate ${daysLeft !== null && daysLeft <= 30 && daysLeft > 0 ? 'text-rose-600 font-medium' : 'text-stone-400'}`}>
              {daysLabel}{celebration.city && ` · ${celebration.city}`}
            </p>
          </div>
          {isPro && (
            <span className="inline-flex items-center gap-1 text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
              <Crown className="w-2.5 h-2.5" /> Pro
            </span>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 pb-20 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 z-20 safe-area-pb">
          <div className="flex">
            {mobileNav.map(({ href, icon: Icon, label, badge }) => {
              const active = isActive(href)
              return (
                <Link key={href} href={href}
                  className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors relative ${
                    active ? 'text-rose-700' : 'text-stone-400'
                  }`}>
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {badge > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {badge > 9 ? '9+' : badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium">{label}</span>
                  {active && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-rose-700 rounded-full" />}
                </Link>
              )
            })}
          </div>
        </nav>
      </div>

    </div>
  )
}
