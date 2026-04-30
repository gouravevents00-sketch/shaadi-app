'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Clock, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createTimelineItem, updateTimelineItem, deleteTimelineItem, importFromAgenda, type TimelineItem } from './actions'

const CATEGORIES = ['Setup', 'Registration', 'Programme', 'Break', 'Meal', 'Performance', 'Ceremony', 'Networking', 'Wrap']
const CAT_COLORS: Record<string, string> = {
  Setup: 'bg-stone-100 text-stone-600',
  Registration: 'bg-blue-100 text-blue-700',
  Programme: 'bg-indigo-100 text-indigo-700',
  Break: 'bg-amber-100 text-amber-700',
  Meal: 'bg-orange-100 text-orange-700',
  Performance: 'bg-purple-100 text-purple-700',
  Ceremony: 'bg-rose-100 text-rose-700',
  Networking: 'bg-teal-100 text-teal-700',
  Wrap: 'bg-green-100 text-green-700',
}

type Form = { time: string; end_time: string; activity: string; owner: string; venue: string; category: string; notes: string }
const EMPTY: Form = { time: '', end_time: '', activity: '', owner: '', venue: '', category: 'Programme', notes: '' }

export default function TimelineClient({ eventId, initialItems, hasAgenda }: {
  eventId: string; initialItems: TimelineItem[]; hasAgenda: boolean
}) {
  const [items, setItems] = useState([...initialItems].sort((a, b) => a.time.localeCompare(b.time)))
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TimelineItem | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [isPending, startTransition] = useTransition()

  function openAdd() { setEditing(null); setForm(EMPTY); setDialogOpen(true) }
  function openEdit(item: TimelineItem) {
    setEditing(item)
    setForm({ time: item.time, end_time: item.end_time ?? '', activity: item.activity, owner: item.owner ?? '', venue: item.venue ?? '', category: item.category ?? 'Programme', notes: item.notes ?? '' })
    setDialogOpen(true)
  }

  function handleSave() {
    if (!form.time || !form.activity) { toast.error('Time and activity required'); return }
    startTransition(async () => {
      const payload = { time: form.time, end_time: form.end_time || undefined, activity: form.activity, owner: form.owner || undefined, venue: form.venue || undefined, category: form.category || undefined, notes: form.notes || undefined }
      const stateUpdate: Partial<TimelineItem> = { time: form.time, end_time: form.end_time || null, activity: form.activity, owner: form.owner || null, venue: form.venue || null, category: form.category || null, notes: form.notes || null }
      if (editing) {
        const res = await updateTimelineItem(eventId, editing.id, payload)
        if ('error' in res) { toast.error(res.error); return }
        setItems(prev => prev.map(i => i.id === editing.id ? { ...i, ...stateUpdate } : i).sort((a, b) => a.time.localeCompare(b.time)))
        toast.success('Updated')
      } else {
        const res = await createTimelineItem(eventId, payload)
        if ('error' in res) { toast.error(res.error); return }
        const newItem: TimelineItem = { id: res.id, org_event_id: eventId, created_at: new Date().toISOString(), order: 0, time: stateUpdate.time!, end_time: stateUpdate.end_time ?? null, activity: stateUpdate.activity!, owner: stateUpdate.owner ?? null, venue: stateUpdate.venue ?? null, category: stateUpdate.category ?? null, notes: stateUpdate.notes ?? null }
        setItems(prev => [...prev, newItem].sort((a, b) => a.time.localeCompare(b.time)))
        toast.success('Item added')
      }
      setDialogOpen(false)
    })
  }

  function handleImport() {
    startTransition(async () => {
      const res = await importFromAgenda(eventId)
      if ('error' in res) { toast.error(res.error); return }
      toast.success(`Imported ${res.created} items from agenda — refresh to see`)
    })
  }

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Run of Show</h1>
          <p className="text-sm text-stone-500 mt-0.5">{items.length} items · minute-by-minute timeline</p>
        </div>
        <div className="flex gap-2">
          {hasAgenda && items.length === 0 && (
            <Button variant="outline" size="sm" onClick={handleImport} disabled={isPending}>
              <Download className="w-4 h-4 mr-1.5" /> Import from Agenda
            </Button>
          )}
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Item
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <Clock className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No timeline items yet</p>
          <p className="text-sm mt-1">Add items manually or import from agenda</p>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-[88px] top-0 bottom-0 w-px bg-stone-200" />
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="flex gap-4 group">
                <div className="w-20 flex-shrink-0 text-right">
                  <p className="text-sm font-mono font-medium text-stone-700">{item.time}</p>
                  {item.end_time && <p className="text-xs text-stone-400 font-mono">{item.end_time}</p>}
                </div>
                {/* Dot */}
                <div className="relative flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow mt-1.5" />
                </div>
                <div className={cn('flex-1 bg-white rounded-xl border border-stone-200 p-3 hover:border-blue-200 transition-colors', 'cursor-pointer')} onClick={() => openEdit(item)}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="font-medium text-stone-900">{item.activity}</p>
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {item.category && <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', CAT_COLORS[item.category] ?? 'bg-stone-100 text-stone-600')}>{item.category}</span>}
                        {item.owner && <span className="text-xs text-stone-400">Owner: {item.owner}</span>}
                        {item.venue && <span className="text-xs text-stone-400">· {item.venue}</span>}
                      </div>
                      {item.notes && <p className="text-xs text-stone-400 mt-1">{item.notes}</p>}
                    </div>
                    <button onClick={e => { e.stopPropagation(); setItems(prev => prev.filter(x => x.id !== item.id)); deleteTimelineItem(eventId, item.id) }} className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Item' : 'Add Timeline Item'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Time *</Label><Input value={form.time} onChange={f('time')} placeholder="09:00 AM" className="mt-1" /></div>
              <div><Label>End Time</Label><Input value={form.end_time} onChange={f('end_time')} placeholder="09:30 AM" className="mt-1" /></div>
            </div>
            <div><Label>Activity *</Label><Input value={form.activity} onChange={f('activity')} placeholder="e.g. Opening ceremony" className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <select value={form.category} onChange={f('category')} className="mt-1 w-full border border-stone-200 rounded-md px-2 py-1.5 text-sm">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div><Label>Owner / Responsible</Label><Input value={form.owner} onChange={f('owner')} placeholder="e.g. Stage Manager" className="mt-1" /></div>
            </div>
            <div><Label>Venue / Stage</Label><Input value={form.venue} onChange={f('venue')} className="mt-1" /></div>
            <div><Label>Notes</Label><textarea value={form.notes} onChange={f('notes')} rows={2} className="mt-1 w-full border border-stone-200 rounded-md px-3 py-2 text-sm resize-none" /></div>
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
