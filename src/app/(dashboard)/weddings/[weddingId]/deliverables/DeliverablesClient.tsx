'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Printer, Heart, Gift, IndianRupee, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { addGift, deleteGift } from './actions'
import type { WishGuest, GiftRecord } from './page'

type Tab = 'wishes' | 'gifts'

const SIDE_LABELS: Record<string, string> = { bride: 'Bride', groom: 'Groom', both: 'Both', neutral: '' }

export default function DeliverablesClient({ weddingId, coupleName, wishes, initialGifts, events }: {
  weddingId: string
  coupleName: string
  wishes: WishGuest[]
  initialGifts: GiftRecord[]
  events: { id: string; name: string; date: string }[]
}) {
  const [tab, setTab] = useState<Tab>('wishes')
  const [gifts, setGifts] = useState<GiftRecord[]>(initialGifts)
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({
    giver_name: '', gift_type: 'cash', amount: '', description: '',
    received_at: new Date().toISOString().slice(0, 10), event_id: '', notes: ''
  })
  const [loading, setLoading] = useState(false)

  const totalCash = gifts.filter(g => g.gift_type === 'cash').reduce((s, g) => s + Number(g.amount ?? 0), 0)
  const fmt = (n: number) => n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : n >= 1000 ? `₹${(n/1000).toFixed(1)}K` : `₹${n}`

  async function handleAddGift() {
    if (!form.giver_name.trim()) { toast.error('Enter giver name'); return }
    setLoading(true)
    const res = await addGift(weddingId, {
      giver_name: form.giver_name.trim(),
      gift_type: form.gift_type,
      amount: form.gift_type === 'cash' && form.amount ? parseFloat(form.amount) : undefined,
      description: form.description || undefined,
      received_at: form.received_at,
      event_id: form.event_id || undefined,
      notes: form.notes || undefined,
    })
    setLoading(false)
    if (res.error) { toast.error(res.error); return }
    setGifts(prev => [{ id: res.id!, wedding_id: weddingId, guest_id: null, giver_name: form.giver_name.trim(),
      gift_type: form.gift_type, amount: form.gift_type === 'cash' ? parseFloat(form.amount) || 0 : null,
      description: form.description || null, received_at: form.received_at,
      event_id: form.event_id || null, notes: form.notes || null }, ...prev])
    toast.success('Gift recorded')
    setAddOpen(false)
    setForm({ giver_name: '', gift_type: 'cash', amount: '', description: '', received_at: new Date().toISOString().slice(0, 10), event_id: '', notes: '' })
  }

  async function handleDelete(giftId: string) {
    setGifts(prev => prev.filter(g => g.id !== giftId))
    const res = await deleteGift(weddingId, giftId)
    if (res.error) toast.error(res.error)
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Deliverables</h1>
          <p className="text-stone-400 text-sm mt-0.5">Wishes from guests · Gift tracker</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-stone-100 rounded-xl mb-6 w-fit">
        {([
          { key: 'wishes', label: 'Wishes', icon: Heart, count: wishes.length },
          { key: 'gifts', label: 'Gifts', icon: Gift, count: gifts.length },
        ] as { key: Tab; label: string; icon: React.ElementType; count: number }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}>
            <t.icon className="w-4 h-4" />{t.label}
            {t.count > 0 && <span className="text-xs bg-stone-200 text-stone-600 rounded-full px-1.5">{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ── Wishes Tab ─────────────────────────────────────────── */}
      {tab === 'wishes' && (
        <div>
          {wishes.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-stone-200 rounded-xl">
              <Heart className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-stone-400 text-sm">No wishes yet — guests can share them via RSVP</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-stone-500">{wishes.length} guest{wishes.length !== 1 ? 's' : ''} shared wishes</p>
                <Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden">
                  <Printer className="w-3.5 h-3.5 mr-1.5" /> Print / PDF
                </Button>
              </div>

              {/* Print header (visible only when printing) */}
              <div className="hidden print:block mb-8 text-center">
                <h1 className="text-2xl font-bold">{coupleName}</h1>
                <p className="text-stone-500 mt-1">Wishes from our loved ones</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {wishes.map(w => (
                  <div key={w.id} className="bg-white border border-stone-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-stone-800 text-sm">{w.name}</p>
                      {SIDE_LABELS[w.side] && (
                        <span className="text-xs text-stone-400">{SIDE_LABELS[w.side]}'s side</span>
                      )}
                    </div>
                    <p className="text-sm text-stone-600 italic">&ldquo;{w.wishes_message}&rdquo;</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Gifts Tab ──────────────────────────────────────────── */}
      {tab === 'gifts' && (
        <div>
          {/* Summary */}
          {gifts.length > 0 && (
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <p className="text-xs text-emerald-600 font-medium">Total Cash</p>
                <p className="text-xl font-semibold text-emerald-800">{fmt(totalCash)}</p>
              </div>
              <div className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-3">
                <p className="text-xs text-stone-500 font-medium">Total gifts</p>
                <p className="text-xl font-semibold text-stone-700">{gifts.length}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end mb-4">
            <Button onClick={() => setAddOpen(true)} className="bg-rose-700 hover:bg-rose-800">
              <Plus className="w-4 h-4 mr-1.5" /> Record gift
            </Button>
          </div>

          {gifts.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-stone-200 rounded-xl">
              <Gift className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-stone-400 text-sm">No gifts recorded yet — start tracking on the day</p>
            </div>
          ) : (
            <div className="space-y-2">
              {gifts.map(g => {
                const ev = events.find(e => e.id === g.event_id)
                return (
                  <div key={g.id} className="bg-white border border-stone-200 rounded-xl px-4 py-3 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${g.gift_type === 'cash' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                      {g.gift_type === 'cash' ? <IndianRupee className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-800 text-sm">{g.giver_name}</p>
                      <p className="text-xs text-stone-400">
                        {g.gift_type === 'cash' && g.amount ? fmt(Number(g.amount)) : g.description ?? g.gift_type}
                        {ev ? ` · ${ev.name}` : ''}
                        {g.received_at ? ` · ${new Date(g.received_at + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                      </p>
                    </div>
                    <button onClick={() => handleDelete(g.id)} className="text-stone-300 hover:text-red-400 flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Add Gift Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Record gift</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Giver name *</Label>
              <Input className="mt-1 h-9 text-sm" placeholder="e.g. Sharma ji" value={form.giver_name}
                onChange={e => setForm(f => ({ ...f, giver_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.gift_type} onValueChange={v => setForm(f => ({ ...f, gift_type: v ?? 'cash' }))}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash / Cheque</SelectItem>
                    <SelectItem value="item">Gift item</SelectItem>
                    <SelectItem value="card">Gift card</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.gift_type === 'cash' ? (
                <div>
                  <Label className="text-xs">Amount (₹)</Label>
                  <Input type="number" className="mt-1 h-9 text-sm" placeholder="e.g. 5100" value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
              ) : (
                <div>
                  <Label className="text-xs">Description</Label>
                  <Input className="mt-1 h-9 text-sm" placeholder="e.g. Silver set" value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Received on</Label>
                <Input type="date" className="mt-1 h-9 text-sm" value={form.received_at}
                  onChange={e => setForm(f => ({ ...f, received_at: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Event (optional)</Label>
                <Select value={form.event_id} onValueChange={v => setForm(f => ({ ...f, event_id: v ?? '' }))}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Any event" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any event</SelectItem>
                    {events.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Input className="mt-1 h-9 text-sm" value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="bg-rose-700 hover:bg-rose-800" onClick={handleAddGift} disabled={loading}>
              {loading ? 'Saving…' : 'Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
