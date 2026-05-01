import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { userId } = await request.json()
  const supabase = createServiceClient()

  // Get invite
  const { data: invite, error } = await supabase
    .from('invites')
    .select('*')
    .eq('token', token)
    .single()

  if (error || !invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  const isClient = invite.role === 'client'

  if (!isClient) {
    const knownRoles = ['owner','admin','project_head','coordinator','accounts','logistics','hospitality','fb_team','decor_team','creative','photography','view_only']
    const companyRole = knownRoles.includes(invite.role) ? invite.role : 'coordinator'

    // Add to company (skip if already member)
    await supabase.from('company_members').upsert({
      company_id: invite.company_id,
      user_id: userId,
      role: companyRole,
    }, { onConflict: 'company_id,user_id', ignoreDuplicates: true })

    // Add to event_team for event-specific invites
    if (invite.wedding_id || invite.org_event_id) {
      const eventRole = invite.event_role ?? companyRole
      await supabase.from('event_team').upsert({
        company_id: invite.company_id,
        user_id: userId,
        wedding_id: invite.wedding_id ?? null,
        org_event_id: invite.org_event_id ?? null,
        role: eventRole,
        is_freelancer: invite.is_freelancer ?? false,
        expires_at: invite.expires_at ?? null,
        added_by: invite.invited_by,
      }, { onConflict: invite.wedding_id ? 'user_id,wedding_id' : 'user_id,org_event_id', ignoreDuplicates: true })
    }
  }

  // Mark invite as accepted
  await supabase
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('token', token)

  return NextResponse.json({
    success: true,
    role: invite.role,
    wedding_id: invite.wedding_id,
    org_event_id: invite.org_event_id,
  })
}
