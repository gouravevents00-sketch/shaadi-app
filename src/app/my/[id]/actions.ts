'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function updateTaskStatus(taskId: string, status: 'pending' | 'in_progress' | 'done') {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_tasks').update({ status }).eq('id', taskId)
  return error ? { error: error.message } : { ok: true }
}

export async function addTask(celebrationId: string, title: string, category: string) {
  const sc = createServiceClient()
  const { data, error } = await sc.from('celebration_tasks')
    .insert({ celebration_id: celebrationId, title: title.trim(), category: category.trim() || 'General' })
    .select('id')
    .single()
  return error ? { error: error.message } : { id: data.id }
}

export async function deleteTask(taskId: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_tasks').delete().eq('id', taskId)
  return error ? { error: error.message } : { ok: true }
}

export async function updateGuestCount(celebrationId: string, count: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const sc = createServiceClient()
  const { error } = await sc.from('celebrations')
    .update({ guest_count: Math.max(0, count) })
    .eq('id', celebrationId).eq('user_id', user.id)
  return error ? { error: error.message } : { ok: true }
}

export async function upgradeToPro(celebrationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const sc = createServiceClient()

  // Verify celebration belongs to user
  // NOTE: column is event_date (not date), and company_id/wedding_id added by sprint1 migration
  const { data: celebration, error: celErr } = await sc.from('celebrations')
    .select('id, user_id, name, type, event_date, guest_count, company_id, wedding_id, plan, venue, city')
    .eq('id', celebrationId).eq('user_id', user.id).single()
  if (celErr || !celebration) return { error: celErr?.message ?? 'No access' }

  // Already upgraded — just return the existing weddingId
  if (celebration.plan === 'pro' && celebration.wedding_id) {
    return { ok: true, weddingId: celebration.wedding_id as string }
  }

  // 1. Get or create personal company for this user
  // Two-step: get user's memberships, then find one whose company is personal
  let companyId: string
  const { data: memberships } = await sc.from('company_members')
    .select('company_id').eq('user_id', user.id)
  const memberCompanyIds = (memberships ?? []).map((m: { company_id: string }) => m.company_id)

  let existingPersonalId: string | null = null
  if (memberCompanyIds.length > 0) {
    const { data: personalCo } = await sc.from('companies')
      .select('id').eq('is_personal', true).in('id', memberCompanyIds).maybeSingle()
    existingPersonalId = personalCo?.id ?? null
  }

  if (existingPersonalId) {
    companyId = existingPersonalId
  } else {
    const personalSlug = `personal-${user.id.replace(/-/g, '').slice(0, 10)}`
    const { data: newCompany, error: companyErr } = await sc.from('companies').insert({
      name: 'My Events',
      slug: personalSlug,
      is_personal: true,
    }).select('id').single()
    if (companyErr || !newCompany) return { error: companyErr?.message ?? 'Could not create personal company' }
    companyId = newCompany.id

    const { error: memberErr } = await sc.from('company_members').insert({
      company_id: companyId,
      user_id: user.id,
      role: 'owner',
    })
    if (memberErr) return { error: memberErr.message }
  }

  // 2. Create wedding record from celebration data
  const eventCode = 'P' + Date.now().toString(36).toUpperCase().slice(-5) + Math.random().toString(36).slice(2, 4).toUpperCase()
  const cel = celebration as typeof celebration & { venue?: string | null; city?: string | null }
  const { data: wedding, error: weddingErr } = await sc.from('weddings').insert({
    company_id: companyId,
    bride_name: celebration.name ?? 'My Event',
    groom_name: '',
    wedding_code: eventCode,
    celebration_type: celebration.type ?? 'wedding',
    owner_type: 'individual',
    owner_user_id: user.id,
    wedding_date: (celebration.event_date as string | null) ?? null,
    primary_venue: cel.venue ?? null,
    primary_city: cel.city ?? null,
  }).select('id').single()
  if (weddingErr || !wedding) return { error: weddingErr?.message ?? 'Could not create event record' }

  // 3. Update celebration: plan, company_id, wedding_id
  const { error: updateErr } = await sc.from('celebrations')
    .update({ plan: 'pro', company_id: companyId, wedding_id: wedding.id })
    .eq('id', celebrationId)
  if (updateErr) return { error: updateErr.message }

  return { ok: true, weddingId: wedding.id }
}

// ── Pro: Guests ────────────────────────────────────────────────
export async function addCelebrationGuest(celebrationId: string, data: {
  name: string; phone?: string; dietary?: string; plus_count?: number; side?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const sc = createServiceClient()
  const { data: cel } = await sc.from('celebrations').select('user_id').eq('id', celebrationId).single()
  if (!cel || cel.user_id !== user.id) return { error: 'No access' }
  const { data: guest, error } = await sc.from('celebration_guests').insert({
    celebration_id: celebrationId,
    name: data.name.trim(),
    phone: data.phone?.trim() || null,
    dietary: data.dietary?.trim() || null,
    plus_count: data.plus_count ?? 0,
    side: data.side || 'both',
  }).select('id').single()
  return error ? { error: error.message } : { id: guest.id }
}

export async function deleteCelebrationGuest(guestId: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_guests').delete().eq('id', guestId)
  return error ? { error: error.message } : { ok: true }
}

// ── Pro: Budget ────────────────────────────────────────────────
export async function addBudgetItem(celebrationId: string, data: {
  category: string; description: string; estimated: number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const sc = createServiceClient()
  const { data: cel } = await sc.from('celebrations').select('user_id').eq('id', celebrationId).single()
  if (!cel || cel.user_id !== user.id) return { error: 'No access' }
  const { data: item, error } = await sc.from('celebration_budget').insert({
    celebration_id: celebrationId,
    category: data.category.trim(),
    description: data.description.trim(),
    estimated: data.estimated,
    status: 'planned',
  }).select('id').single()
  return error ? { error: error.message } : { id: item.id }
}

export async function updateBudgetActual(itemId: string, actual: number, status: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_budget').update({ actual, status }).eq('id', itemId)
  return error ? { error: error.message } : { ok: true }
}

export async function deleteBudgetItem(itemId: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_budget').delete().eq('id', itemId)
  return error ? { error: error.message } : { ok: true }
}

export async function connectToCreativeEra(celebrationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const sc = createServiceClient()

  // Verify celebration belongs to user
  const { data: celebration } = await sc.from('celebrations')
    .select('id, user_id, name, type').eq('id', celebrationId).single()
  if (!celebration || celebration.user_id !== user.id) return { error: 'No access' }

  // Find Creative Era company — try slug first, fallback to first company
  let company = null
  const slug = process.env.CREATIVE_ERA_COMPANY_SLUG || 'creative-era'
  const { data: bySlug } = await sc.from('companies').select('id, name').eq('slug', slug).single()
  if (bySlug) {
    company = bySlug
  } else {
    const { data: first } = await sc.from('companies').select('id, name').limit(1).single()
    company = first
  }
  if (!company) return { error: 'No agency found' }

  // Check if already connected
  const { data: existing } = await sc.from('planner_connections')
    .select('id, status, wedding_id').eq('celebration_id', celebrationId).eq('company_id', company.id).single()
  if (existing) return { ok: true, status: existing.status, weddingId: existing.wedding_id, companyName: company.name }

  // Create connection
  const { error } = await sc.from('planner_connections').insert({
    celebration_id: celebrationId,
    company_id: company.id,
    user_id: user.id,
    status: 'pending',
  })
  if (error) return { error: error.message }

  // Notify agency members
  try {
    const { sendNewLeadEmail } = await import('@/lib/email')
    const { data: members } = await sc.from('company_members').select('user_id').eq('company_id', company.id)
    if (members?.length) {
      const { data: memberUsers } = await sc.from('users').select('email').in('id', members.map((m: { user_id: string }) => m.user_id))
      const toEmails = (memberUsers ?? []).map((u: { email: string }) => u.email).filter(Boolean)
      await sendNewLeadEmail({
        toEmails,
        companyName: company.name,
        celebrationName: celebration.name,
        celebrationType: celebration.type,
        clientEmail: user.email ?? '',
        message: null,
      })
    }
  } catch { /* non-blocking */ }

  return { ok: true, status: 'pending', weddingId: null, companyName: company.name }
}
