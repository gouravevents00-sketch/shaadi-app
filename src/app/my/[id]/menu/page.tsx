import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import MenuClient from './MenuClient'

export default async function MenuPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/celebrate/signup?next=/my/${id}/menu`)

  const sc = createServiceClient()
  const [{ data: cel }, { data: functions }, { data: menuItems }] = await Promise.all([
    sc.from('celebrations').select('id, plan').eq('id', id).eq('user_id', user.id).single(),
    sc.from('celebration_functions').select('id, name, date, decoration_theme').eq('celebration_id', id).order('date'),
    sc.from('celebration_menu').select('*').eq('celebration_id', id).order('created_at'),
  ])

  if (!cel) redirect('/celebrate/new')

  return (
    <MenuClient
      celebrationId={id}
      initialMenu={menuItems ?? []}
      functions={functions ?? []}
    />
  )
}
