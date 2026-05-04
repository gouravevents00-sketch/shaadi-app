'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { type MasterFormPayload, type FunctionEntry } from '@/app/celebrate/new/actions'

// Re-use the task seeding logic
const FUNCTION_TASKS: Record<string, { title: string; category: string }[]> = {
  Haldi: [{ title: 'Arrange haldi & rose water', category: 'Haldi' }, { title: 'Book haldi décor', category: 'Haldi' }],
  Mehandi: [{ title: 'Book mehandi artist(s)', category: 'Mehandi' }, { title: 'Plan snacks during mehandi', category: 'Mehandi' }],
  Baraat: [{ title: 'Book ghodi for baraat', category: 'Baraat' }, { title: 'Arrange dhol waale', category: 'Baraat' }],
  Pheras: [{ title: 'Book pandit for pheras', category: 'Pheras' }, { title: 'Arrange mandap setup', category: 'Pheras' }],
  Reception: [{ title: 'Confirm reception venue', category: 'Reception' }, { title: 'Book DJ for reception', category: 'Reception' }],
  Sangeet: [{ title: 'Plan sangeet performances', category: 'Sangeet' }, { title: 'Book DJ / live music', category: 'Sangeet' }],
}
const COMMON_TASKS = [
  { title: 'Book photographer & videographer', category: 'Photography' },
  { title: 'Finalize catering for all functions', category: 'Catering' },
  { title: 'Confirm venue booking', category: 'Venue' },
  { title: 'Send wedding invitations', category: 'Invites' },
]

export async function createCelebrationFromAgencyInvite(params: {
  userId: string
  weddingId: string
  inviteToken: string
  payload: MasterFormPayload
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== params.userId) return { error: 'Not authenticated' }

  const sc = createServiceClient()

  // Verify the token still valid
  const { data: wedding } = await sc.from('weddings')
    .select('id, bride_name, groom_name, company_id').eq('client_invite_token', params.inviteToken).eq('id', params.weddingId).maybeSingle()
  if (!wedding) return { error: 'Invalid invite token' }

  const totalGuests = Math.max(...Object.values(params.payload.guestCountPerDay), 0)
  const celebrationName = params.payload.brideName && params.payload.groomName
    ? `${params.payload.brideName} & ${params.payload.groomName}`
    : wedding.bride_name && wedding.groom_name ? `${wedding.bride_name} & ${wedding.groom_name}` : 'My Wedding'

  // 1. Create celebration linked to the wedding
  const { data: celebration, error: celErr } = await sc.from('celebrations').insert({
    user_id: user.id,
    type: 'wedding',
    name: celebrationName,
    bride_name: params.payload.brideName || wedding.bride_name || null,
    groom_name: params.payload.groomName || wedding.groom_name || null,
    event_date: params.payload.startDate || null,
    end_date: params.payload.endDate || null,
    wedding_style: params.payload.weddingStyle || null,
    venue: params.payload.venue || null,
    city: params.payload.city || null,
    guest_count: totalGuests,
    guest_count_per_day: params.payload.guestCountPerDay,
    requirements: params.payload.requirements,
    managed_by: 'agency',
    onboarding_done: true,
    wedding_id: wedding.id,
    company_id: wedding.company_id,
    budget: 0,
  }).select('id').single()

  if (celErr || !celebration) return { error: celErr?.message || 'Could not create celebration' }

  // 2. Insert functions
  if (params.payload.functions.length > 0) {
    await sc.from('celebration_functions').insert(
      params.payload.functions.map((fn: FunctionEntry, i: number) => ({
        celebration_id: celebration.id,
        name: fn.name, date: fn.date,
        start_time: fn.start_time || null,
        sort_order: i,
      }))
    )
  }

  // 3. Seed tasks
  const taskSet = new Map<string, { title: string; category: string }>()
  for (const fn of params.payload.functions) {
    for (const t of (FUNCTION_TASKS[fn.name] || [])) taskSet.set(t.title, t)
  }
  for (const t of COMMON_TASKS) taskSet.set(t.title, t)
  const tasks = Array.from(taskSet.values()).map(t => ({ celebration_id: celebration.id, title: t.title, category: t.category, ai_generated: true }))
  if (tasks.length > 0) await sc.from('celebration_tasks').insert(tasks)

  // 4. Link the celebration to the wedding
  await sc.from('weddings').update({ client_celebration_id: celebration.id }).eq('id', wedding.id)

  // 5. Create planner_connection
  await sc.from('planner_connections').upsert({
    celebration_id: celebration.id,
    company_id: wedding.company_id,
    user_id: user.id,
    status: 'accepted',
    wedding_id: wedding.id,
  }, { onConflict: 'celebration_id,company_id' })

  return { id: celebration.id }
}

export async function getAgencyInviteToken(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const sc = createServiceClient()
  const { data: wedding } = await sc.from('weddings')
    .select('id, client_invite_token').eq('id', weddingId).maybeSingle()
  if (!wedding) return { error: 'Wedding not found' }
  if (wedding.client_invite_token) return { token: wedding.client_invite_token as string }
  const token = crypto.randomUUID()
  await sc.from('weddings').update({ client_invite_token: token }).eq('id', weddingId)
  return { token }
}
