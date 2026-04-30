import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, MapPin, Users, Plus, ArrowRight, CheckCircle2 } from 'lucide-react'

const TYPE_EMOJIS: Record<string, string> = {
  wedding: '💒', sagai: '💍', sangeet: '🎵', namkaran: '👶', mundan: '✂️',
  annaprashan: '🍚', janeu: '🧵', godh_bharai: '🤰', griha_pravesh: '🏠',
  puja: '🪔', birthday: '🎂', anniversary: '❤️', graduation: '🎓',
  retirement: '🎉', kitty: '👗', other: '✨',
}

const TYPE_LABELS: Record<string, string> = {
  wedding: 'Wedding', sagai: 'Sagai', sangeet: 'Sangeet', namkaran: 'Namkaran',
  mundan: 'Mundan', annaprashan: 'Annaprashan', janeu: 'Janeu',
  godh_bharai: 'Godh Bharai', griha_pravesh: 'Griha Pravesh', puja: 'Puja',
  birthday: 'Birthday', anniversary: 'Anniversary', graduation: 'Graduation',
  retirement: 'Retirement', kitty: 'Kitty Party', other: 'Event',
}

export default async function MyCelebrationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/celebrate/signup?next=/my')

  const sc = createServiceClient()
  const { data: celebrations } = await sc
    .from('celebrations')
    .select('id, name, type, event_date, venue, city, guest_count, plan, created_at')
    .eq('user_id', user.id)
    .order('event_date', { ascending: true, nullsFirst: false })

  if (!celebrations || celebrations.length === 0) {
    redirect('/celebrate/new')
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">My Celebrations</h1>
            <p className="text-stone-500 text-sm mt-0.5">{celebrations.length} event{celebrations.length !== 1 ? 's' : ''}</p>
          </div>
          <Link href="/celebrate/new"
            className="inline-flex items-center gap-1.5 bg-rose-700 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-rose-800 transition-colors">
            <Plus className="w-4 h-4" /> New event
          </Link>
        </div>

        <div className="space-y-3">
          {celebrations.map((cel: {
            id: string; name: string; type: string; event_date: string | null
            venue: string | null; city: string | null; guest_count: number; plan: string | null; created_at: string
          }) => {
            const emoji = TYPE_EMOJIS[cel.type] ?? '✨'
            const label = TYPE_LABELS[cel.type] ?? 'Event'
            const isPro = cel.plan === 'pro'
            const daysLeft = cel.event_date
              ? Math.ceil((new Date(cel.event_date).getTime() - Date.now()) / 86400000)
              : null

            return (
              <Link key={cel.id} href={`/my/${cel.id}`}
                className="flex items-start gap-4 bg-white border border-stone-200 rounded-2xl p-4 hover:border-rose-200 hover:shadow-sm transition-all group">
                <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-2xl flex-shrink-0">
                  {emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-stone-900">{cel.name}</span>
                    <span className="text-xs bg-stone-100 text-stone-600 px-2 py-0.5 rounded-full">{label}</span>
                    {isPro && (
                      <span className="inline-flex items-center gap-1 text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Pro
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                    {cel.event_date && (
                      <span className="text-xs text-stone-500 flex items-center gap-1">
                        <CalendarDays className="w-3 h-3" />
                        {new Date(cel.event_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {daysLeft !== null && daysLeft > 0 && (
                          <span className={`ml-1 ${daysLeft <= 30 ? 'text-rose-500 font-medium' : 'text-stone-400'}`}>
                            · {daysLeft}d to go
                          </span>
                        )}
                        {daysLeft !== null && daysLeft === 0 && <span className="ml-1 text-rose-600 font-medium">· Today!</span>}
                        {daysLeft !== null && daysLeft < 0 && <span className="ml-1 text-stone-400">· Completed</span>}
                      </span>
                    )}
                    {(cel.venue || cel.city) && (
                      <span className="text-xs text-stone-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {[cel.venue, cel.city].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {cel.guest_count > 0 && (
                      <span className="text-xs text-stone-500 flex items-center gap-1">
                        <Users className="w-3 h-3" /> ~{cel.guest_count} guests
                      </span>
                    )}
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-rose-400 flex-shrink-0 mt-1 transition-colors" />
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
