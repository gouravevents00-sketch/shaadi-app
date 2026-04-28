import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CalendarDays, Plus, ArrowRight } from 'lucide-react'
import WeddingActions from './WeddingActions'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('company_members')
    .select('company_id, role')
    .eq('user_id', user.id)
    .single()

  const { data: weddings } = await supabase
    .from('weddings')
    .select('id, bride_name, groom_name, wedding_date, date_from, date_to, status, wedding_code, primary_venue, primary_city, budget_total')
    .eq('company_id', member?.company_id)
    .order('wedding_date', { ascending: true })

  const statusColor: Record<string, string> = {
    setup: 'bg-stone-100 text-stone-600',
    active: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-blue-100 text-blue-700',
    archived: 'bg-stone-100 text-stone-400',
  }

  const daysUntil = (date: string | null) => {
    if (!date) return null
    const diff = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
    return diff
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Weddings</h1>
          <p className="text-stone-500 text-sm mt-0.5">All your active wedding projects</p>
        </div>
        {(member?.role === 'owner' || member?.role === 'admin') && (
          <Button asChild className="bg-rose-700 hover:bg-rose-800">
            <Link href="/weddings/new">
              <Plus className="w-4 h-4 mr-2" />
              New wedding
            </Link>
          </Button>
        )}
      </div>

      {/* Wedding cards */}
      {!weddings?.length ? (
        <div className="text-center py-20 border-2 border-dashed border-stone-200 rounded-xl">
          <CalendarDays className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 font-medium">No weddings yet</p>
          <p className="text-stone-400 text-sm mt-1">Create your first wedding project to get started</p>
          {(member?.role === 'owner' || member?.role === 'admin') && (
            <Button asChild className="mt-4 bg-rose-700 hover:bg-rose-800">
              <Link href="/weddings/new">
                <Plus className="w-4 h-4 mr-2" /> Create wedding
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {weddings.map(w => {
            const days = daysUntil(w.wedding_date)
            return (
              <div key={w.id} className="relative">
                <Link href={`/weddings/${w.id}/overview`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-stone-200">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                          <span className="text-rose-600 text-lg font-medium">
                            {w.bride_name[0]}{w.groom_name[0]}
                          </span>
                        </div>
                        <div>
                          <h2 className="font-semibold text-stone-900">
                            {w.bride_name} &amp; {w.groom_name}
                          </h2>
                          <div className="flex items-center gap-3 mt-1">
                            {w.wedding_date && (
                              <span className="text-sm text-stone-500 flex items-center gap-1">
                                <CalendarDays className="w-3.5 h-3.5" />
                                {new Date(w.wedding_date).toLocaleDateString('en-IN', {
                                  day: 'numeric', month: 'short', year: 'numeric'
                                })}
                              </span>
                            )}
                            {w.primary_venue && (
                              <span className="text-sm text-stone-400">{w.primary_venue}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {days !== null && days > 0 && (
                          <span className={`text-sm font-medium px-2.5 py-1 rounded-full ${
                            days <= 14 ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-600'
                          }`}>
                            {days}d to go
                          </span>
                        )}
                        <Badge className={statusColor[w.status] + ' border-0 capitalize'}>
                          {w.status}
                        </Badge>
                        <ArrowRight className="w-4 h-4 text-stone-400 mr-8" />
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
      )}
    </div>
  )
}
