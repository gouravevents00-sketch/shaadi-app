'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { autoPopulateFromVendorBooked } from '@/lib/automation/engine'

async function getVerified(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const { data: access } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!access) return { error: 'No access' as const }
  return { sc: createServiceClient() }
}

const PATH = (id: string) => `/weddings/${id}/vendors`

// ─── Vendors ──────────────────────────────────────────────────

export async function createVendor(weddingId: string, data: {
  name: string; category: string; contact_name?: string; phone?: string
  email?: string; total_amount?: number; status?: string; notes?: string
}) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { data: vendor, error } = await r.sc.from('vendors')
    .insert({ wedding_id: weddingId, ...data }).select('id').single()
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { id: vendor.id }
}

export async function updateVendor(weddingId: string, vendorId: string, data: {
  name?: string; category?: string; contact_name?: string; phone?: string
  email?: string; total_amount?: number; paid_amount?: number; status?: string
  contract_url?: string; notes?: string
}) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }

  // Fetch current status before update (to detect booked transition)
  const { data: before } = await r.sc.from('vendors')
    .select('name, category, status').eq('id', vendorId).single()

  const { error } = await r.sc.from('vendors').update(data).eq('id', vendorId)
  if (error) return { error: error.message }

  // Trigger follow-up tasks when vendor first moves to 'booked'
  if (data.status === 'booked' && before?.status !== 'booked') {
    const name = data.name ?? before?.name ?? ''
    const cat  = data.category ?? before?.category ?? ''
    autoPopulateFromVendorBooked(r.sc, weddingId, name, cat)
      .catch(() => { /* non-blocking */ })
  }

  revalidatePath(PATH(weddingId))
  return { success: true }
}

export async function deleteVendor(weddingId: string, vendorId: string) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('vendors').delete().eq('id', vendorId)
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { success: true }
}

// ─── Payments ─────────────────────────────────────────────────

export async function createPayment(weddingId: string, vendorId: string, data: {
  amount: number; due_date: string; paid_date?: string | null; mode?: string; notes?: string
}) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { data: pmt, error } = await r.sc.from('vendor_payments')
    .insert({ vendor_id: vendorId, ...data }).select('id').single()
  if (error) return { error: error.message }
  // Recalculate paid_amount
  await recalcPaid(r.sc, vendorId)
  revalidatePath(PATH(weddingId))
  return { id: pmt.id }
}

export async function updatePayment(weddingId: string, vendorId: string, paymentId: string, data: {
  amount?: number; due_date?: string; paid_date?: string | null; mode?: string; notes?: string
}) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('vendor_payments').update(data).eq('id', paymentId)
  if (error) return { error: error.message }
  await recalcPaid(r.sc, vendorId)
  revalidatePath(PATH(weddingId))
  return { success: true }
}

export async function deletePayment(weddingId: string, vendorId: string, paymentId: string) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.sc.from('vendor_payments').delete().eq('id', paymentId)
  if (error) return { error: error.message }
  await recalcPaid(r.sc, vendorId)
  revalidatePath(PATH(weddingId))
  return { success: true }
}

// ─── Vendor ↔ Event tagging ────────────────────────────────────

export async function toggleVendorEvent(weddingId: string, vendorId: string, eventId: string) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }

  // Check if already linked
  const { data: existing } = await r.sc.from('vendor_events')
    .select('id').eq('vendor_id', vendorId).eq('event_id', eventId).maybeSingle()

  if (existing) {
    await r.sc.from('vendor_events').delete().eq('id', existing.id)
    return { removed: true }
  } else {
    await r.sc.from('vendor_events').insert({ vendor_id: vendorId, event_id: eventId })
    return { added: true }
  }
}

async function recalcPaid(sc: ReturnType<typeof createServiceClient>, vendorId: string) {
  const { data: pmts } = await sc.from('vendor_payments')
    .select('amount, paid_date').eq('vendor_id', vendorId)
  const paid = (pmts ?? []).filter((p: { paid_date: string | null }) => p.paid_date)
    .reduce((s: number, p: { amount: number }) => s + Number(p.amount), 0)
  await sc.from('vendors').update({ paid_amount: paid }).eq('id', vendorId)
}
