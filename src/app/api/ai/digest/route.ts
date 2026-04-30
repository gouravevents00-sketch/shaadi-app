/**
 * Daily AI digest — scans all active weddings for a company and
 * returns a structured list of alert cards for the dashboard.
 *
 * GET /api/ai/digest   → used by dashboard to load digest cards
 * POST /api/ai/digest  → cron trigger (secured with CRON_SECRET)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export type DigestAlert = {
  weddingId: string
  weddingName: string
  level: 'urgent' | 'warn' | 'info'
  message: string
  href: string
}

export type DigestResult = {
  alerts: DigestAlert[]
  generatedAt: string
  weddingsScanned: number
}

async function generateDigest(companyId: string): Promise<DigestResult> {
  const sc = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)
  const soon = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  const ago3 = new Date(Date.now() - 3 * 86400000).toISOString()

  const { data: weddings } = await sc
    .from('weddings')
    .select('id, bride_name, groom_name, wedding_date, budget_total')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .order('wedding_date', { ascending: true })

  if (!weddings || weddings.length === 0) {
    return { alerts: [], generatedAt: new Date().toISOString(), weddingsScanned: 0 }
  }

  const alerts: DigestAlert[] = []

  for (const w of weddings) {
    const name = w.groom_name ? `${w.bride_name} & ${w.groom_name}` : w.bride_name
    const base = `/weddings/${w.id}`

    const [
      { data: overdueTasks },
      { data: dueSoon },
      { data: vendors },
      { data: unbookedVendors },
    ] = await Promise.all([
      sc.from('checklist_items').select('id').eq('wedding_id', w.id).neq('status', 'done').lt('due_date', today),
      sc.from('checklist_items').select('id').eq('wedding_id', w.id).neq('status', 'done').gte('due_date', today).lte('due_date', soon),
      sc.from('vendors').select('id, name, status, total_amount, paid_amount').eq('wedding_id', w.id),
      sc.from('vendors').select('id').eq('wedding_id', w.id).eq('status', 'enquired').eq('total_amount', 0).is('phone', null).is('contact_name', null).is('email', null),
    ])

    const overdueCount = (overdueTasks ?? []).length
    const dueSoonCount = (dueSoon ?? []).length
    const unbookedCount = (unbookedVendors ?? []).length

    // Overdue payments
    const vendorIds = (vendors ?? []).map((v: { id: string }) => v.id)
    let overduePaymentVendors: string[] = []
    if (vendorIds.length > 0) {
      const { data: overduePayments } = await sc
        .from('vendor_payments')
        .select('vendor_id, amount')
        .in('vendor_id', vendorIds)
        .is('paid_date', null)
        .lt('due_date', today)
      if (overduePayments && overduePayments.length > 0) {
        overduePaymentVendors = overduePayments.map((p: { vendor_id: string }) => {
          const v = (vendors ?? []).find((x: { id: string }) => x.id === p.vendor_id)
          return (v as { name: string } | undefined)?.name ?? 'Unknown'
        })
      }
    }

    // Stale enquired vendors
    const { data: staleVendors } = await sc
      .from('vendors')
      .select('name')
      .eq('wedding_id', w.id)
      .eq('status', 'enquired')
      .is('phone', null)
      .lt('created_at', ago3)

    if (overdueCount > 0) {
      alerts.push({ weddingId: w.id, weddingName: name, level: 'urgent', message: `${overdueCount} overdue task${overdueCount > 1 ? 's' : ''}`, href: `${base}/checklist` })
    }
    if (overduePaymentVendors.length > 0) {
      alerts.push({ weddingId: w.id, weddingName: name, level: 'urgent', message: `Payment overdue: ${overduePaymentVendors.slice(0, 2).join(', ')}${overduePaymentVendors.length > 2 ? ` +${overduePaymentVendors.length - 2} more` : ''}`, href: `${base}/vendors` })
    }
    if (unbookedCount > 0) {
      alerts.push({ weddingId: w.id, weddingName: name, level: 'warn', message: `${unbookedCount} vendor slot${unbookedCount > 1 ? 's' : ''} unfilled from ceremonies`, href: `${base}/vendors` })
    }
    if ((staleVendors ?? []).length > 0) {
      const sv = staleVendors as { name: string }[]
      alerts.push({ weddingId: w.id, weddingName: name, level: 'warn', message: `${sv.length} vendor${sv.length > 1 ? 's' : ''} enquired but not followed up (3+ days)`, href: `${base}/vendors` })
    }
    if (dueSoonCount > 0) {
      alerts.push({ weddingId: w.id, weddingName: name, level: 'info', message: `${dueSoonCount} task${dueSoonCount > 1 ? 's' : ''} due in next 3 days`, href: `${base}/checklist` })
    }
  }

  // Sort: urgent first, then warn, then info
  const order = { urgent: 0, warn: 1, info: 2 }
  alerts.sort((a, b) => order[a.level] - order[b.level])

  return { alerts: alerts.slice(0, 10), generatedAt: new Date().toISOString(), weddingsScanned: weddings.length }
}

// ── GET: dashboard fetches digest on load ─────────────────────────────────────
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ alerts: [] }, { status: 401 })

  const { data: member } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .single()

  if (!member?.company_id) return NextResponse.json({ alerts: [], weddingsScanned: 0, generatedAt: new Date().toISOString() })

  const result = await generateDigest(member.company_id)
  return NextResponse.json(result)
}

// ── POST: cron trigger ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Run digest for all companies with active weddings
  const sc = createServiceClient()
  const { data: companies } = await sc.from('companies').select('id').eq('is_active', true)

  let total = 0
  for (const company of companies ?? []) {
    const result = await generateDigest(company.id)
    total += result.weddingsScanned
  }

  return NextResponse.json({ ok: true, weddingsScanned: total, generatedAt: new Date().toISOString() })
}
