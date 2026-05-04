import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import VivekClient from './VivekClient'

export default async function VivekPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <VivekClient />
}
