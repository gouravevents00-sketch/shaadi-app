import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LeadsClient from './LeadsClient'

export default async function LeadsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase.from('company_members')
    .select('company_id').eq('user_id', user.id).single()
  if (!member) redirect('/dashboard')

  const sc = createServiceClient()

  // Fetch connections for this company with celebration + client user data
  const { data: connections } = await sc.from('planner_connections')
    .select(`
      id, status, message, wedding_id, created_at,
      user_id,
      celebration:celebrations(id, name, type, event_date, venue, city, guest_count, budget)
    `)
    .eq('company_id', member.company_id)
    .order('created_at', { ascending: false })

  // Fetch client emails separately
  const userIds = [...new Set((connections ?? []).map((c: { user_id: string }) => c.user_id))]
  const { data: clientUsers } = userIds.length > 0
    ? await sc.from('users').select('id, email').in('id', userIds)
    : { data: [] as { id: string; email: string }[] }

  const emailMap = Object.fromEntries((clientUsers ?? []).map((u: { id: string; email: string }) => [u.id, u.email]))

  const leads = (connections ?? []).map((c: {
    id: string; status: string; message: string | null; wedding_id: string | null
    created_at: string; user_id: string
    celebration: { id: string; name: string; type: string; event_date: string | null; venue: string | null; city: string | null; guest_count: number; budget: number } | { id: string; name: string; type: string; event_date: string | null; venue: string | null; city: string | null; guest_count: number; budget: number }[] | null
  }) => ({
    id: c.id,
    status: c.status,
    message: c.message,
    wedding_id: c.wedding_id,
    created_at: c.created_at,
    celebration: Array.isArray(c.celebration) ? c.celebration[0] ?? null : c.celebration ?? null,
    client_email: emailMap[c.user_id] ?? null,
  }))

  type LeadRow = { id: string; status: string; wedding_id: string | null; celebration: { budget: number } | null }
  // Fetch checklist progress for accepted leads
  const acceptedWeddingIds = (leads as LeadRow[]).filter(l => l.status === 'accepted' && l.wedding_id).map(l => l.wedding_id as string)
  const progressMap: Record<string, { total: number; done: number; nextEvent: string | null }> = {}

  if (acceptedWeddingIds.length > 0) {
    const [{ data: checklistCounts }, { data: nextEvents }] = await Promise.all([
      sc.from('checklist_items').select('wedding_id, status').in('wedding_id', acceptedWeddingIds),
      sc.from('events').select('wedding_id, name, date')
        .in('wedding_id', acceptedWeddingIds)
        .gte('date', new Date().toISOString().slice(0, 10))
        .order('date').limit(acceptedWeddingIds.length),
    ])

    for (const wid of acceptedWeddingIds) {
      const items = (checklistCounts ?? []).filter((i: { wedding_id: string; status: string }) => i.wedding_id === wid)
      const done = items.filter((i: { wedding_id: string; status: string }) => i.status === 'done').length
      const ev = (nextEvents ?? []).find((e: { wedding_id: string; name: string; date: string }) => e.wedding_id === wid)
      progressMap[wid] = {
        total: items.length,
        done,
        nextEvent: ev ? `${ev.name} · ${new Date(ev.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : null,
      }
    }
  }

  return <LeadsClient initialLeads={leads} progressMap={progressMap} />
}
