import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CelebrationNewClient from './CelebrationNewClient'

export default async function CelebrationNewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Require auth — redirect to personal signup flow
  if (!user) {
    redirect('/celebrate/signup')
  }

  return <CelebrationNewClient userId={user.id} />
}
