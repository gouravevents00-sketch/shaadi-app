import { NextRequest } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { entity_id, entity_type, user_message, ai_message, rating } = await req.json() as {
    entity_id: string
    entity_type?: string
    user_message?: string
    ai_message: string
    rating: 'up' | 'down'
  }

  if (!entity_id || !ai_message || !rating) return new Response('Bad request', { status: 400 })

  const sc = createServiceClient()
  const { error } = await sc.from('ai_feedback').insert({
    user_id: user.id,
    entity_id,
    entity_type: entity_type ?? 'celebration',
    user_message: user_message ?? '',
    ai_message,
    rating,
  })

  if (error) return new Response('Error saving feedback', { status: 500 })
  return new Response('OK')
}
