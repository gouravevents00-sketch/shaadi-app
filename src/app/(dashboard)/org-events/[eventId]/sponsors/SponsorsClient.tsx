'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createSponsor, updateSponsor, deleteSponsor, type SponsorRow } from './actions'

const TIERS = [
  { value: 'title', label: 'Title Sponsor', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'co_presenting', label: 'Co-Presenting', color: 'bg-orange-100 text-orange-800' },
  { value: 'powered_by', label: 'Powered By', color: 'bg-blue-100 text-blue-800' },
  { value: 'associate', label: 'Associate', color: 'bg-purple-100 text-purple-800' },
  { value: 'supported_by', label: 'Supported By', color: 'bg-green-100 text-green-800' },
  { value: 'in_association', label: 'In Association', color: 'bg-stone-100 text-stone-800' },
]

type Form = { name: string; tier: string; contact_name: string; contact_phone: string; contact_email: string; amount: string; amount_received: string; deliverables: string; notes: string }
const EMPTY: Form = { name: '', tier: 'associate', contact_name: '', contact_phone: '', contact_email: '', amount: '', amount_received: '', deliverables: '', notes: '' }

export default function SponsorsClient({ eventId, initialSponsors }: { eventId: string; initialSponsors: SponsorRow[] }) {
  const [sponsors, setSponsors] = useState(initialSponsors)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SponsorRow | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [isPending, startTransition] = useTransition()

  const totalAmount = sponsors.reduce((s, x) => s + (x.amount ?? 0), 0)
  const totalReceived = sponsors.reduce((s, x) => s + (x.amount_received ?? 0), 0)

  function openAdd() { setEditing(null); setForm(EMPTY); setDialogOpen(true) }
  function openEdit(s: SponsorRow) {
    setEditing(s)
    setForm({ name: s.name, tier: s.tier ?? 'associate', contact_name: s.contact_name ?? '', contact_phone: s.contact_phone ?? '', contact_email: s.contact_email ?? '', amount: s.amount?.toString() ?? '', amount_received: s.amount_received?.toString() ?? '', deliverables: s.deliverables ?? '', notes: s.notes ?? '' })
    setDialogOpen(true)
  }

  function handleSave() {
    if (!form.name.trim()) { toast.error('Name required'); return }
    startTransition(async () => {
      const payload = { name: form.name, tier: form.tier as SponsorRow['tier'] || undefined, contact_name: form.contact_name || undefined, contact_phone: form.contact_phone || undefined, contact_email: form.contact_email || undefined, amount: form.amount ? Number(form.amount) : undefined, amount_received: form.amount_received ? Number(form.amount_received) : undefined, deliverables: form.deliverables || undefined, notes: form.notes || undefined }
      const stateUpdate: Partial<SponsorRow> = { name: form.name, tier: (form.tier as SponsorRow['tier']) || null, contact_name: form.contact_name || null, contact_phone: form.contact_phone || null, contact_email: form.contact_email || null, amount: form.amount ? Number(form.amount) : null, amount_received: form.amount_received ? Number(form.amount_received) : null, deliverables: form.deliverables || null, notes: form.notes || null }
      if (editing) {
        const res = await updateSponsor(eventId, editing.id, payload)
        if ('error' in res) { toast.error(res.error); return }
        setSponsors(prev => prev.map(s => s.id === editing.id ? { ...s, ...stateUpdate } : s))
        toast.success('Updated')
      } else {
        const res = await createSponsor(eventId, payload)
        if ('error' in res) { toast.error(res.error); return }
        const newS: SponsorRow = { id: res.id, org_event_id: eventId, created_at: new Date().toISOString(), logo_url: null, name: stateUpdate.name!, tier: stateUpdate.tier ?? null, contact_name: stateUpdate.contact_name ?? null, contact_phone: stateUpdate.contact_phone ?? null, contact_email: stateUpdate.contact_email ?? null, amount: stateUpdate.amount ?? null, amount_received: stateUpdate.amount_received ?? null, deliverables: stateUpdate.deliverables ?? null, notes: stateUpdate.notes ?? null }
        setSponsors(prev => [...prev, newS])
        toast.success('Sponsor added')
      }
      setDialogOpen(false)
    })
  }

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Sponsors</h1>
          <p className="text-sm text-stone-500 mt-0.5">{sponsors.length} sponsors · ₹{totalAmount.toLocaleString('en-IN')} committed · ₹{totalReceived.toLocaleString('en-IN')} received</p>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Sponsor
        </Button>
      </div>

      {sponsors.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <Trophy className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No sponsors added yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {TIERS.map(tier => {
            const group = sponsors.filter(s => s.tier === tier.value)
            if (!group.length) return null
            return (
              <div key={tier.value}>
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">{tier.label}</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {group.map(s => {
                    const due = (s.amount ?? 0) - (s.amount_received ?? 0)
                    return (
                      <div key={s.id} className="bg-white rounded-xl border border-stone-200 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <button onClick={() => openEdit(s)} className="font-semibold text-stone-900 hover:text-blue-600 text-left">{s.name}</button>
                            {s.contact_name && <p className="text-xs text-stone-400 mt-0.5">{s.contact_name}{s.contact_phone ? ` · ${s.contact_phone}` : ''}</p>}
                          </div>
                          <button onClick={() => { setSponsors(prev => prev.filter(x => x.id !== s.id)); deleteSponsor(eventId, s.id) }} className="text-stone-300 hover:text-red-500">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {s.amount != null && (
                          <div className="flex gap-3 mt-2 text-sm">
                            <span className="text-stone-600">₹{s.amount.toLocaleString('en-IN')}</span>
                            <span className="text-green-600">Rcvd: ₹{(s.amount_received ?? 0).toLocaleString('en-IN')}</span>
                            {due > 0 && <span className="text-red-500">Due: ₹{due.toLocaleString('en-IN')}</span>}
                          </div>
                        )}
                        {s.deliverables && <p className="text-xs text-stone-400 mt-2">{s.deliverables}</p>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Sponsor' : 'Add Sponsor'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name *</Label><Input value={form.name} onChange={f('name')} className="mt-1" /></div>
              <div>
                <Label>Tier</Label>
                <select value={form.tier} onChange={f('tier')} className="mt-1 w-full border border-stone-200 rounded-md px-2 py-1.5 text-sm">
                  {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Contact Person</Label><Input value={form.contact_name} onChange={f('contact_name')} className="mt-1" /></div>
              <div><Label>Phone</Label><Input value={form.contact_phone} onChange={f('contact_phone')} className="mt-1" /></div>
              <div><Label>Email</Label><Input value={form.contact_email} onChange={f('contact_email')} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Amount Committed (₹)</Label><Input type="number" value={form.amount} onChange={f('amount')} className="mt-1" /></div>
              <div><Label>Amount Received (₹)</Label><Input type="number" value={form.amount_received} onChange={f('amount_received')} className="mt-1" /></div>
            </div>
            <div><Label>Deliverables</Label><textarea value={form.deliverables} onChange={f('deliverables')} rows={2} placeholder="Logo on backdrop, 2 passes, social media mention..." className="mt-1 w-full border border-stone-200 rounded-md px-3 py-2 text-sm resize-none" /></div>
            <div><Label>Notes</Label><Input value={form.notes} onChange={f('notes')} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">{editing ? 'Save' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
