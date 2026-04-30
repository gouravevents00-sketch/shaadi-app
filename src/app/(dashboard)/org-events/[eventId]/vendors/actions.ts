'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getVerified(eventId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!member) return { error: 'No access' as const }
  return { sc: createServiceClient() }
}

const PATH = (id: string) => `/org-events/${id}/vendors`

export type VendorRow = {
  id: string; org_event_id: string; name: string; category: string | null
  contact_name: string | null; contact_phone: string | null; contact_email: string | null
  quoted_amount: number | null; contract_signed: boolean; notes: string | null; created_at: string
}

export type PaymentRow = {
  id: string; vendor_id: string; amount: number; paid_on: string | null
  method: string | null; notes: string | null; created_at: string
}

export async function createVendor(eventId: string, data: {
  name: string; category?: string; contact_name?: string; contact_phone?: string
  contact_email?: string; quoted_amount?: number; contract_signed?: boolean; notes?: string
}) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { data: v, error } = await r.sc
    .from('org_vendors').insert({ org_event_id: eventId, ...data }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { id: v.id }
}

export async function updateVendor(eventId: string, vendorId: string, data: Partial<Omit<VendorRow, 'id' | 'org_event_id' | 'created_at'>>) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_vendors').update(data).eq('id', vendorId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function deleteVendor(eventId: string, vendorId: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_vendors').delete().eq('id', vendorId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}

export async function addPayment(vendorId: string, eventId: string, data: { amount: number; paid_on?: string; method?: string; notes?: string }) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { data: p, error } = await r.sc
    .from('org_vendor_payments').insert({ vendor_id: vendorId, ...data }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { id: p.id }
}

export async function deletePayment(vendorId: string, paymentId: string, eventId: string) {
  const r = await getVerified(eventId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('org_vendor_payments').delete().eq('id', paymentId)
  if (error) return { error: error.message }
  revalidatePath(PATH(eventId))
  return { success: true }
}
