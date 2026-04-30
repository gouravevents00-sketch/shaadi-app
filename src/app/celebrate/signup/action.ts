'use server'

import { createServiceClient } from '@/lib/supabase/server'

export async function createCelebrationUser(data: { name: string; email: string; password: string }) {
  const sc = createServiceClient()

  // Create user via admin — auto-confirms email, no confirmation email sent
  const { data: authData, error } = await sc.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  })
  if (error) return { error: error.message }
  const userId = authData.user?.id
  if (!userId) return { error: 'Signup failed' }

  // Create user profile
  await sc.from('users').upsert({ id: userId, email: data.email, name: data.name.trim() })

  return { success: true }
}
