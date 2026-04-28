'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

interface WeddingInput {
  bride_name: string
  groom_name: string
  date_from: string | null
  date_to: string | null
  wedding_date: string | null
  primary_venue: string | null
  primary_city: string | null
  budget_total: number
  wedding_code: string
}

export async function createWedding(input: WeddingInput): Promise<{ id?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { data: member } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .single()

  if (!member) return { error: 'No company found for this user' }

  const serviceClient = createServiceClient()
  const { data, error } = await serviceClient
    .from('weddings')
    .insert({ company_id: member.company_id, ...input, status: 'setup' })
    .select('id')
    .single()

  if (error) return { error: error.message }
  return { id: data.id }
}
