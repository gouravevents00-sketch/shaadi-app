'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { seedDateReminders } from '@/lib/automation/engine'

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

  // Seed date-relative reminders if wedding date is set (non-blocking)
  const date = input.wedding_date || input.date_to || input.date_from
  if (date) {
    seedDateReminders(serviceClient, data.id, date).catch(() => { /* non-blocking */ })
  }

  return { id: data.id }
}
