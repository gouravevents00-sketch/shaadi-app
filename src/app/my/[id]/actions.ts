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

  const { data: celebration, error: celErr } = await sc.from('celebrations')
    .select('id, user_id, name, type, event_date, guest_count, company_id, wedding_id, plan, venue, city')
    .eq('id', celebrationId).eq('user_id', user.id).single()
  if (celErr || !celebration) return { error: celErr?.message ?? 'No access' }

  if (celebration.plan === 'pro' && celebration.wedding_id) {
    return { ok: true, weddingId: celebration.wedding_id as string }
  }

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

// ── Feature 1: Bulk import guests from CSV ─────────────────────
export async function bulkImportCelebrationGuests(
  celebrationId: string,
  rows: Array<{
    name: string; phone?: string; email?: string; side?: string
    family_group?: string; is_vip?: boolean; dietary?: string
    plus_count?: number; notes?: string
  }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const sc = createServiceClient()
  const { data: cel } = await sc.from('celebrations').select('user_id').eq('id', celebrationId).single()
  if (!cel || cel.user_id !== user.id) return { error: 'No access' }

  const records = rows.map(r => ({
    celebration_id: celebrationId,
    name: r.name.trim(),
    phone: r.phone?.trim() || null,
    email: r.email?.trim() || null,
    side: r.side?.toLowerCase() || 'both',
    family_group: r.family_group?.trim() || null,
    is_vip: r.is_vip ?? false,
    dietary: r.dietary?.trim() || null,
    plus_count: r.plus_count ?? 0,
    notes: r.notes?.trim() || null,
  }))

  const { error } = await sc.from('celebration_guests').insert(records)
  return error ? { error: error.message } : { ok: true, count: records.length }
}

// ── Feature 4: Update guest function attendance ────────────────
export async function updateGuestFunctions(guestId: string, functionIds: string[]) {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_guests')
    .update({ attending_function_ids: functionIds })
    .eq('id', guestId)
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

// ── Feature 13: Update budget payment due ─────────────────────
export async function updateBudgetPaymentDue(itemId: string, date: string | null) {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_budget').update({ payment_due: date || null }).eq('id', itemId)
  return error ? { error: error.message } : { ok: true }
}

export async function connectToCreativeEra(celebrationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const sc = createServiceClient()

  const { data: celebration } = await sc.from('celebrations')
    .select('id, user_id, name, type').eq('id', celebrationId).single()
  if (!celebration || celebration.user_id !== user.id) return { error: 'No access' }

  let company = null
  const slug = process.env.CREATIVE_ERA_COMPANY_SLUG || 'creative-era'
  const { data: bySlug } = await sc.from('companies').select('id, name').eq('slug', slug).single()
  if (bySlug) {
    company = bySlug
  } else {
    const { data: first } = await sc.from('companies').select('id, name').limit(1).maybeSingle()
    company = first
  }
  if (!company) return { error: 'No agency found' }

  const { data: existing } = await sc.from('planner_connections')
    .select('id, status, wedding_id').eq('celebration_id', celebrationId).eq('company_id', company.id).single()
  if (existing) return { ok: true, status: existing.status, weddingId: existing.wedding_id, companyName: company.name }

  const { error } = await sc.from('planner_connections').insert({
    celebration_id: celebrationId,
    company_id: company.id,
    user_id: user.id,
    status: 'pending',
  })
  if (error) return { error: error.message }

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

// ── Guests: update RSVP / details ─────────────────────────────
export async function updateCelebrationGuest(guestId: string, data: {
  name?: string; phone?: string | null; email?: string | null; dietary?: string | null
  dietary_notes?: string; plus_count?: number; side?: string; family_group?: string | null
  relation?: string | null; is_vip?: boolean; rsvp_status?: string; notes?: string | null
  arrival_mode?: string; arrival_time?: string; flight_no?: string; needs_pickup?: boolean
  room_id?: string | null
}) {
  const sc = createServiceClient()
  const updates: Record<string, unknown> = {}
  if (data.name !== undefined) updates.name = data.name.trim()
  if (data.phone !== undefined) updates.phone = data.phone?.trim() || null
  if (data.email !== undefined) updates.email = data.email?.trim() || null
  if (data.dietary !== undefined) updates.dietary = data.dietary || null
  if (data.plus_count !== undefined) updates.plus_count = data.plus_count
  if (data.side !== undefined) updates.side = data.side
  if (data.family_group !== undefined) updates.family_group = data.family_group?.trim() || null
  if (data.relation !== undefined) updates.relation = data.relation?.trim() || null
  if (data.is_vip !== undefined) updates.is_vip = data.is_vip
  if (data.rsvp_status !== undefined) updates.rsvp_status = data.rsvp_status
  if (data.notes !== undefined) updates.notes = data.notes?.trim() || null
  if (data.arrival_mode !== undefined) updates.arrival_mode = data.arrival_mode || null
  if (data.arrival_time !== undefined) updates.arrival_time = data.arrival_time || null
  if (data.flight_no !== undefined) updates.flight_no = data.flight_no?.trim() || null
  if (data.needs_pickup !== undefined) updates.needs_pickup = data.needs_pickup
  if (data.room_id !== undefined) updates.room_id = data.room_id
  const { error } = await sc.from('celebration_guests').update(updates).eq('id', guestId)
  return error ? { error: error.message } : { ok: true }
}

// ── Vendors ────────────────────────────────────────────────────
export async function addCelebrationVendor(celebrationId: string, data: {
  category: string; name: string; contact_name?: string; phone?: string; email?: string
  total_amount?: number; advance_paid?: number; status?: string; notes?: string; payment_due?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const sc = createServiceClient()
  const { data: cel } = await sc.from('celebrations').select('user_id').eq('id', celebrationId).single()
  if (!cel || cel.user_id !== user.id) return { error: 'No access' }
  const { data: vendor, error } = await sc.from('celebration_vendors').insert({
    celebration_id: celebrationId,
    category: data.category,
    name: data.name.trim(),
    contact_name: data.contact_name?.trim() || null,
    phone: data.phone?.trim() || null,
    email: data.email?.trim() || null,
    total_amount: data.total_amount ?? 0,
    advance_paid: data.advance_paid ?? 0,
    status: data.status || 'enquired',
    notes: data.notes?.trim() || null,
    payment_due: data.payment_due || null,
  }).select('id').single()
  return error ? { error: error.message } : { id: vendor.id }
}

export async function updateCelebrationVendor(vendorId: string, data: {
  status?: string; advance_paid?: number; total_amount?: number; notes?: string; payment_due?: string
}) {
  const sc = createServiceClient()
  const updates: Record<string, unknown> = {}
  if (data.status !== undefined) updates.status = data.status
  if (data.advance_paid !== undefined) updates.advance_paid = data.advance_paid
  if (data.total_amount !== undefined) updates.total_amount = data.total_amount
  if (data.notes !== undefined) updates.notes = data.notes
  if (data.payment_due !== undefined) updates.payment_due = data.payment_due || null
  const { error } = await sc.from('celebration_vendors').update(updates).eq('id', vendorId)
  return error ? { error: error.message } : { ok: true }
}

export async function deleteCelebrationVendor(vendorId: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_vendors').delete().eq('id', vendorId)
  return error ? { error: error.message } : { ok: true }
}

// ── Rooms ──────────────────────────────────────────────────────
export async function addRoom(celebrationId: string, data: {
  name: string; room_type: string; capacity: number; floor_block?: string; notes?: string; map_url?: string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const sc = createServiceClient()
  const { data: cel } = await sc.from('celebrations').select('user_id').eq('id', celebrationId).single()
  if (!cel || cel.user_id !== user.id) return { error: 'No access' }
  const { data: room, error } = await sc.from('celebration_rooms').insert({
    celebration_id: celebrationId,
    name: data.name.trim(),
    room_type: data.room_type,
    capacity: data.capacity,
    floor_block: data.floor_block?.trim() || null,
    notes: data.notes?.trim() || null,
    map_url: data.map_url?.trim() || null,
  }).select('id').single()
  return error ? { error: error.message } : { id: room.id }
}

export async function deleteRoom(roomId: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_rooms').delete().eq('id', roomId)
  return error ? { error: error.message } : { ok: true }
}

export async function allotRoom(data: {
  roomId: string; guestId: string; celebrationId: string; checkIn?: string; checkOut?: string
}) {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_room_allotments').upsert({
    room_id: data.roomId,
    guest_id: data.guestId,
    celebration_id: data.celebrationId,
    check_in: data.checkIn || null,
    check_out: data.checkOut || null,
  }, { onConflict: 'room_id,guest_id' })
  if (!error) await sc.from('celebration_guests').update({ room_id: data.roomId }).eq('id', data.guestId)
  return error ? { error: error.message } : { ok: true }
}

export async function removeFromRoom(guestId: string, roomId: string) {
  const sc = createServiceClient()
  await sc.from('celebration_room_allotments').delete().eq('guest_id', guestId).eq('room_id', roomId)
  await sc.from('celebration_guests').update({ room_id: null }).eq('id', guestId)
  return { ok: true }
}

// ── Feature 5: Bulk create rooms ──────────────────────────────
export async function bulkCreateRooms(
  celebrationId: string,
  rooms: Array<{
    name: string; room_type: string; capacity: number; floor_block?: string; map_url?: string
  }>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const sc = createServiceClient()
  const { data: cel } = await sc.from('celebrations').select('user_id').eq('id', celebrationId).single()
  if (!cel || cel.user_id !== user.id) return { error: 'No access' }

  const records = rooms.map(r => ({
    celebration_id: celebrationId,
    name: r.name.trim(),
    room_type: r.room_type,
    capacity: r.capacity,
    floor_block: r.floor_block?.trim() || null,
    map_url: r.map_url?.trim() || null,
  }))

  const { data, error } = await sc.from('celebration_rooms').insert(records).select('id, name, room_type, capacity, floor_block, map_url')
  return error ? { error: error.message } : { ok: true, rooms: data }
}

// ── Remarks ────────────────────────────────────────────────────
export async function addRemark(celebrationId: string, data: {
  body: string; category: string; is_for_agency: boolean
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const sc = createServiceClient()
  const { data: remark, error } = await sc.from('celebration_remarks').insert({
    celebration_id: celebrationId,
    user_id: user.id,
    body: data.body.trim(),
    category: data.category,
    is_for_agency: data.is_for_agency,
  }).select('id').single()
  return error ? { error: error.message } : { id: remark.id }
}

export async function deleteRemark(remarkId: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_remarks').delete().eq('id', remarkId)
  return error ? { error: error.message } : { ok: true }
}

// ── Partner Invite ─────────────────────────────────────────────
export async function getPartnerInviteToken(celebrationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const sc = createServiceClient()
  const { data: cel, error } = await sc.from('celebrations')
    .select('id, user_id, partner_invite_token')
    .eq('id', celebrationId).eq('user_id', user.id).single()
  if (error || !cel) return { error: 'No access' }
  if (cel.partner_invite_token) return { token: cel.partner_invite_token as string }
  const token = crypto.randomUUID()
  await sc.from('celebrations').update({ partner_invite_token: token }).eq('id', celebrationId)
  return { token }
}

export async function acceptPartnerInvite(token: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const sc = createServiceClient()
  const { data: cel } = await sc.from('celebrations')
    .select('id, user_id, name').eq('partner_invite_token', token).single()
  if (!cel) return { error: 'Invalid or expired invite' }
  if (cel.user_id === user.id) return { ok: true, celebrationId: cel.id as string, already: true }
  const { error } = await sc.from('celebration_members').upsert({
    celebration_id: cel.id,
    user_id: user.id,
    role: 'partner',
    invited_by: cel.user_id,
    accepted_at: new Date().toISOString(),
  }, { onConflict: 'celebration_id,user_id' })
  if (error) return { error: error.message }
  return { ok: true, celebrationId: cel.id as string, celebrationName: cel.name as string }
}

// ── Tasks: update due_date / notes ────────────────────────────
export async function updateTaskDetails(taskId: string, data: { due_date?: string | null; notes?: string | null }) {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_tasks').update({
    due_date: data.due_date ?? null,
    notes: data.notes ?? null,
  }).eq('id', taskId)
  return error ? { error: error.message } : { ok: true }
}
// ── Feature 9: Bulk add tasks from template ───────────────────
export async function bulkAddTasks(
  celebrationId: string,
  tasks: Array<{ title: string; category: string }>
) {
  const sc = createServiceClient()
  const records = tasks.map(t => ({
    celebration_id: celebrationId,
    title: t.title.trim(),
    category: t.category.trim() || 'General',
    status: 'pending' as const,
    ai_generated: false,
  }))
  const { data, error } = await sc.from('celebration_tasks').insert(records).select('id')
  return error ? { error: error.message } : { ok: true, count: records.length, ids: (data ?? []).map((r: { id: string }) => r.id) }
}

// ── Feature 11: Bulk update / delete tasks ────────────────────
export async function bulkUpdateTaskStatus(taskIds: string[], status: 'pending' | 'in_progress' | 'done') {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_tasks').update({ status }).in('id', taskIds)
  return error ? { error: error.message } : { ok: true }
}

export async function bulkDeleteTasks(taskIds: string[]) {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_tasks').delete().in('id', taskIds)
  return error ? { error: error.message } : { ok: true }
}

// ── Outfits ───────────────────────────────────────────────────
export async function addOutfit(celebrationId: string, data: {
  person_name: string; person_role?: string; function_name?: string;
  outfit_description?: string; color?: string; designer_vendor?: string; notes?: string
}) {
  const sc = createServiceClient()
  const { data: item, error } = await sc.from('celebration_outfits').insert({
    celebration_id: celebrationId,
    person_name: data.person_name.trim(),
    person_role: data.person_role || null,
    function_name: data.function_name || null,
    outfit_description: data.outfit_description?.trim() || null,
    color: data.color?.trim() || null,
    designer_vendor: data.designer_vendor?.trim() || null,
    notes: data.notes?.trim() || null,
    status: 'planned',
  }).select('id').single()
  return error ? { error: error.message } : { id: item.id }
}

export async function updateOutfitStatus(outfitId: string, status: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_outfits').update({ status }).eq('id', outfitId)
  return error ? { error: error.message } : { ok: true }
}

export async function deleteOutfit(outfitId: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_outfits').delete().eq('id', outfitId)
  return error ? { error: error.message } : { ok: true }
}

// ── Rituals ───────────────────────────────────────────────────
export async function addRitual(celebrationId: string, data: {
  function_id?: string; name: string; description?: string;
  time_of_day?: string; duration_minutes?: number; pandit_required?: boolean;
  items_required?: string[]
}) {
  const sc = createServiceClient()
  const { data: item, error } = await sc.from('celebration_rituals').insert({
    celebration_id: celebrationId,
    function_id: data.function_id || null,
    name: data.name.trim(),
    description: data.description?.trim() || null,
    time_of_day: data.time_of_day || null,
    duration_minutes: data.duration_minutes || null,
    pandit_required: data.pandit_required ?? false,
    items_required: data.items_required || [],
  }).select('id').single()
  return error ? { error: error.message } : { id: item.id }
}

export async function toggleRitual(ritualId: string, isDone: boolean) {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_rituals').update({ is_done: isDone }).eq('id', ritualId)
  return error ? { error: error.message } : { ok: true }
}

export async function deleteRitual(ritualId: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_rituals').delete().eq('id', ritualId)
  return error ? { error: error.message } : { ok: true }
}

export async function updateCelebration(celebrationId: string, data: {
  bride_name?: string
  groom_name?: string
  event_date?: string | null
  end_date?: string | null
  city?: string | null
  venue?: string | null
  guest_count?: number
  wedding_style?: string | null
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const sc = createServiceClient()
  const { error } = await sc.from('celebrations')
    .update(data)
    .eq('id', celebrationId)
    .eq('user_id', user.id)
  return error ? { error: error.message } : { ok: true }
}

// ── Menu ──────────────────────────────────────────────────────────────────────

export async function addMenuItem(celebrationId: string, data: {
  function_id?: string; dish_name: string; dish_type?: string;
  plate_count?: number; is_veg?: boolean; notes?: string
}) {
  const sc = createServiceClient()
  const { data: item, error } = await sc.from('celebration_menu').insert({
    celebration_id: celebrationId,
    function_id: data.function_id || null,
    dish_name: data.dish_name.trim(),
    dish_type: data.dish_type || 'main',
    plate_count: data.plate_count ?? null,
    is_veg: data.is_veg ?? true,
    notes: data.notes?.trim() || null,
  }).select('id').single()
  return error ? { error: error.message } : { id: item.id }
}

export async function deleteMenuItem(itemId: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_menu').delete().eq('id', itemId)
  return error ? { error: error.message } : { ok: true }
}

export async function updateFunctionTheme(functionId: string, theme: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_functions')
    .update({ decoration_theme: theme || null })
    .eq('id', functionId)
  return error ? { error: error.message } : { ok: true }
}

// ── Vehicles ──────────────────────────────────────────────────────────────────

export async function addVehicle(celebrationId: string, data: {
  car_number: string; car_type?: string; car_model?: string;
  capacity?: number; chauffeur_name?: string; chauffeur_phone?: string;
  assigned_to?: string; notes?: string
}) {
  const sc = createServiceClient()
  const { data: item, error } = await sc.from('celebration_vehicles').insert({
    celebration_id: celebrationId,
    car_number: data.car_number.trim(),
    car_type: data.car_type || 'sedan',
    car_model: data.car_model?.trim() || null,
    capacity: data.capacity ?? 4,
    chauffeur_name: data.chauffeur_name?.trim() || null,
    chauffeur_phone: data.chauffeur_phone?.trim() || null,
    assigned_to: data.assigned_to?.trim() || null,
    notes: data.notes?.trim() || null,
  }).select('id').single()
  return error ? { error: error.message } : { id: item.id }
}

export async function deleteVehicle(vehicleId: string) {
  const sc = createServiceClient()
  const { error } = await sc.from('celebration_vehicles').delete().eq('id', vehicleId)
  return error ? { error: error.message } : { ok: true }
}
