import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Home, ListTodo, Users, Heart, CheckSquare, ThumbsUp, CalendarDays } from 'lucide-react'

export default async function PortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ weddingId: string }>
}) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/portal/${weddingId}`)

  const sc = createServiceClient()

  // Verify user has an accepted client invite for this wedding
  const { data: invite } = await sc.from('invites')
    .select('id, email')
    .eq('wedding_id', weddingId)
    .eq('role', 'client')
    .eq('email', user.email ?? '')
    .not('accepted_at', 'is', null)
    .single()

  if (!invite) redirect('/login')

  const { data: wedding } = await sc.from('weddings')
    .select('bride_name, groom_name, wedding_date, primary_venue, primary_city')
    .eq('id', weddingId)
    .single()

  if (!wedding) redirect('/login')

  const coupleNames = wedding.groom_name ? `${wedding.bride_name} & ${wedding.groom_name}` : wedding.bride_name

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col">
      {/* Top nav */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-rose-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm">✦</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-stone-900 leading-none">{coupleNames}</p>
              <p className="text-xs text-stone-400 leading-none mt-0.5">
                {[wedding.primary_venue, wedding.primary_city].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>
          <nav className="flex items-center gap-0.5 overflow-x-auto">
            {[
              { href: `/portal/${weddingId}`,              icon: Home,        label: 'Home' },
              { href: `/portal/${weddingId}/guests`,       icon: Users,        label: 'Guests' },
              { href: `/portal/${weddingId}/functions`,    icon: CalendarDays, label: 'Functions' },
              { href: `/portal/${weddingId}/preferences`,  icon: Heart,        label: 'Preferences' },
              { href: `/portal/${weddingId}/approvals`,    icon: ThumbsUp,    label: 'Approvals' },
              { href: `/portal/${weddingId}/requirements`, icon: ListTodo,    label: 'Wishlist' },
              { href: `/portal/${weddingId}/progress`,     icon: CheckSquare, label: 'Progress' },
            ].map(({ href, icon: Icon, label }) => (
              <Link key={href} href={href}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-stone-600 hover:bg-stone-100 hover:text-stone-900 transition-colors whitespace-nowrap flex-shrink-0">
                <Icon className="w-3.5 h-3.5" /> {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-3 text-center">
        <p className="text-xs text-stone-400">
          Powered by Creative Era OS · <span className="text-stone-500">{user.email}</span>
        </p>
      </footer>
    </div>
  )
}
