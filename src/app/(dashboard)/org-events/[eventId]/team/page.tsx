import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import EventTeamTab from '@/components/shared/EventTeamTab'

export default async function OrgEventTeamPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const { data: membership } = await sc.from('company_members')
    .select('company_id, role').eq('user_id', user.id).single()
  if (!membership) redirect('/login')

  const companyId = membership.company_id

  const { data: event } = await sc.from('org_events').select('start_date').eq('id', eventId).single()

  const [{ data: allMembers }, { data: teamRows }] = await Promise.all([
    sc.from('company_members')
      .select('id, role, users(id, name, email, avatar_url)')
      .eq('company_id', companyId),
    sc.from('event_team')
      .select('id, user_id, role, is_project_head, is_freelancer, users(name, email, avatar_url)')
      .eq('org_event_id', eventId)
      .eq('company_id', companyId),
  ])

  const companyMembers = (allMembers ?? []).map((m: {
    id: string; role: string
    users: { id: string; name: string | null; email: string; avatar_url: string | null } | null
  }) => ({
    id: m.id,
    userId: m.users?.id ?? '',
    name: m.users?.name ?? m.users?.email ?? 'Unknown',
    email: m.users?.email ?? '',
    role: m.role,
    avatar_url: m.users?.avatar_url ?? null,
  }))

  const teamMembers = (teamRows ?? []).map((r: {
    id: string; user_id: string; role: string; is_project_head: boolean; is_freelancer: boolean
    users: { name: string | null; email: string; avatar_url: string | null } | null
  }) => ({
    id: r.id,
    userId: r.user_id,
    name: r.users?.name ?? r.users?.email ?? 'Unknown',
    email: r.users?.email ?? '',
    role: r.role,
    is_project_head: r.is_project_head,
    is_freelancer: r.is_freelancer,
    avatar_url: r.users?.avatar_url ?? null,
  }))

  return (
    <EventTeamTab
      weddingId={null}
      orgEventId={eventId}
      eventDate={event?.start_date ?? null}
      companyMembers={companyMembers}
      teamMembers={teamMembers}
      myRole={membership.role}
      companyId={companyId}
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
    />
  )
}
