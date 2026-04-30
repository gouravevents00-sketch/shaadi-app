import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VendorsClient from './VendorsClient'

export default async function VendorsPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const [{ data: vendors }, { data: payments }, { data: events }] = await Promise.all([
    sc.from('vendors').select('*').eq('wedding_id', weddingId).order('created_at'),
    sc.from('vendor_payments')
      .select('*')
      .in('vendor_id',
        (await sc.from('vendors').select('id').eq('wedding_id', weddingId)).data?.map((v: { id: string }) => v.id) ?? []
      )
      .order('due_date'),
    sc.from('events').select('name, date').eq('wedding_id', weddingId).order('date'),
  ])

  const quickDates = (events ?? [])
    .map((e: { name: string; date: string }) => ({
      label: `${new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ${e.name}`,
      value: e.date,
    }))
    .filter((d: { label: string; value: string }, i: number, arr: { label: string; value: string }[]) => arr.findIndex(x => x.value === d.value) === i)

  return (
    <VendorsClient
      weddingId={weddingId}
      initialVendors={vendors ?? []}
      initialPayments={payments ?? []}
      quickDates={quickDates}
    />
  )
}
