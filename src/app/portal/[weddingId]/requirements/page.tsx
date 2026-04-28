import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RequirementsClient from './RequirementsClient'

export default async function RequirementsPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const { data: requirements } = await sc.from('requirements')
    .select('id, title, description, priority, status, side, created_at')
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: false })

  return (
    <RequirementsClient
      weddingId={weddingId}
      initialRequirements={requirements ?? []}
    />
  )
}
