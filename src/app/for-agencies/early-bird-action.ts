'use server'

import { sendLeadNotification } from '@/lib/email'

export async function submitEarlyBird(data: {
  name: string
  email: string
  phone: string
  celebrationName?: string
}) {
  if (!data.name.trim() || !data.email.trim() || !data.phone.trim()) {
    return { error: 'Name, email and phone required' }
  }
  await sendLeadNotification({
    type: 'b2c_early_bird',
    name: data.name,
    email: data.email,
    phone: data.phone,
    message: data.celebrationName ? `Celebration: ${data.celebrationName}` : undefined,
  })
  return { success: true }
}
