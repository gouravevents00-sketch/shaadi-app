'use server'

import { createServiceClient } from '@/lib/supabase/server'

type SelFn = { day: string; name: string; time: string }

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

export async function createCelebration(payload: {
  userId: string
  brideName: string
  groomName: string
  startDate: string
  endDate: string
  city: string
  venue: string
  functions: SelFn[]
  guestCountPerDay: Record<string, number>
  managedBy: 'self' | 'agency' | 'marketplace'
}) {
  const sc = createServiceClient()

  const name = payload.brideName && payload.groomName
    ? `${payload.brideName} & ${payload.groomName}`
    : payload.brideName || payload.groomName || 'My Wedding'

  const totalGuests = Math.max(...Object.values(payload.guestCountPerDay), 0)

  const { data, error } = await sc
    .from('celebrations')
    .insert({
      user_id: payload.userId,
      type: 'wedding',
      name,
      bride_name: payload.brideName || null,
      groom_name: payload.groomName || null,
      event_date: payload.startDate || null,
      end_date: payload.endDate || null,
      city: payload.city || null,
      venue: payload.venue || null,
      guest_count: totalGuests || null,
      guest_count_per_day: payload.guestCountPerDay,
      managed_by: payload.managedBy,
      onboarding_done: true,
      budget: 0,
    })
    .select('id')
    .single()

  if (error || !data) return { error: error?.message || 'Failed to create celebration' }
  const celebrationId = data.id

  // Seed functions
  if (payload.functions.length > 0) {
    await sc.from('celebration_functions').insert(
      payload.functions.map((fn, i) => ({
        celebration_id: celebrationId,
        name: fn.name,
        date: fn.day,
        start_time: fn.time || null,
        sort_order: i,
      }))
    )
  }

  // Seed tasks
  const taskSet = new Map<string, { title: string; category: string }>()
  for (const fn of payload.functions) {
    for (const t of FUNCTION_TASKS[fn.name] ?? []) taskSet.set(t.title, t)
  }
  for (const t of COMMON_TASKS) taskSet.set(t.title, t)

  const tasks = Array.from(taskSet.values()).map(t => ({
    celebration_id: celebrationId,
    title: t.title,
    category: t.category,
    status: 'pending',
  }))
  if (tasks.length > 0) await sc.from('celebration_tasks').insert(tasks)

  return { id: celebrationId }
}
