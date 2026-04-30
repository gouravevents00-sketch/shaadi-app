import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MarketplaceAdminClient from './MarketplaceAdminClient'

export default async function MarketplaceAdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()

  // Only owners can access this
  const { data: member } = await sc.from('company_members')
    .select('role').eq('user_id', user.id).single()
  if (member?.role !== 'owner') redirect('/dashboard')

  const { data: vendors } = await sc
    .from('marketplace_vendors')
    .select('id, name, category, city, price_from, is_verified, is_featured, is_active, rating, review_count, created_at')
    .order('created_at', { ascending: false })

  return <MarketplaceAdminClient initialVendors={vendors ?? []} />
}
