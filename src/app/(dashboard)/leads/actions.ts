'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { sendLeadAcceptedEmail, sendLeadDeclinedEmail } from '@/lib/email'

async function getCompanyMember() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const { data: member } = await supabase.from('company_members')
    .select('company_id, role').eq('user_id', user.id).single()
  if (!member) return { error: 'No company' as const }
  return { sc: createServiceClient(), userId: user.id, companyId: member.company_id, role: member.role }
}

function generateCode(name: string) {
  const prefix = name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, 'X').padEnd(4, 'X')
  const rand = Math.random().toString(36).slice(2, 4).toUpperCase()
  return `${prefix}${rand}`
}

export async function acceptLead(connectionId: string) {
  const r = await getCompanyMember()
  if ('error' in r) return { error: r.error }

  const sc = r.sc

  // Fetch connection + celebration
  const { data: conn } = await sc.from('planner_connections')
    .select('id, celebration_id, user_id, company_id, status')
    .eq('id', connectionId).eq('company_id', r.companyId).single()
  if (!conn) return { error: 'Not found' }
  if (conn.status !== 'pending') return { error: 'Already processed' }

  const { data: celebration } = await sc.from('celebrations')
    .select('*').eq('id', conn.celebration_id).single()
  if (!celebration) return { error: 'Celebration not found' }

  // Get client email
  const { data: clientUser } = await sc.from('users')
    .select('email').eq('id', conn.user_id).single()
  if (!clientUser) return { error: 'Client user not found' }

  // Create wedding from celebration data
  const wedding_code = generateCode(celebration.name)
  const { data: wedding, error: wErr } = await sc.from('weddings').insert({
    company_id: r.companyId,
    bride_name: celebration.name,
    groom_name: 'TBD',
    wedding_code,
    status: 'setup',
    budget_total: celebration.budget ?? 0,
    primary_venue: celebration.venue || null,
    primary_city: celebration.city || null,
    wedding_date: celebration.event_date || null,
    notes: `Imported from B2C celebration. Type: ${celebration.type}. Guests: ~${celebration.guest_count}`,
  }).select('id').single()
  if (wErr) return { error: wErr.message }

  // Import celebration tasks into wedding checklist
  const { data: celebTasks } = await sc.from('celebration_tasks')
    .select('title, category, status').eq('celebration_id', conn.celebration_id)
  if (celebTasks && celebTasks.length > 0) {
    const checklistRows = celebTasks.map((t: { title: string; category: string; status: string }, i: number) => ({
      wedding_id: wedding.id,
      title: t.title,
      category: t.category || 'General',
      status: t.status === 'done' ? 'done' : 'pending',
      order: i,
    }))
    await sc.from('checklist_items').insert(checklistRows)
  }

  // Create client portal invite
  const { error: invErr } = await sc.from('invites').insert({
    company_id: r.companyId,
    wedding_id: wedding.id,
    email: clientUser.email,
    role: 'client',
    side: 'bride',
    invited_by: r.userId,
  })
  if (invErr) return { error: invErr.message }

  // Update connection
  const { error: updErr } = await sc.from('planner_connections').update({
    status: 'accepted',
    wedding_id: wedding.id,
    updated_at: new Date().toISOString(),
  }).eq('id', connectionId)
  if (updErr) return { error: updErr.message }

  // Email client with portal invite link
  try {
    const { data: inv } = await sc.from('invites')
      .select('token').eq('wedding_id', wedding.id).eq('email', clientUser.email).single()
    const { data: company } = await sc.from('companies').select('name').eq('id', r.companyId).single()
    if (inv?.token) {
      await sendLeadAcceptedEmail({
        toEmail: clientUser.email,
        companyName: company?.name ?? 'Your planner',
        celebrationName: celebration.name,
        inviteToken: inv.token,
      })
    }
  } catch { /* non-blocking */ }

  revalidatePath('/leads')
  return { ok: true, weddingId: wedding.id }
}

export async function declineLead(connectionId: string) {
  const r = await getCompanyMember()
  if ('error' in r) return { error: r.error }

  const sc = r.sc

  // Fetch connection + celebration for email
  const { data: conn } = await sc.from('planner_connections')
    .select('user_id, celebration_id, company_id')
    .eq('id', connectionId).eq('company_id', r.companyId).single()

  const { error } = await sc.from('planner_connections').update({
    status: 'declined',
    updated_at: new Date().toISOString(),
  }).eq('id', connectionId).eq('company_id', r.companyId)
  if (error) return { error: error.message }

  // Email client
  try {
    if (conn) {
      const [{ data: clientUser }, { data: celebration }, { data: company }] = await Promise.all([
        sc.from('users').select('email').eq('id', conn.user_id).single(),
        sc.from('celebrations').select('name').eq('id', conn.celebration_id).single(),
        sc.from('companies').select('name').eq('id', conn.company_id).single(),
      ])
      if (clientUser?.email) {
        await sendLeadDeclinedEmail({
          toEmail: clientUser.email,
          companyName: company?.name ?? 'The planner',
          celebrationName: celebration?.name ?? 'your celebration',
        })
      }
    }
  } catch { /* non-blocking */ }

  revalidatePath('/leads')
  return { ok: true }
}
