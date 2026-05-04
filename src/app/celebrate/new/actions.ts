'use server'

import { createServiceClient } from '@/lib/supabase/server'

export type FunctionEntry = {
  name: string
  date: string
  start_time?: string
  end_time?: string
  venue_space?: string
}

export type MasterFormPayload = {
  userId: string
  brideName: string
  groomName: string
  weddingStyle: string
  startDate: string
  endDate: string
  functions: FunctionEntry[]
  guestCountPerDay: Record<string, number>  // { '2026-06-27': 300, '2026-06-28': 250 }
  requirements: string[]
  venue?: string
  city?: string
  managedBy: 'self' | 'agency' | 'marketplace'
}

// Tasks auto-seeded per function name
const FUNCTION_TASKS: Record<string, { title: string; category: string }[]> = {
  Haldi: [
    { title: 'Arrange haldi & rose water for ceremony', category: 'Haldi' },
    { title: 'Book décor for haldi setup (marigold/yellow theme)', category: 'Haldi' },
    { title: 'Confirm outfits for haldi (bride & family)', category: 'Haldi' },
    { title: 'Arrange dhol / folk music for haldi', category: 'Haldi' },
  ],
  Mehandi: [
    { title: 'Book mehandi artist(s)', category: 'Mehandi' },
    { title: 'Confirm number of ladies for mehandi', category: 'Mehandi' },
    { title: 'Arrange seating area for mehandi', category: 'Mehandi' },
    { title: 'Plan snacks & refreshments during mehandi', category: 'Mehandi' },
  ],
  Sagai: [
    { title: 'Finalise rings / exchange items', category: 'Sagai' },
    { title: 'Book pandit for ring ceremony rituals', category: 'Sagai' },
    { title: 'Arrange thaali & puja items for sagai', category: 'Sagai' },
    { title: 'Confirm outfits for sagai', category: 'Sagai' },
  ],
  Sangeet: [
    { title: 'Plan performances & acts for sangeet', category: 'Sangeet' },
    { title: 'Book DJ / live music for sangeet', category: 'Sangeet' },
    { title: 'Arrange choreographer if needed', category: 'Sangeet' },
    { title: 'Plan theme & décor for sangeet', category: 'Sangeet' },
    { title: 'Confirm outfits for family performances', category: 'Sangeet' },
  ],
  Mayra: [
    { title: 'Coordinate with mama ji for mayra rituals', category: 'Mayra' },
    { title: 'Arrange puja items for mayra', category: 'Mayra' },
    { title: 'Plan gifts from mama ji side', category: 'Mayra' },
  ],
  Tilak: [
    { title: 'Arrange puja thali for tilak ceremony', category: 'Tilak' },
    { title: 'Confirm groom-side family for tilak', category: 'Tilak' },
    { title: 'Plan gifts exchange during tilak', category: 'Tilak' },
  ],
  Baraat: [
    { title: 'Book ghodi (mare) for baraat', category: 'Baraat' },
    { title: 'Arrange dhol waale for baraat', category: 'Baraat' },
    { title: 'Confirm baraat route & timing with venue', category: 'Baraat' },
    { title: 'Arrange flowers / phool for groom sehra', category: 'Baraat' },
    { title: 'Book band / brass party for baraat', category: 'Baraat' },
  ],
  Pheras: [
    { title: 'Book pandit / purohit for pheras', category: 'Pheras' },
    { title: 'Arrange mandap setup', category: 'Pheras' },
    { title: 'Confirm puja samagri list with pandit', category: 'Pheras' },
    { title: 'Arrange agni kund / hawan kund', category: 'Pheras' },
  ],
  Vidaai: [
    { title: 'Plan vidaai ceremony (doli / car)', category: 'Vidaai' },
    { title: 'Arrange rice for bride to throw at vidaai', category: 'Vidaai' },
    { title: 'Plan bride side farewell gifts', category: 'Vidaai' },
  ],
  Reception: [
    { title: 'Confirm reception venue & layout', category: 'Reception' },
    { title: 'Book DJ / band for reception', category: 'Reception' },
    { title: 'Plan stage setup for couple', category: 'Reception' },
    { title: 'Arrange welcome drinks & canapes', category: 'Reception' },
    { title: 'Book photographer for reception portraits', category: 'Reception' },
  ],
  Cocktail: [
    { title: 'Plan cocktail menu & bar setup', category: 'Cocktail' },
    { title: 'Book bartenders', category: 'Cocktail' },
    { title: 'Arrange lounge seating & décor', category: 'Cocktail' },
  ],
  Hawan: [
    { title: 'Book pandit for hawan', category: 'Hawan' },
    { title: 'Arrange hawan samagri', category: 'Hawan' },
    { title: 'Confirm timing & space for hawan kund', category: 'Hawan' },
  ],
}

// Common tasks always included
const COMMON_TASKS = [
  { title: 'Book photographer & videographer', category: 'Photography' },
  { title: 'Finalize catering menu for all functions', category: 'Catering' },
  { title: 'Confirm main venue booking', category: 'Venue' },
  { title: 'Send wedding invitations (digital & physical)', category: 'Invites' },
  { title: 'Book bridal makeup artist', category: 'Bridal' },
  { title: 'Arrange guest accommodation', category: 'Logistics' },
  { title: 'Confirm transport & cars for wedding days', category: 'Logistics' },
  { title: 'Finalize outfits for all functions', category: 'Bridal' },
  { title: 'Order return gifts for guests', category: 'Gifts' },
  { title: 'Confirm décor / florist', category: 'Decor' },
]

export async function createCelebration(payload: MasterFormPayload) {
  const sc = createServiceClient()

  const totalGuests = Math.max(
    ...Object.values(payload.guestCountPerDay),
    0
  )

  const celebrationName = payload.brideName && payload.groomName
    ? `${payload.brideName} & ${payload.groomName}`
    : payload.brideName || payload.groomName || 'My Wedding'

  // 1. Insert celebration
  const { data: celebration, error } = await sc
    .from('celebrations')
    .insert({
      user_id: payload.userId,
      type: 'wedding',
      name: celebrationName,
      bride_name: payload.brideName || null,
      groom_name: payload.groomName || null,
      event_date: payload.startDate || null,
      end_date: payload.endDate || null,
      wedding_style: payload.weddingStyle || null,
      venue: payload.venue || null,
      city: payload.city || null,
      guest_count: totalGuests,
      guest_count_per_day: payload.guestCountPerDay,
      requirements: payload.requirements,
      managed_by: payload.managedBy,
      onboarding_done: true,
      budget: 0,
    })
    .select('id')
    .single()

  if (error || !celebration) {
    return { error: error?.message || 'Failed to create celebration' }
  }

  const celebrationId = celebration.id

  // 2. Insert functions
  if (payload.functions.length > 0) {
    await sc.from('celebration_functions').insert(
      payload.functions.map((fn, i) => ({
        celebration_id: celebrationId,
        name: fn.name,
        date: fn.date,
        start_time: fn.start_time || null,
        end_time: fn.end_time || null,
        venue_space: fn.venue_space || null,
        sort_order: i,
      }))
    )
  }

  // 3. Seed tasks from functions + common tasks
  const taskSet = new Map<string, { title: string; category: string }>()

  // Per-function tasks
  for (const fn of payload.functions) {
    const fnTasks = FUNCTION_TASKS[fn.name] || []
    for (const t of fnTasks) {
      taskSet.set(t.title, t)
    }
  }

  // Common tasks
  for (const t of COMMON_TASKS) {
    taskSet.set(t.title, t)
  }

  const tasksToInsert = Array.from(taskSet.values()).map(t => ({
    celebration_id: celebrationId,
    title: t.title,
    category: t.category,
    ai_generated: true,
  }))

  if (tasksToInsert.length > 0) {
    await sc.from('celebration_tasks').insert(tasksToInsert)
  }

  return { id: celebrationId, managedBy: payload.managedBy }
}
