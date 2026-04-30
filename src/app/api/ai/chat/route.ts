import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Minimal row types (Supabase returns untyped data) ────────────────────────
type GuestRow = { id: string; name: string; rsvp_status: string | null; side: string | null; is_vip: boolean | null; family_group: string | null }
type EventRow = { name: string; date: string | null; start_time: string | null; venue: string | null }
type ChecklistRow = { title: string; category: string | null; status: string | null; due_date: string | null; assignee?: string | null }
type VendorRow = { id: string; name: string; category: string | null; status: string | null; total_amount: number | null; paid_amount: number | null }
type OrgVendorRow = { id: string; name: string; category: string | null; status: string | null; quoted_amount: number | null; paid_amount: number | null }
type PaymentRow = { vendor_id: string; amount: number; due_date: string; paid_date: string | null }
type TableRow = { name: string; capacity: number | null }
type SpeakerRow = { name: string; topic: string | null; status: string | null }
type VolunteerRow = { name: string; role: string | null; zone: string | null; checked_in: boolean | null }
type SponsorRow = { name: string; tier: string | null; amount: number | null; amount_received: number | null }
type DelegateRow = { id: string; name: string; rsvp_status: string | null; checked_in: boolean | null }
type ArtistRow = { name: string; category: string | null; status: string | null }
type AgendaRow = { time: string | null; activity: string; owner: string | null; venue: string | null }
type BudgetItemRow = { name: string; category: string | null; estimated: number | null; actual: number | null }

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN')
}

// ─── Wedding context ──────────────────────────────────────────────────────────

async function buildWeddingContext(weddingId: string) {
  const sc = createServiceClient()

  const [
    { data: wedding },
    { data: guests },
    { data: events },
    { data: checklist },
    { data: vendors },
    { data: tables },
    { data: assignments },
  ] = await Promise.all([
    sc.from('weddings').select('bride_name, groom_name, wedding_date, date_from, date_to, primary_venue, primary_city, budget_total').eq('id', weddingId).single(),
    sc.from('guests').select('id, name, rsvp_status, side, is_vip, family_group').eq('wedding_id', weddingId),
    sc.from('events').select('name, date, start_time, venue').eq('wedding_id', weddingId).order('date'),
    sc.from('checklist_items').select('title, category, status, due_date, assignee').eq('wedding_id', weddingId),
    sc.from('vendors').select('id, name, category, status, total_amount, paid_amount').eq('wedding_id', weddingId),
    sc.from('seating_tables').select('id, name, capacity').eq('wedding_id', weddingId),
    sc.from('seating_assignments').select('guest_id'),
  ])

  const g = (guests ?? []) as GuestRow[]
  const ev = (events ?? []) as EventRow[]
  const cl = (checklist ?? []) as ChecklistRow[]
  const v = (vendors ?? []) as VendorRow[]
  const tbl = (tables ?? []) as (TableRow & { id: string })[]
  const seatedIds = ((assignments ?? []) as { guest_id: string }[]).map(a => a.guest_id)

  const vendorIds = v.map(x => x.id)
  const { data: paymentsRaw } = vendorIds.length > 0
    ? await sc.from('vendor_payments').select('vendor_id, amount, due_date, paid_date').in('vendor_id', vendorIds)
    : { data: [] }
  const payments = (paymentsRaw ?? []) as PaymentRow[]

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const confirmed = g.filter(x => x.rsvp_status === 'confirmed').length
  const declined = g.filter(x => x.rsvp_status === 'declined').length
  const pending = g.filter(x => !x.rsvp_status || x.rsvp_status === 'pending').length
  const vips = g.filter(x => x.is_vip)
  const unseated = g.filter(x => x.rsvp_status === 'confirmed' && !seatedIds.includes(x.id))
  const done = cl.filter(x => x.status === 'done').length
  const overdueTasks = cl.filter(x => x.status !== 'done' && x.due_date && x.due_date < today)
  const pendingTasks = cl.filter(x => x.status !== 'done')
  const totalSpend = v.reduce((s, x) => s + (x.total_amount || 0), 0)
  const totalPaid = v.reduce((s, x) => s + (x.paid_amount || 0), 0)
  const overduePayments = payments.filter(p => !p.paid_date && new Date(p.due_date + 'T00:00:00') < now)
  const budget = (wedding?.budget_total as number) || 0

  return `You are an AI assistant inside Creative Era OS, a professional event management platform.
Always reply in English only. Be brief and direct — 2-4 lines max unless a list is essential.
No greetings, no filler, no explaining what you're about to do. Just the answer.
Only mention data relevant to the question. Flag urgent items with ⚠️.

━━━ WEDDING ━━━
${wedding?.bride_name} weds ${wedding?.groom_name}
Date: ${wedding?.wedding_date ? fmtDate(wedding.wedding_date as string) : 'TBD'}${wedding?.date_from ? ` (${fmtDate(wedding.date_from as string)} – ${fmtDate((wedding.date_to || wedding.date_from) as string)})` : ''}
Venue: ${wedding?.primary_venue || 'TBD'}, ${wedding?.primary_city || ''}
Budget: ${fmt(budget)}

━━━ GUESTS (${g.length} total) ━━━
Confirmed: ${confirmed} | Pending RSVP: ${pending} | Declined: ${declined}
Bride's side: ${g.filter(x => x.side === 'bride').length} | Groom's side: ${g.filter(x => x.side === 'groom').length}
VIPs (${vips.length}): ${vips.slice(0, 10).map(x => x.name).join(', ')}${vips.length > 10 ? ` +${vips.length - 10} more` : ''}
Unseated confirmed guests: ${unseated.length}${unseated.length > 0 ? ` — ${unseated.slice(0, 5).map(x => x.name).join(', ')}${unseated.length > 5 ? '…' : ''}` : ''}

━━━ EVENTS (${ev.length}) ━━━
${ev.map(e => `• ${e.name} — ${e.date ? fmtDate(e.date) : 'TBD'}${e.start_time ? ' at ' + e.start_time : ''}${e.venue ? ' @ ' + e.venue : ''}`).join('\n') || 'No events added yet'}

━━━ CHECKLIST (${done}/${cl.length} done) ━━━
${overdueTasks.length > 0 ? `⚠️ OVERDUE (${overdueTasks.length}): ${overdueTasks.map(x => `${x.title}${x.due_date ? ' (due ' + fmtDate(x.due_date) + ')' : ''}${x.assignee ? ' [' + x.assignee + ']' : ''}`).join('; ')}` : 'No overdue items ✓'}
Pending tasks (${pendingTasks.length}): ${pendingTasks.slice(0, 8).map(x => `${x.title} [${x.category}]${x.assignee ? ' — ' + x.assignee : ''}`).join(' | ')}${pendingTasks.length > 8 ? ` …+${pendingTasks.length - 8} more` : ''}

━━━ VENDORS (${v.length}) ━━━
Contracted: ${fmt(totalSpend)} | Paid: ${fmt(totalPaid)} | Remaining: ${fmt(totalSpend - totalPaid)}
${overduePayments.length > 0 ? `⚠️ OVERDUE PAYMENTS (${overduePayments.length}): ${overduePayments.map(p => {
    const vendor = v.find(x => x.id === p.vendor_id)
    return `${vendor?.name || 'Unknown'} ${fmt(p.amount)} due ${fmtDate(p.due_date)}`
  }).join('; ')}` : 'All payments on track ✓'}
${v.map(x => `• ${x.name} [${x.category}] ${x.status} — Paid: ${fmt(x.paid_amount || 0)}/${fmt(x.total_amount || 0)}`).join('\n')}

━━━ SEATING ━━━
Tables: ${tbl.length} | Seated: ${seatedIds.length}/${confirmed} confirmed guests
${tbl.map(t => `• ${t.name} (cap: ${t.capacity})`).join('\n') || 'No tables yet'}

━━━ BUDGET ━━━
Total budget: ${fmt(budget)} | Contracted: ${fmt(totalSpend)} | Headroom: ${fmt(budget - totalSpend)}`
}

// ─── Org-event context ────────────────────────────────────────────────────────

async function buildOrgEventContext(eventId: string) {
  const sc = createServiceClient()

  const [
    { data: event },
    { data: speakers },
    { data: checklist },
    { data: vendors },
    { data: volunteers },
    { data: sponsors },
    { data: delegates },
    { data: artists },
    { data: agenda },
    { data: budgetItems },
  ] = await Promise.all([
    sc.from('org_events').select('name, type, start_date, end_date, venue, city, expected_count, budget_total, status').eq('id', eventId).single(),
    sc.from('speakers').select('name, topic, status').eq('org_event_id', eventId),
    sc.from('org_checklist_items').select('title, category, status, due_date').eq('org_event_id', eventId),
    sc.from('org_vendors').select('id, name, category, status, quoted_amount, paid_amount').eq('org_event_id', eventId),
    sc.from('org_volunteers').select('name, role, zone, checked_in').eq('org_event_id', eventId),
    sc.from('org_sponsors').select('name, tier, amount, amount_received').eq('org_event_id', eventId),
    sc.from('delegates').select('id, name, rsvp_status, checked_in').eq('org_event_id', eventId),
    sc.from('org_artists').select('name, category, status').eq('org_event_id', eventId),
    sc.from('org_timeline_items').select('time, activity, owner, venue').eq('org_event_id', eventId).order('time'),
    sc.from('org_budget_items').select('name, category, estimated, actual').eq('org_event_id', eventId),
  ])

  const cl = (checklist ?? []) as ChecklistRow[]
  const v = (vendors ?? []) as OrgVendorRow[]
  const d = (delegates ?? []) as DelegateRow[]
  const sp = (sponsors ?? []) as SponsorRow[]
  const vol = (volunteers ?? []) as VolunteerRow[]
  const spk = (speakers ?? []) as SpeakerRow[]
  const ag = (agenda ?? []) as AgendaRow[]
  const ar = (artists ?? []) as ArtistRow[]
  ;(budgetItems ?? []) as BudgetItemRow[] // fetched but not used in prompt yet

  const vendorIds = v.map(x => x.id)
  const { data: vpRaw } = vendorIds.length > 0
    ? await sc.from('org_vendor_payments').select('vendor_id, amount, due_date, paid_date').in('vendor_id', vendorIds)
    : { data: [] }
  const vendorPayments = (vpRaw ?? []) as PaymentRow[]

  const now = new Date()
  const today = now.toISOString().slice(0, 10)
  const done = cl.filter(x => x.status === 'done').length
  const overdueTasks = cl.filter(x => x.status !== 'done' && x.due_date && x.due_date < today)
  const pendingTasks = cl.filter(x => x.status !== 'done')
  const totalContracted = v.reduce((s, x) => s + (x.quoted_amount || 0), 0)
  const totalPaid = v.reduce((s, x) => s + (x.paid_amount || 0), 0)
  const overduePayments = vendorPayments.filter(p => !p.paid_date && new Date(p.due_date + 'T00:00:00') < now)
  const checkedIn = d.filter(x => x.checked_in).length
  const confirmedDelegates = d.filter(x => x.rsvp_status === 'confirmed').length
  const totalSponsorAmt = sp.reduce((s, x) => s + (x.amount || 0), 0)
  const totalSponsorReceived = sp.reduce((s, x) => s + (x.amount_received || 0), 0)
  const typeLabel = event?.type === 'corporate' ? 'Corporate Event' : event?.type === 'government' ? 'Government Function' : 'Public Event'
  const budget = (event?.budget_total as number) || 0
  const confirmedSpeakers = spk.filter(x => x.status === 'confirmed')
  const pendingSpeakers = spk.filter(x => x.status !== 'confirmed')

  return `You are an AI assistant inside Creative Era OS, a professional event management platform.
Always reply in English only. Be brief and direct — 2-4 lines max unless a list is essential.
No greetings, no filler, no explaining what you're about to do. Just the answer.
Only mention data relevant to the question. Flag urgent items with ⚠️.

━━━ EVENT ━━━
${event?.name || 'Unnamed Event'} [${typeLabel}]
Dates: ${event?.start_date ? fmtDate(event.start_date as string) : 'TBD'}${event?.end_date && event.end_date !== event?.start_date ? ` – ${fmtDate(event.end_date as string)}` : ''}
Venue: ${event?.venue || 'TBD'}${event?.city ? ', ' + event.city : ''}
Expected attendees: ${event?.expected_count || 'TBD'} | Status: ${event?.status || 'planning'}
Budget: ${fmt(budget)}

━━━ DELEGATES / ATTENDEES (${d.length} total) ━━━
Confirmed: ${confirmedDelegates} | Checked-in: ${checkedIn} | Pending: ${d.length - confirmedDelegates}

━━━ SPEAKERS (${spk.length}) ━━━
Confirmed (${confirmedSpeakers.length}): ${confirmedSpeakers.slice(0, 8).map(x => `${x.name}${x.topic ? ' — ' + x.topic : ''}`).join(' | ') || 'None'}
${pendingSpeakers.length > 0 ? `Pending confirmation (${pendingSpeakers.length}): ${pendingSpeakers.map(x => x.name).join(', ')}` : ''}

━━━ AGENDA (${ag.length} items) ━━━
${ag.slice(0, 10).map(x => `• ${x.time} — ${x.activity}${x.owner ? ' [' + x.owner + ']' : ''}${x.venue ? ' @ ' + x.venue : ''}`).join('\n') || 'No agenda items yet'}

━━━ CHECKLIST (${done}/${cl.length} done) ━━━
${overdueTasks.length > 0 ? `⚠️ OVERDUE (${overdueTasks.length}): ${overdueTasks.map(x => `${x.title}${x.due_date ? ' (due ' + fmtDate(x.due_date) + ')' : ''}`).join('; ')}` : 'No overdue items ✓'}
Pending (${pendingTasks.length}): ${pendingTasks.slice(0, 8).map(x => `${x.title} [${x.category}]`).join(' | ')}${pendingTasks.length > 8 ? ` …+${pendingTasks.length - 8} more` : ''}

━━━ VENDORS (${v.length}) ━━━
Contracted: ${fmt(totalContracted)} | Paid: ${fmt(totalPaid)} | Remaining: ${fmt(totalContracted - totalPaid)}
${overduePayments.length > 0 ? `⚠️ OVERDUE PAYMENTS (${overduePayments.length}): ${overduePayments.map(p => {
    const vendor = v.find(x => x.id === p.vendor_id)
    return `${vendor?.name || 'Unknown'} ${fmt(p.amount)} due ${fmtDate(p.due_date)}`
  }).join('; ')}` : 'All payments on track ✓'}
${v.map(x => `• ${x.name} [${x.category}] ${x.status}`).join('\n')}

━━━ VOLUNTEERS (${vol.length}) ━━━
${vol.length > 0 ? vol.slice(0, 8).map(x => `• ${x.name}${x.role ? ' — ' + x.role : ''}${x.zone ? ' [' + x.zone + ']' : ''}${x.checked_in ? ' ✓' : ''}`).join('\n') : 'No volunteers added yet'}

━━━ SPONSORS (${sp.length}) ━━━
Total sponsorship: ${fmt(totalSponsorAmt)} | Received: ${fmt(totalSponsorReceived)}
${sp.map(x => `• ${x.name} [${x.tier || 'sponsor'}] — ${fmt(x.amount_received || 0)}/${fmt(x.amount || 0)}`).join('\n') || 'No sponsors yet'}

${ar.length > 0 ? `━━━ ARTISTS (${ar.length}) ━━━
${ar.map(x => `• ${x.name} [${x.category}] ${x.status}`).join('\n')}` : ''}

━━━ BUDGET ━━━
Total budget: ${fmt(budget)} | Vendor contracted: ${fmt(totalContracted)} | Headroom: ${fmt(budget - totalContracted)}`
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { entityId, entityType, message, history } = await req.json() as {
    entityId: string
    entityType: 'wedding' | 'org_event'
    message: string
    history: { role: 'user' | 'assistant'; content: string }[]
  }

  if (!entityId || !message) return new Response('Bad request', { status: 400 })

  const systemPrompt = entityType === 'org_event'
    ? await buildOrgEventContext(entityId)
    : await buildWeddingContext(entityId)

  const trimmedHistory = history.slice(-10)
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: systemPrompt,
          messages: [...trimmedHistory, { role: 'user', content: message }],
        })

        for await (const event of anthropicStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(event.delta.text))
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\n[Error: ${err instanceof Error ? err.message : 'Unknown error'}]`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  })
}
