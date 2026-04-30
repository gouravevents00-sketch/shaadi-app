import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VendorsClient from './VendorsClient'

export default async function VendorsPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const [{ data: vendors }, { data: vendorIds }] = await Promise.all([
    sc.from('org_vendors').select('*').eq('org_event_id', eventId).order('name'),
    sc.from('org_vendors').select('id').eq('org_event_id', eventId),
  ])

  const ids = (vendorIds ?? []).map((v: { id: string }) => v.id)
  const { data: payments } = ids.length
    ? await sc.from('org_vendor_payments').select('*').in('vendor_id', ids).order('paid_on')
    : { data: [] }

  return <VendorsClient eventId={eventId} initialVendors={vendors ?? []} initialPayments={payments ?? []} />
}
