'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function addMarketplaceVendorToWedding(marketplaceVendorId: string, weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const sc = createServiceClient()

  // Verify user has access to this wedding (is a company member)
  const { data: member } = await sc.from('company_members')
    .select('company_id').eq('user_id', user.id).single()
  if (!member) return { error: 'No access' }

  const { data: wedding } = await sc.from('weddings')
    .select('id').eq('id', weddingId).eq('company_id', member.company_id).single()
  if (!wedding) return { error: 'Wedding not found' }

  // Fetch marketplace vendor details
  const { data: mv } = await sc.from('marketplace_vendors')
    .select('id, name, category, phone, email, website, price_from, price_unit')
    .eq('id', marketplaceVendorId).single()
  if (!mv) return { error: 'Vendor not found' }

  // Check if already added
  const { data: existing } = await sc.from('vendors')
    .select('id').eq('wedding_id', weddingId).ilike('name', mv.name).maybeSingle()
  if (existing) return { error: 'Already added to this wedding' }

  // Add to wedding vendors
  const { data: vendor, error } = await sc.from('vendors').insert({
    wedding_id: weddingId,
    name: mv.name,
    category: mv.category,
    phone: mv.phone ?? null,
    email: mv.email ?? null,
    total_amount: mv.price_from ?? 0,
    status: 'enquired',
    notes: mv.website ? `Website: ${mv.website}` : null,
  }).select('id').single()

  if (error) return { error: error.message }
  return { ok: true, vendorId: vendor.id }
}

export async function getUserWeddings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { weddings: [] }

  const sc = createServiceClient()
  const { data: member } = await sc.from('company_members')
    .select('company_id').eq('user_id', user.id).single()
  if (!member) return { weddings: [] }

  const { data: weddings } = await sc.from('weddings')
    .select('id, bride_name, groom_name, wedding_date')
    .eq('company_id', member.company_id)
    .eq('status', 'active')
    .order('wedding_date', { ascending: true })
    .limit(10)

  return { weddings: (weddings ?? []).map((w: { id: string; bride_name: string; groom_name: string; wedding_date: string | null }) => ({
    id: w.id,
    label: w.groom_name ? `${w.bride_name} & ${w.groom_name}` : w.bride_name,
    date: w.wedding_date,
  })) }
}
