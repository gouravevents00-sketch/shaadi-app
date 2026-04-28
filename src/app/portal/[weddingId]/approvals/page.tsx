import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ApprovalsClient from './ApprovalsClient'

export default async function ApprovalsPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const { data: items } = await sc.from('approval_items')
    .select('id, title, category, description, status, client_note, created_at, updated_at')
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: false })

  return <ApprovalsClient weddingId={weddingId} items={items ?? []} />
}
