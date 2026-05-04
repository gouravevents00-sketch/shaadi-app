'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { HeartHandshake, Building2, ArrowRight, Sparkles, UsersRound, CheckSquare } from 'lucide-react'

const QUICK_STARTS = [
  {
    href: '/weddings/new',
    icon: HeartHandshake,
    title: 'Add a wedding',
    desc: 'Guest list, ceremonies, vendors, rooms, seating, ground control',
    color: 'border-rose-200 hover:border-rose-400',
    iconBg: 'bg-rose-50 text-rose-600',
  },
  {
    href: '/org-events/new',
    icon: Building2,
    title: 'Add a corporate / public event',
    desc: 'Conference, concert, activation, government function & more',
    color: 'border-blue-200 hover:border-blue-400',
    iconBg: 'bg-blue-50 text-blue-600',
  },
  {
    href: '/dashboard/team',
    icon: UsersRound,
    title: 'Set up your team',
    desc: 'Invite coordinators, project heads, accounts, logistics team',
    color: 'border-purple-200 hover:border-purple-400',
    iconBg: 'bg-purple-50 text-purple-600',
  },
  {
    href: '/dashboard/templates',
    icon: CheckSquare,
    title: 'Explore checklist templates',
    desc: 'Pre-built task lists for different event types',
    color: 'border-emerald-200 hover:border-emerald-400',
    iconBg: 'bg-emerald-50 text-emerald-600',
  },
]

export default function WelcomeScreen({ canCreate }: { canCreate: boolean }) {
  const params = useSearchParams()
  const isNew = params.get('welcome') === '1'

  return (
    <div className="max-w-2xl mx-auto py-12">
      {isNew ? (
        <>
          <div className="text-center mb-10">
            <div className="w-14 h-14 rounded-2xl bg-rose-700 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-stone-900">Welcome to UtsavOS!</h2>
            <p className="text-stone-500 text-sm mt-2">Your account is set up. Where do you want to start?</p>
          </div>
        </>
      ) : (
        <div className="text-center mb-10">
          <p className="text-stone-500 font-medium text-lg">No events yet</p>
          <p className="text-stone-400 text-sm mt-1">Create your first event to get started</p>
        </div>
      )}

      {canCreate && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {QUICK_STARTS.map(q => (
            <Link
              key={q.href}
              href={q.href}
              className={`group flex items-start gap-4 bg-white border-2 rounded-xl p-5 transition-colors ${q.color}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${q.iconBg}`}>
                <q.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-900 flex items-center gap-1">
                  {q.title}
                  <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-stone-600 transition-colors ml-auto" />
                </p>
                <p className="text-xs text-stone-400 mt-0.5 leading-snug">{q.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {isNew && (
        <p className="text-center text-xs text-stone-400 mt-8">
          Need help?{' '}
          <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer" className="text-rose-600 hover:underline">
            WhatsApp us
          </a>
          {' '}or{' '}
          <Link href="/for-agencies" className="text-rose-600 hover:underline">view the feature guide</Link>
        </p>
      )}
    </div>
  )
}
