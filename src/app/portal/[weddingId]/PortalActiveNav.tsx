'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Users, CalendarDays, Heart, ThumbsUp, ListTodo, CheckSquare } from 'lucide-react'

const ICON_MAP: Record<string, React.ElementType> = {
  Home, Users, CalendarDays, Heart, ThumbsUp, ListTodo, CheckSquare,
}

interface NavItem {
  href: string
  icon: string
  label: string
}

export default function PortalActiveNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname()
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-stone-200 flex items-stretch">
      {items.map(({ href, icon, label }) => {
        const Icon = ICON_MAP[icon]
        const active = pathname === href || (href !== items[0].href && pathname.startsWith(href))
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              active ? 'text-rose-700' : 'text-stone-400'
            }`}
          >
            <Icon className={`w-5 h-5 ${active ? 'text-rose-700' : 'text-stone-400'}`} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
