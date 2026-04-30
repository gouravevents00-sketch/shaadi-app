'use server'

import { createServiceClient } from '@/lib/supabase/server'

export type CelebrationPayload = {
  userId: string
  type: string
  name: string
  eventDate?: string
  venue?: string
  city?: string
  guestCount?: number
  budget?: number
}

const CELEBRATION_TASKS: Record<string, { title: string; category: string }[]> = {
  wedding: [
    { title: 'Book main venue', category: 'Venue' },
    { title: 'Finalize catering menu', category: 'Catering' },
    { title: 'Book photographer & videographer', category: 'Photography' },
    { title: 'Send wedding invites', category: 'Invites' },
    { title: 'Book bridal makeup artist', category: 'Bridal' },
    { title: 'Confirm decorator / florist', category: 'Decor' },
    { title: 'Book DJ / music band', category: 'Entertainment' },
    { title: 'Arrange guest accommodation', category: 'Logistics' },
    { title: 'Finalize bridal outfit', category: 'Bridal' },
    { title: 'Book pandit / priest', category: 'Rituals' },
    { title: 'Confirm transport & cars', category: 'Logistics' },
    { title: 'Order wedding cake', category: 'Catering' },
    { title: 'Send thank-you gifts', category: 'Post Wedding' },
  ],
  sagai: [
    { title: 'Book venue / banquet hall', category: 'Venue' },
    { title: 'Finalize catering menu', category: 'Catering' },
    { title: 'Book photographer', category: 'Photography' },
    { title: 'Send engagement invites', category: 'Invites' },
    { title: 'Choose outfit for ceremony', category: 'Outfit' },
    { title: 'Arrange ring exchange ceremony', category: 'Ritual' },
    { title: 'Plan ring design / purchase', category: 'Jewelry' },
    { title: 'Organize ring ceremony gifts', category: 'Gifts' },
  ],
  namkaran: [
    { title: 'Book pandit / priest', category: 'Ritual' },
    { title: 'Finalize venue (home or hall)', category: 'Venue' },
    { title: 'Arrange puja samagri', category: 'Ritual' },
    { title: 'Plan catering / prasad', category: 'Catering' },
    { title: 'Send invites to family & friends', category: 'Invites' },
    { title: 'Prepare baby\'s outfit for ceremony', category: 'Baby' },
    { title: 'Arrange flowers & decoration', category: 'Decor' },
    { title: 'Plan gifts for baby', category: 'Gifts' },
  ],
  griha_pravesh: [
    { title: 'Fix muhurat date with pandit', category: 'Ritual' },
    { title: 'Book pandit for puja', category: 'Ritual' },
    { title: 'Arrange puja samagri', category: 'Ritual' },
    { title: 'Plan catering for guests', category: 'Catering' },
    { title: 'Send invites', category: 'Invites' },
    { title: 'Prepare house for entry', category: 'House' },
    { title: 'Arrange flowers for entrance', category: 'Decor' },
    { title: 'Organize return gifts', category: 'Gifts' },
  ],
  godh_bharai: [
    { title: 'Book venue', category: 'Venue' },
    { title: 'Arrange catering / snacks', category: 'Catering' },
    { title: 'Plan decoration (pink/blue theme)', category: 'Decor' },
    { title: 'Book photographer', category: 'Photography' },
    { title: 'Send baby shower invites', category: 'Invites' },
    { title: 'Plan baby shower games', category: 'Entertainment' },
    { title: 'Arrange gifts for mom-to-be', category: 'Gifts' },
    { title: 'Order themed cake', category: 'Catering' },
  ],
  birthday: [
    { title: 'Book venue (home / hall / restaurant)', category: 'Venue' },
    { title: 'Finalize guest list', category: 'Guests' },
    { title: 'Send invites (digital or physical)', category: 'Invites' },
    { title: 'Order birthday cake', category: 'Catering' },
    { title: 'Plan decoration & theme', category: 'Decor' },
    { title: 'Arrange catering / food', category: 'Catering' },
    { title: 'Plan entertainment / games', category: 'Entertainment' },
    { title: 'Arrange return gifts for kids', category: 'Gifts' },
    { title: 'Book photographer', category: 'Photography' },
  ],
  anniversary: [
    { title: 'Choose celebration type (intimate / party)', category: 'Planning' },
    { title: 'Book restaurant or venue', category: 'Venue' },
    { title: 'Plan surprise element', category: 'Planning' },
    { title: 'Arrange flowers & decoration', category: 'Decor' },
    { title: 'Book photographer / videographer', category: 'Photography' },
    { title: 'Order anniversary cake', category: 'Catering' },
    { title: 'Send invites if hosting guests', category: 'Invites' },
    { title: 'Plan gift for spouse', category: 'Gifts' },
  ],
  mundan: [
    { title: 'Book barber / salon for ceremony', category: 'Ritual' },
    { title: 'Fix auspicious date with pandit', category: 'Ritual' },
    { title: 'Book pandit for puja', category: 'Ritual' },
    { title: 'Finalize venue', category: 'Venue' },
    { title: 'Arrange puja samagri', category: 'Ritual' },
    { title: 'Plan catering for guests', category: 'Catering' },
    { title: 'Send invites', category: 'Invites' },
    { title: 'Prepare baby outfit', category: 'Baby' },
  ],
  sangeet: [
    { title: 'Book venue', category: 'Venue' },
    { title: 'Plan performances & acts', category: 'Entertainment' },
    { title: 'Book DJ or live music', category: 'Entertainment' },
    { title: 'Arrange choreographer if needed', category: 'Entertainment' },
    { title: 'Finalize catering menu', category: 'Catering' },
    { title: 'Book photographer / videographer', category: 'Photography' },
    { title: 'Plan decoration / theme', category: 'Decor' },
    { title: 'Send invites', category: 'Invites' },
    { title: 'Plan outfits for family performances', category: 'Outfit' },
  ],
  puja: [
    { title: 'Book pandit / priest', category: 'Ritual' },
    { title: 'Fix muhurat / auspicious timing', category: 'Ritual' },
    { title: 'Arrange puja samagri & thali', category: 'Ritual' },
    { title: 'Plan prasad distribution', category: 'Catering' },
    { title: 'Invite family & neighbors', category: 'Invites' },
    { title: 'Arrange flowers for decoration', category: 'Decor' },
    { title: 'Prepare bhog / prasad food', category: 'Catering' },
  ],
  graduation: [
    { title: 'Book venue / restaurant', category: 'Venue' },
    { title: 'Send invites to family & friends', category: 'Invites' },
    { title: 'Plan catering / food', category: 'Catering' },
    { title: 'Order celebration cake', category: 'Catering' },
    { title: 'Arrange decoration', category: 'Decor' },
    { title: 'Plan gifts & memories book', category: 'Gifts' },
    { title: 'Book photographer', category: 'Photography' },
  ],
}

// Default tasks for types not explicitly listed
const DEFAULT_TASKS = [
  { title: 'Book venue', category: 'Venue' },
  { title: 'Finalize guest list', category: 'Guests' },
  { title: 'Send invites', category: 'Invites' },
  { title: 'Arrange catering', category: 'Catering' },
  { title: 'Plan decoration', category: 'Decor' },
  { title: 'Book photographer', category: 'Photography' },
  { title: 'Arrange logistics & transport', category: 'Logistics' },
]

export async function createCelebration(payload: CelebrationPayload) {
  const sc = createServiceClient()

  const { data: celebration, error } = await sc
    .from('celebrations')
    .insert({
      user_id: payload.userId,
      type: payload.type,
      name: payload.name,
      event_date: payload.eventDate || null,
      venue: payload.venue || null,
      city: payload.city || null,
      guest_count: payload.guestCount || 0,
      budget: payload.budget || 0,
    })
    .select('id')
    .single()

  if (error || !celebration) {
    return { error: error?.message || 'Failed to create celebration' }
  }

  // Insert default tasks
  const tasks = CELEBRATION_TASKS[payload.type] || DEFAULT_TASKS
  await sc.from('celebration_tasks').insert(
    tasks.map(t => ({
      celebration_id: celebration.id,
      title: t.title,
      category: t.category,
      ai_generated: true,
    }))
  )

  return { id: celebration.id }
}
