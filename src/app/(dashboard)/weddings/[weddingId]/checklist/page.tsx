import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ChecklistClient from './ChecklistClient'

export default async function ChecklistPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: member } = await supabase.from('company_members').select('company_id').eq('user_id', user.id).single()

  const sc = createServiceClient()
  const [{ data: items }, { data: templates }, { data: events }] = await Promise.all([
    sc.from('checklist_items')
      .select('id, title, category, side, status, due_date, notes, order')
      .eq('wedding_id', weddingId).order('order').order('created_at'),
    member
      ? sc.from('checklist_templates')
          .select('id, name, checklist_template_items(title, category, side, sort_order)')
          .eq('company_id', member.company_id).order('created_at', { ascending: false })
      : Promise.resolve({ data: [] }),
    sc.from('events').select('name, date').eq('wedding_id', weddingId).order('date'),
  ])

  type RawTpl = {
    id: string; name: string;
    checklist_template_items: { title: string; category: string; side: string; sort_order: number }[]
  }
  const companyTemplates = (templates ?? []).map((t: RawTpl) => ({
    id: t.id,
    name: t.name,
    items: [...(t.checklist_template_items ?? [])].sort((a, b) => a.sort_order - b.sort_order)
      .map(i => ({ title: i.title, category: i.category, side: i.side as 'bride' | 'groom' | 'shared' })),
  }))

  const quickDates = (events ?? [])
    .map((e: { name: string; date: string }) => ({
      label: `${new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · ${e.name}`,
      value: e.date,
    }))
    .filter((d: { label: string; value: string }, i: number, arr: { label: string; value: string }[]) => arr.findIndex(x => x.value === d.value) === i)

  return <ChecklistClient weddingId={weddingId} initialItems={items ?? []} companyTemplates={companyTemplates} quickDates={quickDates} />
}
