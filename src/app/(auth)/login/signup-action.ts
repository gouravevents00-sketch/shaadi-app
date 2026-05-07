'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function agencyPhoneLogin(phone: string) {
  const sc = createServiceClient()
  const digits = phone.replace(/\D/g, '').slice(-10)
  if (digits.length !== 10) return { error: 'Invalid phone number' }

  const email = `91${digits}@phone.utsav.app`

  const { data: { users } } = await sc.auth.admin.listUsers()
  const existing = users.find((u: { email?: string }) => u.email === email)

  let userId: string
  let hasProfile = false

  if (existing) {
    userId = existing.id
    const { data: profile } = await sc.from('users').select('name, company_id').eq('id', userId).single()
    hasProfile = !!(profile?.name && profile?.company_id)
  } else {
    const { data: newUser, error } = await sc.auth.admin.createUser({ email, email_confirm: true })
    if (error) return { error: error.message }
    userId = newUser.user.id
  }

  const { data: linkData, error: linkError } = await sc.auth.admin.generateLink({ type: 'magiclink', email })
  if (linkError) return { error: linkError.message }

  return { email, hashed_token: linkData.properties.hashed_token, hasProfile, userId }
}

export async function setupAgencyProfile(data: { name: string; companyName: string; phone: string }) {
  const sc = createServiceClient()
  const { data: { user } } = await (await createClient()).auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Upsert user profile
  const { error: userErr } = await sc.from('users').upsert({ id: user.id, name: data.name.trim(), phone: data.phone })
  if (userErr) return { error: userErr.message }

  // Create company
  const slug = data.companyName.trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') +
    '-' + Math.random().toString(36).slice(2, 6)
  const { data: company, error: companyErr } = await sc.from('companies').insert({
    name: data.companyName.trim(), slug,
  }).select('id').single()
  if (companyErr) return { error: companyErr.message }

  // Add as owner
  const { error: memberErr } = await sc.from('company_members').insert({
    company_id: company.id, user_id: user.id, role: 'owner',
  })
  if (memberErr) return { error: memberErr.message }

  return { success: true }
}
