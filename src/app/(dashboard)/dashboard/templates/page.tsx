import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TemplatesClient from './TemplatesClient'

export default async function TemplatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()
  if (!member) redirect('/dashboard')

  const sc = createServiceClient()
  const { data: templates } = await sc.from('checklist_templates')
    .select('id, name, checklist_template_items(id, title, category, side, sort_order)')
    .eq('company_id', member.company_id)
    .order('created_at', { ascending: false })

  const shaped = (templates ?? []).map((t: {
    id: string; name: string;
    checklist_template_items: { id: string; title: string; category: string; side: string; sort_order: number }[]
  }) => ({
    id: t.id,
    name: t.name,
    items: [...(t.checklist_template_items ?? [])].sort((a, b) => a.sort_order - b.sort_order),
  }))

  return <TemplatesClient initTemplates={shaped} />
}
