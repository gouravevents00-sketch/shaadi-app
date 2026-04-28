'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

async function getVerified(weddingId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  const { data: access } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!access) return { error: 'No access' as const }
  return { serviceClient: createServiceClient() }
}

const PATH = (id: string) => `/weddings/${id}/checklist`

export async function createItem(weddingId: string, data: {
  title: string; category: string; side: string; due_date: string | null; notes: string | null
}) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { data: item, error } = await r.serviceClient
    .from('checklist_items').insert({ wedding_id: weddingId, ...data, status: 'pending' })
    .select('id').single()
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { id: item.id }
}

export async function updateItem(weddingId: string, itemId: string, data: {
  title?: string; category?: string; side?: string; status?: string; due_date?: string | null; notes?: string | null
}) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.serviceClient.from('checklist_items').update(data).eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { success: true }
}

export async function deleteItem(weddingId: string, itemId: string) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.serviceClient.from('checklist_items').delete().eq('id', itemId)
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { success: true }
}

export async function bookVendor(weddingId: string, itemId: string, data: {
  status: string
  notes: string
  vendor: { name: string; category: string; phone?: string; total_amount?: number }
}) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { serviceClient: sc } = r

  const [{ error: itemErr }, { error: vendorErr }] = await Promise.all([
    sc.from('checklist_items').update({ status: data.status, notes: data.notes }).eq('id', itemId),
    sc.from('vendors').insert({
      wedding_id: weddingId,
      name: data.vendor.name,
      category: data.vendor.category,
      phone: data.vendor.phone ?? null,
      total_amount: data.vendor.total_amount ?? 0,
      status: 'booked',
    }),
  ])
  if (itemErr) return { error: itemErr.message }
  if (vendorErr) return { error: vendorErr.message }
  revalidatePath(PATH(weddingId))
  revalidatePath(`/weddings/${weddingId}/vendors`)
  return { success: true }
}

export async function bulkCreateItems(weddingId: string, items: Array<{
  title: string; category: string; side: string
}>) {
  const r = await getVerified(weddingId)
  if ('error' in r) return { error: r.error }
  const { error } = await r.serviceClient.from('checklist_items').insert(
    items.map(i => ({ wedding_id: weddingId, ...i, status: 'pending' }))
  )
  if (error) return { error: error.message }
  revalidatePath(PATH(weddingId))
  return { success: true, count: items.length }
}
