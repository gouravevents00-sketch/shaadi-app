import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { CalendarDays, ListTodo, ArrowRight, Clock } from 'lucide-react'

interface PortalEvent { id: string; name: string; date: string; start_time: string | null; venue: string | null; description: string | null }
interface PortalReq { id: string; title: string; priority: string; status: string }

const fmtDate = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
const fmtShort = (d: string) =>
  new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export default async function PortalHome({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const sc = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { data: wedding },
    { data: events },
    { data: requirements },
  ] = await Promise.all([
    sc.from('weddings').select('*').eq('id', weddingId).single(),
    sc.from('events').select('id, name, date, start_time, venue, description').eq('wedding_id', weddingId).order('date'),
    sc.from('requirements').select('id, title, priority, status').eq('wedding_id', weddingId).order('created_at', { ascending: false }),
  ])

  const daysLeft = wedding?.wedding_date
    ? Math.ceil((new Date(wedding.wedding_date).getTime() - Date.now()) / 86400000)
    : null

  const reqs = (requirements ?? []) as PortalReq[]
  const evts = (events ?? []) as PortalEvent[]
  const openReqs = reqs.filter(r => r.status !== 'done')
  const upcomingEvents = evts.filter(e => e.date >= today)
  const pastEvents = evts.filter(e => e.date < today)

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-br from-rose-700 to-rose-900 rounded-2xl p-6 text-white">
        <p className="text-rose-200 text-sm mb-1">Your wedding</p>
        <h1 className="text-2xl font-bold mb-1">
          {wedding?.bride_name}{wedding?.groom_name ? ` & ${wedding.groom_name}` : ''}
        </h1>
        {wedding?.primary_venue && (
          <p className="text-rose-200 text-sm">
            {[wedding.primary_venue, wedding.primary_city].filter(Boolean).join(', ')}
          </p>
        )}
        {daysLeft !== null && (
          <div className="mt-4 inline-flex items-center gap-2 bg-white/20 rounded-xl px-4 py-2">
            <Clock className="w-4 h-4 text-rose-100" />
            <span className="font-semibold text-lg">
              {daysLeft < 0 ? 'Completed!' : daysLeft === 0 ? 'Today!' : `${daysLeft} days to go`}
            </span>
            {daysLeft > 0 && wedding?.wedding_date && (
              <span className="text-rose-200 text-sm">· {fmtDate(wedding.wedding_date)}</span>
            )}
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link href={`/portal/${weddingId}/requirements`}
          className="bg-white border border-stone-200 rounded-xl p-4 hover:border-rose-300 hover:shadow-sm transition-all group">
          <ListTodo className="w-5 h-5 text-rose-500 mb-2" />
          <p className="text-sm font-semibold text-stone-800">My Requirements</p>
          <p className="text-xs text-stone-400 mt-0.5">
            {openReqs.length > 0
              ? `${openReqs.length} item${openReqs.length !== 1 ? 's' : ''} open`
              : reqs.length > 0 ? 'All addressed' : 'Add your wishlist'}
          </p>
          <ArrowRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-rose-400 mt-2 transition-colors" />
        </Link>

        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <CalendarDays className="w-5 h-5 text-rose-500 mb-2" />
          <p className="text-sm font-semibold text-stone-800">Events</p>
          <p className="text-xs text-stone-400 mt-0.5">
            {evts.length} event{evts.length !== 1 ? 's' : ''} planned
          </p>
          <p className="text-xs text-stone-300 mt-2">{upcomingEvents.length} upcoming</p>
        </div>
      </div>

      {/* Events */}
      {evts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Your events</p>
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100">
            {[...upcomingEvents, ...pastEvents].map(ev => (
              <div key={ev.id} className={`flex items-start gap-4 px-4 py-3.5 ${pastEvents.includes(ev) ? 'opacity-50' : ''}`}>
                <div className="w-10 h-10 rounded-lg bg-rose-50 flex flex-col items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-rose-600 leading-none">
                    {new Date(ev.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric' })}
                  </span>
                  <span className="text-xs text-rose-400 leading-none">
                    {new Date(ev.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short' })}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-stone-800">{ev.name}</p>
                  {ev.venue && <p className="text-xs text-stone-400 truncate mt-0.5">{ev.venue}</p>}
                  {ev.description && <p className="text-xs text-stone-400 mt-0.5 line-clamp-2">{ev.description}</p>}
                </div>
                {ev.start_time && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-medium text-stone-600">{ev.start_time.slice(0, 5)}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requirements preview */}
      {reqs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Recent requirements</p>
            <Link href={`/portal/${weddingId}/requirements`} className="text-xs text-rose-600 hover:text-rose-800">
              View all →
            </Link>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100">
            {reqs.slice(0, 4).map(req => (
              <div key={req.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                  req.priority === 'high' ? 'bg-red-100 text-red-700' :
                  req.priority === 'medium' ? 'bg-amber-100 text-amber-700' :
                  'bg-stone-100 text-stone-500'
                }`}>
                  {req.priority}
                </span>
                <span className={`flex-1 text-sm ${req.status === 'done' ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                  {req.title}
                </span>
                <span className="text-xs text-stone-400">
                  {req.status === 'done' ? 'Done' : req.status === 'in_progress' ? 'In progress' : 'Open'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
