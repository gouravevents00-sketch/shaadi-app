'use server'

import { createServiceClient } from '@/lib/supabase/server'

// TESTING MODE: Phone → auto-login via server-generated magic token (no Twilio needed)
// When Twilio is configured, replace with real SMS OTP flow
export async function phoneLogin(phone: string) {
  const sc = createServiceClient()
  const digits = phone.replace(/\D/g, '').slice(-10)
  if (digits.length !== 10) return { error: 'Invalid phone number' }

  const email = `91${digits}@phone.utsav.app`

  // Find or create user
  const { data: { users } } = await sc.auth.admin.listUsers()
  const existing = users.find((u: { email?: string }) => u.email === email)

  let userId: string
  let hasProfile = false

  if (existing) {
    userId = existing.id
    const { data: profile } = await sc.from('users').select('name').eq('id', userId).single()
    hasProfile = !!profile?.name
  } else {
    const { data: newUser, error } = await sc.auth.admin.createUser({
      email,
      email_confirm: true,
    })
    if (error) return { error: error.message }
    userId = newUser.user.id
  }

  // Generate a server-side magic token → client uses it to create session
  const { data: linkData, error: linkError } = await sc.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  if (linkError) return { error: linkError.message }

  return {
    email,
    hashed_token: linkData.properties.hashed_token,
    hasProfile,
    userId,
  }
}

export async function savePhoneProfile(data: { name: string; userId: string; phone: string }) {
  const sc = createServiceClient()
  const email = `91${data.phone}@phone.utsav.app`
  const { error } = await sc.from('users').upsert({
    id: data.userId,
    name: data.name.trim(),
    email,
    phone: `+91${data.phone}`,
  })
  if (error) return { error: error.message }
  return { success: true }
}
