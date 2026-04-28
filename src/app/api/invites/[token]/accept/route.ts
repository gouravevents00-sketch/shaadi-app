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
    // Add user to company (coordinator/admin roles only)
    await supabase.from('company_members').insert({
      company_id: invite.company_id,
      user_id: userId,
      role: ['owner', 'admin', 'coordinator'].includes(invite.role) ? invite.role : 'coordinator',
    })

    // Add wedding access if invite is wedding-specific
    if (invite.wedding_id) {
      const accessRole = ['coordinator', 'bride_family', 'groom_family', 'hospitality', 'logistics', 'fb_team', 'decor_team', 'photography'].includes(invite.role)
        ? invite.role
        : 'coordinator'
      await supabase.from('wedding_access').insert({
        wedding_id: invite.wedding_id,
        user_id: userId,
        role: accessRole,
        side: invite.side || 'neutral',
      })
    }
  }

  // Mark invite as accepted
  await supabase
    .from('invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('token', token)

  return NextResponse.json({ success: true, role: invite.role, wedding_id: invite.wedding_id })
}
