'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function createUserForInvite(email: string, password: string, name: string): Promise<
  { userId: string } | { error: string; alreadyExists?: boolean }
> {
  const sc = createServiceClient()

  // Check if user already exists
  const { data: existing } = await sc.auth.admin.listUsers()
  const found = existing?.users?.find((u: { email?: string }) => u.email === email)
  if (found) {
    return { error: 'Account already exists with this email', alreadyExists: true }
  }

  const { data, error } = await sc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: name || email.split('@')[0] },
  })

  if (error) return { error: error.message }
  if (!data.user) return { error: 'Could not create account' }

  // Upsert user profile
  await sc.from('users').upsert({
    id: data.user.id,
    email,
    name: name || email.split('@')[0],
  }, { onConflict: 'id' })

  return { userId: data.user.id }
}
