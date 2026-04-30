import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsClient from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const { data: membership } = await sc.from('company_members')
    .select('id, role, company_id').eq('user_id', user.id).single()
  if (!membership) redirect('/login')

  const [
    { data: profile },
    { data: company },
    { data: members },
    { data: pendingInvites },
  ] = await Promise.all([
    sc.from('users').select('id, name, email, phone').eq('id', user.id).single(),
    sc.from('companies').select('id, name, slug, plan').eq('id', membership.company_id).single(),
    sc.from('company_members')
      .select('id, role, created_at, users(id, name, email)')
      .eq('company_id', membership.company_id)
      .order('created_at'),
    sc.from('invites')
      .select('id, email, role, token, created_at, expires_at')
      .eq('company_id', membership.company_id)
      .is('wedding_id', null)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false }),
  ])

  return (
    <SettingsClient
      profile={profile}
      company={company}
      myRole={membership.role}
      members={(members ?? []) as MemberRow[]}
      pendingInvites={pendingInvites ?? []}
    />
  )
}

export type MemberRow = {
  id: string
  role: string
  created_at: string
  users: { id: string; name: string; email: string } | null
}
