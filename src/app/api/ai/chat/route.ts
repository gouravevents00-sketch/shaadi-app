import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Minimal row types ────────────────────────────────────────────────────────
type GuestRow = { id: string; name: string; rsvp_status: string | null; side: string | null; is_vip: boolean | null; family_group: string | null }
type EventRow = { name: string; date: string | null; start_time: string | null; venue: string | null }
type ChecklistRow = { id: string; title: string; category: string | null; status: string | null; due_date: string | null; assignee?: string | null }
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

// ─── Tools ────────────────────────────────────────────────────────────────────

const WEDDING_TOOLS: Anthropic.Tool[] = [
  {
    name: 'update_guest_rsvp',
    description: 'Update a guest\'s RSVP status. Use when user asks to confirm/decline/reset RSVP for a guest.',
    input_schema: {
      type: 'object' as const,
      properties: {
        guest_id: { type: 'string', description: 'The guest ID' },
        status: { type: 'string', enum: ['confirmed', 'declined', 'pending'], description: 'New RSVP status' },
        guest_name: { type: 'string', description: 'Guest name (for confirmation message)' },
      },
      required: ['guest_id', 'status', 'guest_name'],
    },
  },
  {
    name: 'mark_checklist_done',
    description: 'Mark one or more checklist items as done. Use when user asks to complete/check off tasks.',
    input_schema: {
      type: 'object' as const,
      properties: {
        item_ids: { type: 'array', items: { type: 'string' }, description: 'Array of checklist item IDs to mark done' },
        item_titles: { type: 'array', items: { type: 'string' }, description: 'Titles for confirmation message' },
      },
      required: ['item_ids', 'item_titles'],
    },
  },
  {
    name: 'assign_checklist_items',
    description: 'Assign checklist items to a person. Use when user asks to assign tasks.',
    input_schema: {
      type: 'object' as const,
      properties: {
        item_ids: { type: 'array', items: { type: 'string' }, description: 'Checklist item IDs to assign' },
        assignee: { type: 'string', description: 'Name of the person to assign to' },
      },
      required: ['item_ids', 'assignee'],
    },
  },
  {
    name: 'add_checklist_item',
    description: 'Add a new checklist item. Use when user asks to add a task or reminder.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Task title' },
        category: { type: 'string', description: 'Category (e.g. Venue, Catering, Photography)' },
        due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format, or null' },
        assignee: { type: 'string', description: 'Person to assign to, or null' },
      },
      required: ['title', 'category'],
    },
  },
  {
    name: 'update_vendor_status',
    description: 'Update a vendor\'s status. Use when user asks to mark a vendor as booked/confirmed/paid/cancelled.',
    input_schema: {
      type: 'object' as const,
      properties: {
        vendor_id: { type: 'string', description: 'Vendor ID' },
        status: { type: 'string', enum: ['enquired', 'booked', 'confirmed', 'paid', 'cancelled'], description: 'New status' },
        vendor_name: { type: 'string', description: 'Vendor name for confirmation message' },
      },
      required: ['vendor_id', 'status', 'vendor_name'],
    },
  },
  {
    name: 'add_vendor_payment',
    description: 'Add a payment record for a vendor. Use when user asks to log/schedule a payment.',
    input_schema: {
      type: 'object' as const,
      properties: {
        vendor_id: { type: 'string', description: 'Vendor ID' },
        amount: { type: 'number', description: 'Payment amount in rupees' },
        due_date: { type: 'string', description: 'Due date YYYY-MM-DD' },
        vendor_name: { type: 'string', description: 'Vendor name for confirmation message' },
      },
      required: ['vendor_id', 'amount', 'due_date', 'vendor_name'],
    },
  },
  {
    name: 'find_guests',
    description: 'Search guests by name when you need a guest_id for another action. Returns matching guests with their IDs.',
    input_schema: {
      type: 'object' as const,
      properties: {
        name_query: { type: 'string', description: 'Partial name to search for' },
      },
      required: ['name_query'],
    },
  },
  {
    name: 'find_checklist_items',
    description: 'Search checklist items by title or category when you need item IDs for other actions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Partial title or category to search for' },
        status_filter: { type: 'string', description: 'Optional: filter by status (pending, done)' },
      },
      required: ['query'],
    },
  },
]

const ORG_EVENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'mark_checklist_done',
    description: 'Mark checklist items as done',
    input_schema: {
      type: 'object' as const,
      properties: {
        item_ids: { type: 'array', items: { type: 'string' } },
        item_titles: { type: 'array', items: { type: 'string' } },
      },
      required: ['item_ids', 'item_titles'],
    },
  },
  {
    name: 'add_checklist_item',
    description: 'Add a new checklist item',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        category: { type: 'string' },
        due_date: { type: 'string' },
        assignee: { type: 'string' },
      },
      required: ['title', 'category'],
    },
  },
  {
    name: 'update_vendor_status',
    description: 'Update a vendor status',
    input_schema: {
      type: 'object' as const,
      properties: {
        vendor_id: { type: 'string' },
        status: { type: 'string', enum: ['enquired', 'booked', 'confirmed', 'paid', 'cancelled'] },
        vendor_name: { type: 'string' },
      },
      required: ['vendor_id', 'status', 'vendor_name'],
    },
  },
]

// ─── Tool execution ───────────────────────────────────────────────────────────

async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  entityId: string,
  entityType: 'wedding' | 'org_event'
): Promise<string> {
  const sc = createServiceClient()
  const weddingPath = `/weddings/${entityId}`

  try {
    switch (toolName) {
      case 'update_guest_rsvp': {
        const { guest_id, status, guest_name } = input as { guest_id: string; status: string; guest_name: string }
        const { error } = await sc.from('guests').update({ rsvp_status: status }).eq('id', guest_id)
        if (error) return `Error: ${error.message}`
        revalidatePath(weddingPath)
        return `${guest_name} ka RSVP ${status} kar diya.`
      }

      case 'mark_checklist_done': {
        const { item_ids, item_titles } = input as { item_ids: string[]; item_titles: string[] }
        const table = entityType === 'org_event' ? 'org_checklist_items' : 'checklist_items'
        const { error } = await sc.from(table).update({ status: 'done' }).in('id', item_ids)
        if (error) return `Error: ${error.message}`
        revalidatePath(weddingPath)
        return `${item_ids.length} task${item_ids.length > 1 ? 's' : ''} done mark kiya: ${item_titles.join(', ')}`
      }

      case 'assign_checklist_items': {
        const { item_ids, assignee } = input as { item_ids: string[]; assignee: string }
        const { error } = await sc.from('checklist_items').update({ assignee }).in('id', item_ids)
        if (error) return `Error: ${error.message}`
        revalidatePath(weddingPath)
        return `${item_ids.length} task${item_ids.length > 1 ? 's' : ''} ${assignee} ko assign kiye.`
      }

      case 'add_checklist_item': {
        const { title, category, due_date, assignee } = input as { title: string; category: string; due_date?: string; assignee?: string }
        const table = entityType === 'org_event' ? 'org_checklist_items' : 'checklist_items'
        const idField = entityType === 'org_event' ? 'org_event_id' : 'wedding_id'
        const { error } = await sc.from(table).insert({
          [idField]: entityId,
          title,
          category,
          status: 'pending',
          ...(due_date ? { due_date } : {}),
          ...(assignee ? { assignee } : {}),
        })
        if (error) return `Error: ${error.message}`
        revalidatePath(weddingPath)
        return `"${title}" checklist mein add kar diya.${assignee ? ` Assigned to ${assignee}.` : ''}${due_date ? ` Due: ${fmtDate(due_date)}.` : ''}`
      }

      case 'update_vendor_status': {
        const { vendor_id, status, vendor_name } = input as { vendor_id: string; status: string; vendor_name: string }
        const table = entityType === 'org_event' ? 'org_vendors' : 'vendors'
        const { error } = await sc.from(table).update({ status }).eq('id', vendor_id)
        if (error) return `Error: ${error.message}`
        revalidatePath(weddingPath)
        return `${vendor_name} ka status "${status}" kar diya.`
      }

      case 'add_vendor_payment': {
        const { vendor_id, amount, due_date, vendor_name } = input as { vendor_id: string; amount: number; due_date: string; vendor_name: string }
        const table = entityType === 'org_event' ? 'org_vendor_payments' : 'vendor_payments'
        const { error } = await sc.from(table).insert({ vendor_id, amount, due_date })
        if (error) return `Error: ${error.message}`
        revalidatePath(weddingPath)
        return `${vendor_name} ka payment ₹${amount.toLocaleString('en-IN')} scheduled for ${fmtDate(due_date)}.`
      }

      case 'find_guests': {
        const { name_query } = input as { name_query: string }
        const { data } = await sc.from('guests').select('id, name, rsvp_status').eq('wedding_id', entityId).ilike('name', `%${name_query}%`).limit(5)
        if (!data || data.length === 0) return `No guests found matching "${name_query}"`
        return data.map((g: { id: string; name: string; rsvp_status: string | null }) => `${g.name} (id: ${g.id}, rsvp: ${g.rsvp_status || 'pending'})`).join('\n')
      }

      case 'find_checklist_items': {
        const { query, status_filter } = input as { query: string; status_filter?: string }
        let q = sc.from('checklist_items').select('id, title, category, status, assignee').eq('wedding_id', entityId).ilike('title', `%${query}%`)
        if (status_filter === 'pending') q = q.neq('status', 'done')
        if (status_filter === 'done') q = q.eq('status', 'done')
        const { data } = await q.limit(10)
        if (!data || data.length === 0) return `No checklist items found matching "${query}"`
        return data.map((i: { id: string; title: string; category: string | null; status: string | null; assignee: string | null }) =>
          `${i.title} [${i.category}] status:${i.status || 'pending'}${i.assignee ? ' assigned:' + i.assignee : ''} (id: ${i.id})`
        ).join('\n')
      }

      default:
        return `Unknown tool: ${toolName}`
    }
  } catch (err) {
    return `Error executing ${toolName}: ${err instanceof Error ? err.message : 'Unknown error'}`
  }
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
    sc.from('checklist_items').select('id, title, category, status, due_date, assignee').eq('wedding_id', weddingId),
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
  const daysLeft = wedding?.wedding_date
    ? Math.ceil((new Date(wedding.wedding_date as string + 'T00:00:00').getTime() - now.getTime()) / 86400000)
    : null

  return `You are an AI assistant inside UtsavOS, a professional event management platform.
Today's date: ${today}
Reply in the same language the user writes in. Hinglish (Hindi+English mix) is perfectly fine.
Be brief and direct — 2-4 lines max unless a list is truly essential.
No greetings, no filler, no explaining what you're about to do. Just the answer.
Only mention data relevant to the question. Flag urgent items with ⚠️.
You have tools to take actions (update RSVP, mark tasks done, assign tasks, update vendor status, add payments, search guests/checklist). Use them when the user asks you to do something. After using a tool, confirm what was done in 1 line.

━━━ WEDDING ━━━
${wedding?.bride_name} weds ${wedding?.groom_name}
Date: ${wedding?.wedding_date ? fmtDate(wedding.wedding_date as string) : 'TBD'}${daysLeft !== null ? ` (${daysLeft > 0 ? daysLeft + ' days to go' : daysLeft === 0 ? 'TODAY' : Math.abs(daysLeft) + ' days ago'})` : ''}${wedding?.date_from ? ` (${fmtDate(wedding.date_from as string)} – ${fmtDate((wedding.date_to || wedding.date_from) as string)})` : ''}
Venue: ${wedding?.primary_venue || 'TBD'}, ${wedding?.primary_city || ''}
Budget: ${fmt(budget)}

━━━ GUESTS (${g.length} total) ━━━
Confirmed: ${confirmed} | Pending RSVP: ${pending} | Declined: ${declined}
Bride's side: ${g.filter(x => x.side === 'bride').length} | Groom's side: ${g.filter(x => x.side === 'groom').length}
VIPs (${vips.length}): ${vips.slice(0, 10).map(x => `${x.name} [id:${x.id}]`).join(', ')}${vips.length > 10 ? ` +${vips.length - 10} more` : ''}
Unseated confirmed guests: ${unseated.length}${unseated.length > 0 ? ` — ${unseated.slice(0, 5).map(x => x.name).join(', ')}${unseated.length > 5 ? '…' : ''}` : ''}

━━━ EVENTS (${ev.length}) ━━━
${ev.map(e => `• ${e.name} — ${e.date ? fmtDate(e.date) : 'TBD'}${e.start_time ? ' at ' + e.start_time : ''}${e.venue ? ' @ ' + e.venue : ''}`).join('\n') || 'No events added yet'}

━━━ CHECKLIST (${done}/${cl.length} done) ━━━
${overdueTasks.length > 0 ? `⚠️ OVERDUE (${overdueTasks.length}): ${overdueTasks.map(x => `${x.title} [id:${x.id}]${x.due_date ? ' (due ' + fmtDate(x.due_date) + ')' : ''}${x.assignee ? ' [' + x.assignee + ']' : ''}`).join('; ')}` : 'No overdue items ✓'}
Pending tasks (${pendingTasks.length}): ${pendingTasks.slice(0, 8).map(x => `${x.title} [${x.category}] [id:${x.id}]${x.assignee ? ' — ' + x.assignee : ''}`).join(' | ')}${pendingTasks.length > 8 ? ` …+${pendingTasks.length - 8} more` : ''}

━━━ VENDORS (${v.length}) ━━━
Contracted: ${fmt(totalSpend)} | Paid: ${fmt(totalPaid)} | Remaining: ${fmt(totalSpend - totalPaid)}
${overduePayments.length > 0 ? `⚠️ OVERDUE PAYMENTS (${overduePayments.length}): ${overduePayments.map(p => {
    const vendor = v.find(x => x.id === p.vendor_id)
    return `${vendor?.name || 'Unknown'} ${fmt(p.amount)} due ${fmtDate(p.due_date)}`
  }).join('; ')}` : 'All payments on track ✓'}
${v.map(x => `• ${x.name} [${x.category}] ${x.status} — Paid: ${fmt(x.paid_amount || 0)}/${fmt(x.total_amount || 0)} [id:${x.id}]`).join('\n')}

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
    sc.from('org_checklist_items').select('id, title, category, status, due_date').eq('org_event_id', eventId),
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
  ;(budgetItems ?? []) as BudgetItemRow[]

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

  const daysUntil = event?.start_date
    ? Math.ceil((new Date(event.start_date as string + 'T00:00:00').getTime() - now.getTime()) / 86400000)
    : null

  return `You are an AI assistant inside UtsavOS, a professional event management platform.
Today's date: ${today}
Reply in the same language the user writes in. Hinglish (Hindi+English mix) is perfectly fine.
Be brief and direct — 2-4 lines max unless a list is truly essential.
No greetings, no filler, no explaining what you're about to do. Just the answer.
Only mention data relevant to the question. Flag urgent items with ⚠️.
You have tools to take actions (mark tasks done, add tasks, update vendor status). Use them when the user asks you to do something.

━━━ EVENT ━━━
${event?.name || 'Unnamed Event'} [${typeLabel}]
Dates: ${event?.start_date ? fmtDate(event.start_date as string) : 'TBD'}${event?.end_date && event.end_date !== event?.start_date ? ` – ${fmtDate(event.end_date as string)}` : ''}${daysUntil !== null ? ` (${daysUntil > 0 ? daysUntil + ' days to go' : daysUntil === 0 ? 'TODAY' : Math.abs(daysUntil) + ' days ago'})` : ''}
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
${overdueTasks.length > 0 ? `⚠️ OVERDUE (${overdueTasks.length}): ${overdueTasks.map(x => `${x.title} [id:${x.id}]${x.due_date ? ' (due ' + fmtDate(x.due_date) + ')' : ''}`).join('; ')}` : 'No overdue items ✓'}
Pending (${pendingTasks.length}): ${pendingTasks.slice(0, 8).map(x => `${x.title} [${x.category}] [id:${x.id}]`).join(' | ')}${pendingTasks.length > 8 ? ` …+${pendingTasks.length - 8} more` : ''}

━━━ VENDORS (${v.length}) ━━━
Contracted: ${fmt(totalContracted)} | Paid: ${fmt(totalPaid)} | Remaining: ${fmt(totalContracted - totalPaid)}
${overduePayments.length > 0 ? `⚠️ OVERDUE PAYMENTS (${overduePayments.length}): ${overduePayments.map(p => {
    const vendor = v.find(x => x.id === p.vendor_id)
    return `${vendor?.name || 'Unknown'} ${fmt(p.amount)} due ${fmtDate(p.due_date)}`
  }).join('; ')}` : 'All payments on track ✓'}
${v.map(x => `• ${x.name} [${x.category}] ${x.status} [id:${x.id}]`).join('\n')}

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

// ─── Celebration (B2C) tools ──────────────────────────────────────────────────

const CELEBRATION_TOOLS: Anthropic.Tool[] = [
  {
    name: 'find_guests',
    description: 'Search guests by name to get their ID for other actions.',
    input_schema: {
      type: 'object' as const,
      properties: { name_query: { type: 'string' } },
      required: ['name_query'],
    },
  },
  {
    name: 'update_guest_rsvp',
    description: 'Update a guest RSVP status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        guest_id: { type: 'string' },
        status: { type: 'string', enum: ['confirmed', 'declined', 'pending'] },
        guest_name: { type: 'string' },
      },
      required: ['guest_id', 'status', 'guest_name'],
    },
  },
  {
    name: 'find_tasks',
    description: 'Search tasks by title or category.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string' },
        status_filter: { type: 'string', description: 'pending or done' },
      },
      required: ['query'],
    },
  },
  {
    name: 'mark_task_done',
    description: 'Mark one or more tasks as done.',
    input_schema: {
      type: 'object' as const,
      properties: {
        task_ids: { type: 'array', items: { type: 'string' } },
        task_titles: { type: 'array', items: { type: 'string' } },
      },
      required: ['task_ids', 'task_titles'],
    },
  },
  {
    name: 'add_task',
    description: 'Add a new task to the celebration checklist.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: { type: 'string' },
        category: { type: 'string' },
        due_date: { type: 'string', description: 'YYYY-MM-DD or null' },
      },
      required: ['title', 'category'],
    },
  },
  {
    name: 'update_vendor_status',
    description: 'Update a vendor status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        vendor_id: { type: 'string' },
        status: { type: 'string', enum: ['enquired', 'confirmed', 'booked', 'paid', 'cancelled'] },
        vendor_name: { type: 'string' },
      },
      required: ['vendor_id', 'status', 'vendor_name'],
    },
  },
]

async function executeCelebrationTool(toolName: string, input: Record<string, unknown>, celebrationId: string): Promise<string> {
  const sc = createServiceClient()
  try {
    switch (toolName) {
      case 'find_guests': {
        const { name_query } = input as { name_query: string }
        const { data } = await sc.from('celebration_guests').select('id, name, rsvp_status, side').eq('celebration_id', celebrationId).ilike('name', `%${name_query}%`).limit(5)
        if (!data?.length) return `No guests found matching "${name_query}"`
        return data.map((g: { id: string; name: string; rsvp_status: string | null; side: string | null }) => `${g.name} (id: ${g.id}, rsvp: ${g.rsvp_status ?? 'pending'}, side: ${g.side ?? '?'})`).join('\n')
      }
      case 'update_guest_rsvp': {
        const { guest_id, status, guest_name } = input as { guest_id: string; status: string; guest_name: string }
        const { error } = await sc.from('celebration_guests').update({ rsvp_status: status }).eq('id', guest_id)
        if (error) return `Error: ${error.message}`
        return `${guest_name} ka RSVP "${status}" kar diya.`
      }
      case 'find_tasks': {
        const { query, status_filter } = input as { query: string; status_filter?: string }
        let q = sc.from('celebration_tasks').select('id, title, category, status, due_date').eq('celebration_id', celebrationId).ilike('title', `%${query}%`)
        if (status_filter === 'pending') q = q.neq('status', 'done')
        if (status_filter === 'done') q = q.eq('status', 'done')
        const { data } = await q.limit(10)
        if (!data?.length) return `No tasks found matching "${query}"`
        return data.map((t: { id: string; title: string; category: string | null; status: string | null; due_date: string | null }) =>
          `${t.title} [${t.category}] status:${t.status ?? 'pending'}${t.due_date ? ' due:' + t.due_date : ''} (id: ${t.id})`
        ).join('\n')
      }
      case 'mark_task_done': {
        const { task_ids, task_titles } = input as { task_ids: string[]; task_titles: string[] }
        const { error } = await sc.from('celebration_tasks').update({ status: 'done' }).in('id', task_ids)
        if (error) return `Error: ${error.message}`
        return `${task_ids.length} task${task_ids.length > 1 ? 's' : ''} done mark kiye: ${task_titles.join(', ')}`
      }
      case 'add_task': {
        const { title, category, due_date } = input as { title: string; category: string; due_date?: string }
        const { error } = await sc.from('celebration_tasks').insert({ celebration_id: celebrationId, title, category, status: 'pending', ...(due_date ? { due_date } : {}) })
        if (error) return `Error: ${error.message}`
        return `"${title}" task add kar diya.${due_date ? ` Due: ${fmtDate(due_date)}.` : ''}`
      }
      case 'update_vendor_status': {
        const { vendor_id, status, vendor_name } = input as { vendor_id: string; status: string; vendor_name: string }
        const { error } = await sc.from('celebration_vendors').update({ status }).eq('id', vendor_id)
        if (error) return `Error: ${error.message}`
        return `${vendor_name} ka status "${status}" kar diya.`
      }
      default: return `Unknown tool: ${toolName}`
    }
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : 'Unknown'}`
  }
}

async function buildCelebrationContext(celebrationId: string) {
  const sc = createServiceClient()
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date()

  const [
    { data: cel },
    { data: functions },
    { data: guests },
    { data: tasks },
    { data: vendors },
    { data: budget },
  ] = await Promise.all([
    sc.from('celebrations').select('bride_name, groom_name, event_date, end_date, city, venue, guest_count, wedding_style, plan').eq('id', celebrationId).single(),
    sc.from('celebration_functions').select('id, name, date, start_time, expected_count').eq('celebration_id', celebrationId).order('date'),
    sc.from('celebration_guests').select('id, name, rsvp_status, side, is_vip, plus_count').eq('celebration_id', celebrationId),
    sc.from('celebration_tasks').select('id, title, category, status, due_date').eq('celebration_id', celebrationId),
    sc.from('celebration_vendors').select('id, name, category, status, total_amount, advance_paid, payment_due').eq('celebration_id', celebrationId),
    sc.from('celebration_budget').select('category, description, estimated, actual, status').eq('celebration_id', celebrationId),
  ])

  const fns = (functions ?? []) as { id: string; name: string; date: string; start_time: string | null; expected_count: number | null }[]
  const g = (guests ?? []) as { id: string; name: string; rsvp_status: string | null; side: string | null; is_vip: boolean | null; plus_count: number | null }[]
  const t = (tasks ?? []) as { id: string; title: string; category: string | null; status: string | null; due_date: string | null }[]
  const v = (vendors ?? []) as { id: string; name: string; category: string | null; status: string | null; total_amount: number | null; advance_paid: number | null; payment_due: string | null }[]
  const b = (budget ?? []) as { category: string; description: string; estimated: number | null; actual: number | null; status: string }[]

  const confirmed = g.filter(x => x.rsvp_status === 'confirmed').length
  const pending = g.filter(x => !x.rsvp_status || x.rsvp_status === 'pending').length
  const declined = g.filter(x => x.rsvp_status === 'declined').length
  const vips = g.filter(x => x.is_vip)
  const doneTasks = t.filter(x => x.status === 'done').length
  const pendingTasks = t.filter(x => x.status !== 'done')
  const overdueTasks = pendingTasks.filter(x => x.due_date && x.due_date < today)
  const totalEstimated = b.reduce((s, x) => s + (x.estimated ?? 0), 0)
  const totalActual = b.reduce((s, x) => s + (x.actual ?? 0), 0)
  const totalPaid = v.reduce((s, x) => s + (x.advance_paid ?? 0), 0)
  const overdueVendors = v.filter(x => x.payment_due && x.payment_due < today && x.status !== 'paid')
  const daysLeft = cel?.event_date
    ? Math.ceil((new Date(cel.event_date as string + 'T00:00:00').getTime() - now.getTime()) / 86400000)
    : null

  return `You are a wedding AI assistant inside Utsav, helping the couple plan their wedding.
Today: ${today}
Reply in the same language the user writes in — Hinglish is perfectly fine and preferred.
Be warm, brief, direct. 2-4 lines max unless a detailed list is essential.
No greetings or filler. Flag urgent items with ⚠️.
Use tools when user asks to do something (mark task done, update vendor, change RSVP, add task). After a tool action, confirm in 1 line.

━━━ WEDDING ━━━
${cel?.bride_name ?? '?'} weds ${cel?.groom_name ?? '?'}
Date: ${cel?.event_date ? fmtDate(cel.event_date as string) : 'TBD'}${daysLeft !== null ? ` (${daysLeft > 0 ? daysLeft + ' din baaki' : daysLeft === 0 ? 'AAJ HAI!' : Math.abs(daysLeft) + ' din pehle tha'})` : ''}
Venue: ${cel?.venue ?? 'TBD'}, ${cel?.city ?? ''}
Style: ${cel?.wedding_style ?? 'traditional'} | Total guests: ${cel?.guest_count ?? g.length}

━━━ FUNCTIONS (${fns.length}) ━━━
${fns.map(f => `• ${f.name} — ${f.date ? fmtDate(f.date) : 'TBD'}${f.start_time ? ' at ' + f.start_time.slice(0, 5) : ''}${f.expected_count ? ' (' + f.expected_count + ' pax)' : ''}`).join('\n') || 'No functions added yet'}

━━━ GUESTS (${g.length} total) ━━━
Confirmed: ${confirmed} | Pending: ${pending} | Declined: ${declined}
Bride's side: ${g.filter(x => x.side === 'bride').length} | Groom's side: ${g.filter(x => x.side === 'groom').length}
${vips.length > 0 ? `VIPs (${vips.length}): ${vips.slice(0, 8).map(x => `${x.name} [id:${x.id}]`).join(', ')}` : ''}

━━━ TASKS (${doneTasks}/${t.length} done) ━━━
${overdueTasks.length > 0 ? `⚠️ OVERDUE (${overdueTasks.length}): ${overdueTasks.map(x => `${x.title} [id:${x.id}]`).join(' | ')}` : 'No overdue tasks ✓'}
Pending (${pendingTasks.length}): ${pendingTasks.slice(0, 10).map(x => `${x.title} [${x.category}] [id:${x.id}]${x.due_date ? ' due:' + x.due_date : ''}`).join(' | ')}${pendingTasks.length > 10 ? ` +${pendingTasks.length - 10} more` : ''}

━━━ VENDORS (${v.length}) ━━━
${overdueVendors.length > 0 ? `⚠️ PAYMENT DUE: ${overdueVendors.map(x => `${x.name} (due ${x.payment_due})`).join(', ')}` : ''}
${v.map(x => `• ${x.name} [${x.category}] ${x.status} — advance: ${fmt(x.advance_paid ?? 0)}/${fmt(x.total_amount ?? 0)} [id:${x.id}]`).join('\n') || 'No vendors added yet'}

━━━ BUDGET ━━━
Estimated: ${fmt(totalEstimated)} | Actual/booked: ${fmt(totalActual)} | Advance paid: ${fmt(totalPaid)}
${b.slice(0, 12).map(x => `• ${x.category} — ${x.description}: est ${fmt(x.estimated ?? 0)}${x.actual ? ', actual ' + fmt(x.actual) : ''} [${x.status}]`).join('\n') || 'No budget items yet'}`
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { entityId, entityType, message, history, context } = await req.json() as {
    entityId?: string
    entityType?: 'wedding' | 'org_event' | 'celebration'
    message: string
    history?: { role: 'user' | 'assistant'; content: string }[]
    context?: string
  }

  if (!message) return new Response('Bad request', { status: 400 })

  // Fallback: no entityId (e.g. DocGen) — simple context-only call
  if (!entityId || !entityType) {
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: context ?? 'You are a helpful wedding assistant.',
      messages: [{ role: 'user', content: message }],
    })
    const text = resp.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('')
    return Response.json({ reply: text })
  }

  let systemPrompt: string
  let tools: Anthropic.Tool[]

  if (entityType === 'celebration') {
    systemPrompt = await buildCelebrationContext(entityId)
    tools = CELEBRATION_TOOLS
  } else if (entityType === 'org_event') {
    systemPrompt = await buildOrgEventContext(entityId)
    tools = ORG_EVENT_TOOLS
  } else {
    systemPrompt = await buildWeddingContext(entityId)
    tools = WEDDING_TOOLS
  }
  const trimmedHistory = (history ?? []).slice(-10)
  const messages: Anthropic.MessageParam[] = [
    ...trimmedHistory.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ]

  // ── First call: non-streaming to detect tool use ──────────────────────────
  const firstResponse = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    tools,
    messages,
  })

  const hasToolUse = firstResponse.content.some(b => b.type === 'tool_use')

  if (!hasToolUse) {
    // ── Pure text: stream the response ──────────────────────────────────────
    const textContent = firstResponse.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // Stream word by word for the "typing" feel
        const words = textContent.split(/(?<=\s)/)
        let i = 0
        function push() {
          if (i < words.length) {
            controller.enqueue(encoder.encode(words[i++]))
            setTimeout(push, 8)
          } else {
            controller.close()
          }
        }
        push()
      },
    })
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
    })
  }

  // ── Tool use: execute tools, then get final response ────────────────────
  const toolUseBlocks = firstResponse.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
  const toolResults: Anthropic.ToolResultBlockParam[] = []

  for (const toolUse of toolUseBlocks) {
    const result = entityType === 'celebration'
      ? await executeCelebrationTool(toolUse.name, toolUse.input as Record<string, unknown>, entityId)
      : await executeTool(toolUse.name, toolUse.input as Record<string, unknown>, entityId, entityType as 'wedding' | 'org_event')
    toolResults.push({
      type: 'tool_result',
      tool_use_id: toolUse.id,
      content: result,
    })
  }

  // Second call: get final confirmation text
  const finalResponse = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: systemPrompt,
    tools,
    messages: [
      ...messages,
      { role: 'assistant', content: firstResponse.content },
      { role: 'user', content: toolResults },
    ],
  })

  const finalText = finalResponse.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('')

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      const words = finalText.split(/(?<=\s)/)
      let i = 0
      function push() {
        if (i < words.length) {
          controller.enqueue(encoder.encode(words[i++]))
          setTimeout(push, 8)
        } else {
          controller.close()
        }
      }
      push()
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' },
  })
}
