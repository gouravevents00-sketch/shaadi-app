import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CheckCircle2, Circle, CircleDot, Clock, FileText, Image, Download } from 'lucide-react'
import { getClientDocuments } from '@/app/(dashboard)/weddings/[weddingId]/documents/actions'

type CheckItem = { id: string; title: string; category: string; status: string; due_date: string | null }
type Vendor    = { id: string; name: string; category: string; status: string; total_amount: number; paid_amount: number }

const fmtDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export default async function ProgressPage({ params }: { params: Promise<{ weddingId: string }> }) {
  const { weddingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const sc = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const [{ data: items }, { data: vendors }, { data: wedding }, docsResult] = await Promise.all([
    sc.from('checklist_items')
      .select('id, title, category, status, due_date')
      .eq('wedding_id', weddingId)
      .order('category').order('due_date', { ascending: true, nullsFirst: false }),
    sc.from('vendors')
      .select('id, name, category, status, total_amount, paid_amount')
      .eq('wedding_id', weddingId).order('category'),
    sc.from('weddings').select('bride_name, groom_name, wedding_date').eq('id', weddingId).single(),
    getClientDocuments(weddingId),
  ])
  const sharedDocs = docsResult.docs ?? []

  const checklist = (items ?? []) as CheckItem[]
  const allVendors = (vendors ?? []) as Vendor[]
  const done  = checklist.filter((i: CheckItem) => i.status === 'done').length
  const total = checklist.length
  const pct   = total ? Math.round((done / total) * 100) : 0

  const byCategory: Record<string, CheckItem[]> = {}
  for (const item of checklist) {
    if (!byCategory[item.category]) byCategory[item.category] = []
    byCategory[item.category].push(item)
  }

  const vendorsByStatus = {
    confirmed: allVendors.filter((v: Vendor) => v.status === 'confirmed' || v.status === 'booked'),
    pending:   allVendors.filter((v: Vendor) => v.status === 'enquired' || v.status === 'negotiating'),
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Wedding Progress</h2>
        <p className="text-sm text-stone-400 mt-0.5">
          Live status of your wedding planning — updated by your coordinator
        </p>
      </div>

      {/* Overall progress */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-stone-400 font-medium mb-1">Checklist done</p>
          <p className="text-2xl font-bold text-stone-900">{pct}<span className="text-base font-normal text-stone-400">%</span></p>
          <div className="mt-2 h-1.5 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-stone-400 mt-1">{done}/{total} tasks</p>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-stone-400 font-medium mb-1">Vendors confirmed</p>
          <p className="text-2xl font-bold text-stone-900">
            {vendorsByStatus.confirmed.length}
            <span className="text-base font-normal text-stone-400">/{allVendors.length}</span>
          </p>
          <p className="text-xs text-stone-400 mt-2">
            {vendorsByStatus.pending.length > 0
              ? <span className="text-amber-600">{vendorsByStatus.pending.length} still being finalized</span>
              : 'All confirmed'}
          </p>
        </div>
      </div>

      {/* Vendors */}
      {allVendors.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Vendors</p>
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100">
            {allVendors.map((v: Vendor) => (
              <div key={v.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800">{v.name}</p>
                  <p className="text-xs text-stone-400">{v.category}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                  v.status === 'confirmed' || v.status === 'booked'
                    ? 'bg-emerald-100 text-emerald-700'
                    : v.status === 'enquired'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-stone-100 text-stone-500'
                } capitalize`}>
                  {v.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared documents */}
      {sharedDocs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Documents from your planner</p>
          <div className="bg-white border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100">
            {sharedDocs.map((doc: { id: string; name: string; mime_type: string | null; size_bytes: number | null; entity_type: string; url: string | null }) => {
              const isImage = doc.mime_type?.startsWith('image/')
              return (
                <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                  {isImage
                    ? <Image className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    : <FileText className="w-4 h-4 text-stone-400 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{doc.name}</p>
                    <p className="text-xs text-stone-400 capitalize">{doc.entity_type === 'vendor' ? 'Contract' : doc.entity_type}</p>
                  </div>
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-rose-700 hover:text-rose-800 font-medium flex-shrink-0">
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Checklist by category */}
      {Object.keys(byCategory).length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Task checklist</p>
          {Object.entries(byCategory).map(([cat, catItems]) => {
            const catDone = catItems.filter(i => i.status === 'done').length
            const catPct  = Math.round((catDone / catItems.length) * 100)
            return (
              <div key={cat} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 px-4 py-2.5 bg-stone-50 border-b border-stone-100">
                  <p className="text-xs font-semibold text-stone-700 flex-1">{cat}</p>
                  <span className="text-xs text-stone-400">{catDone}/{catItems.length}</span>
                  <div className="w-16 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${catPct}%` }} />
                  </div>
                </div>
                <div className="divide-y divide-stone-50">
                  {catItems.map((item: CheckItem) => {
                    const overdue = item.due_date && item.due_date < today && item.status !== 'done'
                    return (
                      <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                        {item.status === 'done'
                          ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          : item.status === 'in_progress'
                          ? <CircleDot className="w-4 h-4 text-blue-400 flex-shrink-0" />
                          : <Circle className={`w-4 h-4 flex-shrink-0 ${overdue ? 'text-red-400' : 'text-stone-300'}`} />}
                        <span className={`flex-1 text-sm ${item.status === 'done' ? 'line-through text-stone-400' : overdue ? 'text-red-700' : 'text-stone-700'}`}>
                          {item.title}
                        </span>
                        {item.due_date && item.status !== 'done' && (
                          <span className={`text-xs flex-shrink-0 flex items-center gap-1 ${overdue ? 'text-red-500' : 'text-stone-400'}`}>
                            <Clock className="w-3 h-3" />{fmtDate(item.due_date)}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
