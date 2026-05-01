import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamClient from './TeamClient'

export default async function TeamPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const { data: membership } = await sc.from('company_members')
    .select('company_id, role').eq('user_id', user.id).single()
  if (!membership) redirect('/dashboard')

  const companyId = membership.company_id

  const [
    { data: members },
    { data: pendingInvites },
  ] = await Promise.all([
    sc.from('company_members')
      .select('id, role, created_at, users(id, name, email, avatar_url)')
      .eq('company_id', companyId)
      .order('created_at'),
    sc.from('invites')
      .select('id, email, role, token, created_at, expires_at')
      .eq('company_id', companyId)
      .is('wedding_id', null)
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),
  ])

  // Count events per member
  const memberIds = (members ?? []).map((m: { users: { id: string } | null }) => m.users?.id).filter(Boolean) as string[]
  let eventCounts: Record<string, number> = {}
  if (memberIds.length > 0) {
    const { data: teamRows } = await sc.from('event_team')
      .select('user_id').in('user_id', memberIds)
    if (teamRows) {
      teamRows.forEach((r: { user_id: string }) => {
        eventCounts[r.user_id] = (eventCounts[r.user_id] || 0) + 1
      })
    }
  }

  return (
    <TeamClient
      myRole={membership.role}
      members={(members ?? []).map((m: {
        id: string; role: string; created_at: string;
        users: { id: string; name: string | null; email: string; avatar_url: string | null } | null
      }) => ({
        id: m.id,
        role: m.role,
        created_at: m.created_at,
        userId: m.users?.id ?? '',
        name: m.users?.name ?? m.users?.email ?? 'Unknown',
        email: m.users?.email ?? '',
        avatar_url: m.users?.avatar_url ?? null,
        eventCount: eventCounts[m.users?.id ?? ''] ?? 0,
      }))}
      pendingInvites={(pendingInvites ?? []).map((i: {
        id: string; email: string; role: string; token: string; created_at: string; expires_at: string | null
      }) => i)}
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ''}
    />
  )
}
