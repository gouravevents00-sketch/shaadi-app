'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'wedding-docs'

async function getVerified() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as const }
  return { supabase, userId: user.id, serviceClient: createServiceClient() }
}

export async function uploadDocument(
  weddingId: string,
  entityType: string,
  entityId: string | null,
  fileName: string,
  fileBase64: string,
  mimeType: string,
  sizeBytes: number,
) {
  const r = await getVerified()
  if ('error' in r) return { error: r.error }

  const ext = fileName.split('.').pop() ?? 'bin'
  const path = `${weddingId}/${entityType}/${entityId ?? 'general'}/${Date.now()}-${fileName}`

  const buffer = Buffer.from(fileBase64, 'base64')
  const { error: uploadErr } = await r.serviceClient.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false })
  if (uploadErr) return { error: uploadErr.message }

  const { data: doc, error: dbErr } = await r.serviceClient
    .from('documents')
    .insert({
      wedding_id: weddingId,
      entity_type: entityType,
      entity_id: entityId,
      name: fileName,
      storage_path: path,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      uploaded_by: r.userId,
    })
    .select('id')
    .single()

  if (dbErr) return { error: dbErr.message }
  return { id: doc.id }
}

export async function getDocuments(weddingId: string, entityType: string, entityId: string | null) {
  const r = await getVerified()
  if ('error' in r) return { error: r.error, docs: [] }

  const q = r.serviceClient.from('documents')
    .select('id, name, storage_path, mime_type, size_bytes, created_at')
    .eq('wedding_id', weddingId)
    .eq('entity_type', entityType)
    .order('created_at', { ascending: false })

  const { data, error } = entityId
    ? await q.eq('entity_id', entityId)
    : await q.is('entity_id', null)

  if (error) return { error: error.message, docs: [] }

  // Generate signed URLs (valid 1 hour)
  const docs = await Promise.all((data ?? []).map(async (doc: { id: string; name: string; storage_path: string; mime_type: string | null; size_bytes: number | null; created_at: string }) => {
    const { data: urlData } = await r.serviceClient.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 3600)
    return { ...doc, url: urlData?.signedUrl ?? null }
  }))

  return { docs, error: null }
}

export async function deleteDocument(weddingId: string, docId: string, storagePath: string) {
  const r = await getVerified()
  if ('error' in r) return { error: r.error }

  await r.serviceClient.storage.from(BUCKET).remove([storagePath])
  const { error } = await r.serviceClient.from('documents').delete().eq('id', docId)
  if (error) return { error: error.message }
  return { success: true }
}
