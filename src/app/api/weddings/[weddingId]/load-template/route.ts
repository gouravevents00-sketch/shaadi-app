import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const TEMPLATE = [
  { category: 'Venue & Decor', tasks: [
    'Confirm main venue booking and payment schedule',
    'Finalize mandap / stage design',
    'Book floral decorator',
    'Confirm lighting and furniture setup',
    'Plan entrance and pathway decor',
    'Arrange photo booth / backdrop',
  ]},
  { category: 'Catering', tasks: [
    'Finalise menu with caterer',
    'Confirm guest count for each meal',
    'Arrange Jain / special dietary options',
    'Plan bar and mocktail setup',
    'Confirm crockery and service staff',
  ]},
  { category: 'Photography & Video', tasks: [
    'Book photographer',
    'Book videographer / cinematographer',
    'Share shot list and family details',
    'Plan pre-wedding shoot',
    'Confirm drone permissions if needed',
  ]},
  { category: 'Guest Management', tasks: [
    'Finalise guest list',
    'Send invitations',
    'Track RSVPs',
    'Arrange airport / station pickups',
    'Prepare and distribute welcome kits',
    'Confirm room allocations',
  ]},
  { category: 'Logistics & Travel', tasks: [
    'Block hotel rooms',
    'Arrange guest transport (buses / cabs)',
    'Plan baraat route and logistics',
    'Confirm parking arrangements',
  ]},
  { category: 'Entertainment', tasks: [
    'Book DJ / live band',
    'Plan sangeet performances',
    'Book emcee / anchor',
    'Arrange kids entertainment if needed',
  ]},
  { category: 'Rituals & Ceremonies', tasks: [
    'Book pandit / priest',
    'Prepare puja samagri list',
    'Confirm ritual timings with pandit',
    'Arrange haldi and other ceremony supplies',
  ]},
  { category: 'Bride Prep', tasks: [
    'Book mehendi artist',
    'Confirm bridal makeup artist',
    'Book hair stylist',
    'Finalise bridal look and run trial',
    'Coordinate bridal party outfits',
  ]},
  { category: 'Groom Prep', tasks: [
    'Book sehra and baraat accessories',
    'Confirm groom grooming / makeup',
    'Coordinate groomsmen outfits',
  ]},
]

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ weddingId: string }> }
) {
  const { weddingId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sc = createServiceClient()

  // Skip if checklist already has items
  const { count } = await sc.from('checklist_items')
    .select('*', { count: 'exact', head: true }).eq('wedding_id', weddingId)
  if ((count ?? 0) > 0) return NextResponse.json({ ok: true, skipped: true })

  const items = TEMPLATE.flatMap(group =>
    group.tasks.map(title => ({
      wedding_id: weddingId,
      title,
      category: group.category,
      status: 'pending',
    }))
  )

  const { error } = await sc.from('checklist_items').insert(items)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, count: items.length })
}
