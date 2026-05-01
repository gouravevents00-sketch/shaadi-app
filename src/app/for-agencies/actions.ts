'use server'

import { sendLeadNotification } from '@/lib/email'

export async function submitDemoRequest(data: {
  name: string
  email: string
  phone: string
  company: string
  message?: string
}) {
  if (!data.name.trim() || !data.email.trim() || !data.phone.trim()) {
    return { error: 'Name, email and phone are required' }
  }
  await sendLeadNotification({ type: 'agency_demo', ...data })
  return { success: true }
}
