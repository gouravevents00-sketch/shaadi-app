'use client'

import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, ChevronRight, Sparkles, Circle, CircleDot, CircleCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { createItem, updateItem, deleteItem, loadTemplateItems } from './actions'

type Status = 'pending' | 'in_progress' | 'done'

interface Item {
  id: string
  title: string
  category: string
  status: Status
  due_date: string | null
  notes: string | null
  order: number
}

const STATUS_CYCLE: Record<Status, Status> = {
  pending: 'in_progress',
  in_progress: 'done',
  done: 'pending',
}

const STATUS_ICONS = {
  pending:     <Circle className="w-4 h-4 text-stone-300" />,
  in_progress: <CircleDot className="w-4 h-4 text-amber-400" />,
  done:        <CircleCheck className="w-4 h-4 text-emerald-500" />,
}

const EMPTY_FORM = { title: '', category: '', due_date: '', notes: '' }

export default function ChecklistClient({
  eventId,
  eventType,
  initialItems,
}: {
  eventId: string
  eventType: string
  initialItems: Item[]
}) {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Item | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function openCreate(category?: string) {
    setEditTarget(null)
    setForm({ ...EMPTY_FORM, category: category ?? '' })
    setOpen(true)
  }

  function openEdit(item: Item) {
    setEditTarget(item)
    setForm({ title: item.title, category: item.category, due_date: item.due_date ?? '', notes: item.notes ?? '' })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Title required'); return }
    if (!form.category.trim()) { toast.error('Category required'); return }
    setLoading(true)
    const payload = {
      title: form.title.trim(),
      category: form.category.trim(),
      due_date: form.due_date || null,
      notes: form.notes.trim() || null,
    }
    if (editTarget) {
      const res = await updateItem(eventId, editTarget.id, payload)
      if (res.error) { toast.error(res.error); setLoading(false); return }
      setItems(is => is.map(i => i.id === editTarget.id ? { ...i, ...payload } : i))
      toast.success('Updated')
    } else {
      const res = await createItem(eventId, payload)
      if (res.error) { toast.error(res.error); setLoading(false); return }
      setItems(is => [...is, { ...payload, id: res.id!, status: 'pending', order: is.length }])
      toast.success('Item added')
    }
    setLoading(false)
    setOpen(false)
  }

  async function handleDelete(id: string) {
    const res = await deleteItem(eventId, id)
    if (res.error) { toast.error(res.error); return }
    setItems(is => is.filter(i => i.id !== id))
    toast.success('Deleted')
  }

  async function handleStatusCycle(item: Item) {
    const next = STATUS_CYCLE[item.status]
    const res = await updateItem(eventId, item.id, { status: next })
    if (res.error) { toast.error(res.error); return }
    setItems(is => is.map(i => i.id === item.id ? { ...i, status: next } : i))
  }

  async function handleLoadTemplate() {
    if (items.length > 0) {
      const ok = confirm(`This will replace all ${items.length} existing items with the ${eventType} template. Continue?`)
      if (!ok) return
    }
    setTemplateLoading(true)
    const res = await loadTemplateItems(eventId, eventType)
    if (res.error) { toast.error(res.error); setTemplateLoading(false); return }
    toast.success(`${res.count} items loaded from template`)
    window.location.reload()
  }

  const grouped = useMemo(() => {
    const g: Record<string, Item[]> = {}
    items.forEach(i => { (g[i.category] ??= []).push(i) })
    return g
  }, [items])

  const categories = Object.keys(grouped).sort()
  const done = items.filter(i => i.status === 'done').length
  const progress = items.length ? Math.round((done / items.length) * 100) : 0

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Checklist</h1>
          <p className="text-stone-500 text-sm mt-0.5">{done}/{items.length} done{items.length > 0 ? ` · ${progress}%` : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleLoadTemplate}
            disabled={templateLoading}
            title={`Load ${eventType} template`}
          >
            <Sparkles className="w-4 h-4 mr-1.5 text-amber-500" />
            {templateLoading ? 'Loading…' : 'Load template'}
          </Button>
          <Button onClick={() => openCreate()} className="bg-stone-900 hover:bg-stone-800">
            <Plus className="w-4 h-4 mr-1.5" /> Add item
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {items.length > 0 && (
        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-stone-200 rounded-xl">
          <Sparkles className="w-10 h-10 text-amber-300 mx-auto mb-3" />
          <p className="text-stone-500 font-medium">No checklist items yet</p>
          <p className="text-stone-400 text-sm mt-1 mb-5">
            Load the built-in <span className="capitalize">{eventType}</span> template or add items manually.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={handleLoadTemplate} disabled={templateLoading}>
              <Sparkles className="w-4 h-4 mr-1.5 text-amber-500" />
              {templateLoading ? 'Loading…' : 'Load template'}
            </Button>
            <Button onClick={() => openCreate()} className="bg-stone-900 hover:bg-stone-800">
              <Plus className="w-4 h-4 mr-1.5" /> Add manually
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map(cat => {
            const catItems = grouped[cat]
            const catDone = catItems.filter(i => i.status === 'done').length
            const isCollapsed = collapsed.has(cat)
            return (
              <div key={cat} className="border border-stone-200 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 hover:bg-stone-100 transition-colors"
                  onClick={() => setCollapsed(c => {
                    const n = new Set(c); n.has(cat) ? n.delete(cat) : n.add(cat); return n
                  })}
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                    <span className="font-medium text-stone-800 text-sm">{cat}</span>
                    <span className="text-xs text-stone-400">{catDone}/{catItems.length}</span>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); openCreate(cat) }}
                    className="text-xs text-stone-400 hover:text-stone-700 flex items-center gap-1 px-2 py-1 rounded"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </button>

                {!isCollapsed && (
                  <ul>
                    {catItems.map(item => (
                      <li key={item.id} className="flex items-center gap-3 px-4 py-2.5 border-t border-stone-100 hover:bg-stone-50 group">
                        <button onClick={() => handleStatusCycle(item)} className="flex-shrink-0">
                          {STATUS_ICONS[item.status]}
                        </button>
                        <span
                          className={`flex-1 text-sm cursor-pointer ${item.status === 'done' ? 'line-through text-stone-400' : 'text-stone-800'}`}
                          onClick={() => openEdit(item)}
                        >
                          {item.title}
                        </span>
                        {item.due_date && (
                          <span className="text-xs text-stone-400 hidden group-hover:block">
                            {new Date(item.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-stone-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit item' : 'Add checklist item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Task *</Label>
              <Input placeholder="e.g. Confirm AV setup" value={form.title} onChange={e => setF('title', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Input placeholder="e.g. Venue & Logistics" value={form.category} onChange={e => setF('category', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Due date</Label>
              <Input type="date" value={form.due_date} onChange={e => setF('due_date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Any notes…" value={form.notes} onChange={e => setF('notes', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-stone-900 hover:bg-stone-800" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving…' : editTarget ? 'Update' : 'Add item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
