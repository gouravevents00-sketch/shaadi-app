import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('invites')
    .select('email, role, side, wedding_id, company_id, expires_at, accepted_at')
    .eq('token', token)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  // For client invites that are already accepted, allow re-login (don't block)
  if (data.accepted_at && data.role !== 'client') {
    return NextResponse.json({ error: 'Invite already accepted' }, { status: 410 })
  }

  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invite expired' }, { status: 410 })
  }

  // Fetch company and wedding separately (no FK declared on invites.wedding_id)
  const [{ data: company }, { data: wedding }] = await Promise.all([
    supabase.from('companies').select('name').eq('id', data.company_id).single(),
    data.wedding_id
      ? supabase.from('weddings').select('bride_name, groom_name').eq('id', data.wedding_id).single()
      : Promise.resolve({ data: null }),
  ])

  return NextResponse.json({
    email: data.email,
    role: data.role,
    side: data.side,
    wedding_id: data.wedding_id,
    company,
    wedding,
    already_accepted: !!data.accepted_at,
  })
}
