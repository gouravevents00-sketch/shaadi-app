import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DocumentsClient from './DocumentsClient'

export default async function DocumentsPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const { data: wedding } = await sc.from('weddings').select('id, bride_name, groom_name').eq('id', weddingId).single()
  if (!wedding) redirect('/dashboard')

  const { data: docs } = await sc.from('documents')
    .select('id, name, storage_path, mime_type, size_bytes, entity_type, entity_id, created_at')
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: false })

  // Generate signed URLs
  const docsWithUrls = await Promise.all((docs ?? []).map(async (doc: { id: string; name: string; storage_path: string; mime_type: string | null; size_bytes: number | null; entity_type: string; entity_id: string | null; created_at: string }) => {
    const { data: urlData } = await sc.storage.from('wedding-docs').createSignedUrl(doc.storage_path, 3600)
    return { ...doc, url: urlData?.signedUrl ?? null }
  }))

  return (
    <DocumentsClient
      weddingId={weddingId}
      weddingName={`${wedding.bride_name} & ${wedding.groom_name}`}
      initialDocs={docsWithUrls}
    />
  )
}
