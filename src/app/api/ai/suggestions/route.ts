import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ suggestions: [] }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const entityId = searchParams.get('entityId')
  const entityType = searchParams.get('entityType') as 'wedding' | 'org_event' | null

  if (!entityId || !entityType) return NextResponse.json({ suggestions: [] }, { status: 400 })

  const sc = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)
  const suggestions: string[] = []

  if (entityType === 'wedding') {
    const [
      { data: overdueTasks },
      { data: unseated },
      { data: pendingRsvp },
      { data: vendors },
    ] = await Promise.all([
      sc.from('checklist_items').select('id').eq('wedding_id', entityId).neq('status', 'done').lt('due_date', today),
      sc.from('guests').select('id').eq('wedding_id', entityId).eq('rsvp_status', 'confirmed'),
      sc.from('guests').select('id').eq('wedding_id', entityId).or('rsvp_status.is.null,rsvp_status.eq.pending'),
      sc.from('vendors').select('id, status, paid_amount, total_amount').eq('wedding_id', entityId),
    ])

    // Unseated: need seating assignments to cross-check
    const confirmedIds = (unseated ?? []).map((g: { id: string }) => g.id)
    let unseatedCount = 0
    if (confirmedIds.length > 0) {
      const { data: seated } = await sc.from('seating_assignments').select('guest_id').in('guest_id', confirmedIds)
      unseatedCount = confirmedIds.length - (seated ?? []).length
    }

    const overdueCount = (overdueTasks ?? []).length
    const pendingRsvpCount = (pendingRsvp ?? []).length
    const overduePayments = (vendors ?? []).filter((v: { status: string; paid_amount: number | null; total_amount: number | null }) =>
      v.status !== 'paid' && (v.paid_amount ?? 0) < (v.total_amount ?? 0)
    ).length

    if (overdueCount > 0) suggestions.push(`⚠ ${overdueCount} overdue task${overdueCount > 1 ? 's' : ''} dikhao`)
    if (unseatedCount > 0) suggestions.push(`Unseated guests kaun? (${unseatedCount})`)
    if (pendingRsvpCount > 0) suggestions.push(`RSVP pending list (${pendingRsvpCount} log)`)
    if (overduePayments > 0) suggestions.push(`Overdue payments (${overduePayments})`)

    // Always add a few generic useful ones to fill up to 5
    const generics = [
      'Aaj ka status kya hai?',
      'Vendor contacts dikhao',
      'Budget overview batao',
      'Koi urgent cheez hai?',
      'VIP guests list dikhao',
    ]
    for (const g of generics) {
      if (suggestions.length >= 5) break
      suggestions.push(g)
    }
  } else {
    const [
      { data: overdueTasks },
      { data: speakers },
      { data: delegates },
    ] = await Promise.all([
      sc.from('org_checklist_items').select('id').eq('org_event_id', entityId).neq('status', 'done').lt('due_date', today),
      sc.from('speakers').select('id, status').eq('org_event_id', entityId),
      sc.from('delegates').select('id, rsvp_status').eq('org_event_id', entityId),
    ])

    const overdueCount = (overdueTasks ?? []).length
    const pendingSpeakers = (speakers ?? []).filter((s: { status: string }) => s.status !== 'confirmed').length
    const pendingDelegates = (delegates ?? []).filter((d: { rsvp_status: string | null }) => !d.rsvp_status || d.rsvp_status === 'pending').length

    if (overdueCount > 0) suggestions.push(`⚠ ${overdueCount} overdue task${overdueCount > 1 ? 's' : ''} dikhao`)
    if (pendingSpeakers > 0) suggestions.push(`Speakers pending confirmation (${pendingSpeakers})`)
    if (pendingDelegates > 0) suggestions.push(`Delegates RSVP pending (${pendingDelegates})`)

    const generics = [
      'Event ka status kya hai?',
      'Koi overdue payments hain?',
      'Volunteers ready hain?',
      'Agenda review karo',
      'Sponsor status batao',
    ]
    for (const g of generics) {
      if (suggestions.length >= 5) break
      suggestions.push(g)
    }
  }

  return NextResponse.json({ suggestions: suggestions.slice(0, 5) })
}
