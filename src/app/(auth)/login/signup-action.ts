'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function signupWithCompany(data: {
  name: string
  email: string
  password: string
  companyName: string
}) {
  const supabase = await createClient()
  const sc = createServiceClient()

  // 1. Sign up the user via admin (auto-confirms email, no confirmation email needed)
  const { data: authData, error: authError } = await sc.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  })
  if (authError) return { error: authError.message }
  const userId = authData.user?.id
  if (!userId) return { error: 'Signup failed' }

  // 2. Create user profile
  const { error: userErr } = await sc.from('users').upsert({
    id: userId,
    email: data.email,
    name: data.name.trim(),
  })
  if (userErr) return { error: userErr.message }

  // 3. Create company
  const slug = data.companyName.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
    '-' + Math.random().toString(36).slice(2, 6)
  const { data: company, error: companyErr } = await sc.from('companies').insert({
    name: data.companyName.trim(),
    slug,
  }).select('id').single()
  if (companyErr) return { error: companyErr.message }

  // 4. Add as owner
  const { error: memberErr } = await sc.from('company_members').insert({
    company_id: company.id,
    user_id: userId,
    role: 'owner',
  })
  if (memberErr) return { error: memberErr.message }

  return { success: true }
}
