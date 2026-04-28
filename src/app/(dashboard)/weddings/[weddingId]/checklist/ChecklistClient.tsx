'use client'

import { useState, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, ChevronRight, Sparkles, Circle, CircleDot, CircleCheck, CalendarDays, StickyNote, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { createItem, updateItem, deleteItem, bulkCreateItems, bookVendor } from './actions'
import { saveCurrentAsTemplate } from '../../../dashboard/templates/actions'

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = 'pending' | 'in_progress' | 'done'
type Side = 'bride' | 'groom' | 'shared'

interface Item {
  id: string
  title: string
  category: string
  side: Side
  status: Status
  due_date: string | null
  notes: string | null
  order: number
}

// ─── Booking task detection ───────────────────────────────────────────────────

const BOOKING_PREFIXES = ['book ', 'confirm ', 'hire ', 'finalise ', 'finalize ', 'block ', 'arrange ', 'plan ']
const isBookingTask = (title: string) =>
  BOOKING_PREFIXES.some(p => title.toLowerCase().startsWith(p))

// ─── Template ─────────────────────────────────────────────────────────────────

const TEMPLATE: { category: string; side: Side; tasks: string[] }[] = [
  { category: 'Venue & Decor', side: 'shared', tasks: [
    'Confirm main venue booking and payment schedule',
    'Finalize mandap / stage design',
    'Book floral decorator',
    'Confirm lighting and furniture setup',
    'Plan entrance and pathway decor',
    'Arrange photo booth / backdrop',
  ]},
  { category: 'Catering', side: 'shared', tasks: [
    'Finalise menu with caterer',
    'Confirm guest count for each meal',
    'Arrange Jain / special dietary options',
    'Plan bar and mocktail setup',
    'Confirm crockery and service staff',
  ]},
  { category: 'Photography & Video', side: 'shared', tasks: [
    'Book photographer',
    'Book videographer / cinematographer',
    'Share shot list and family details',
    'Plan pre-wedding shoot',
    'Confirm drone permissions if needed',
  ]},
  { category: 'Guest Management', side: 'shared', tasks: [
    'Finalise guest list',
    'Send invitations',
    'Track RSVPs',
    'Arrange airport / station pickups',
    'Prepare and distribute welcome kits',
    'Confirm room allocations',
  ]},
  { category: 'Logistics & Travel', side: 'shared', tasks: [
    'Block hotel rooms',
    'Arrange guest transport (buses / cabs)',
    'Plan baraat route and logistics',
    'Confirm parking arrangements',
  ]},
  { category: 'Entertainment', side: 'shared', tasks: [
    'Book DJ / live band',
    'Plan sangeet performances',
    'Book emcee / anchor',
    'Arrange kids entertainment if needed',
  ]},
  { category: 'Rituals & Ceremonies', side: 'shared', tasks: [
    'Book pandit / priest',
    'Prepare puja samagri list',
    'Confirm ritual timings with pandit',
    'Arrange haldi and other ceremony supplies',
  ]},
  { category: 'Bride Prep', side: 'bride', tasks: [
    'Book mehendi artist',
    'Confirm bridal makeup artist',
    'Book hair stylist',
    'Finalise bridal look and run trial',
    'Coordinate bridal party outfits',
  ]},
  { category: 'Groom Prep', side: 'groom', tasks: [
    'Book sehra and baraat accessories',
    'Confirm groom grooming / makeup',
    'Coordinate groomsmen outfits',
  ]},
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_NEXT: Record<Status, Status> = {
  pending: 'in_progress', in_progress: 'done', done: 'pending',
}

const SIDE_COLORS: Record<Side, string> = {
  bride:  'bg-rose-50 text-rose-700',
  groom:  'bg-blue-50 text-blue-700',
  shared: 'bg-stone-100 text-stone-500',
}

function isOverdue(due: string | null) {
  if (!due) return false
  return new Date(due + 'T00:00:00') < new Date(new Date().toDateString())
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ─── Status icon ──────────────────────────────────────────────────────────────

function StatusIcon({ status }: { status: Status }) {
  if (status === 'done')        return <CircleCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
  if (status === 'in_progress') return <CircleDot   className="w-4 h-4 text-blue-500 flex-shrink-0" />
  return <Circle className="w-4 h-4 text-stone-300 flex-shrink-0" />
}

// ─── Inline booking capture ───────────────────────────────────────────────────

function BookingCapture({ item, onSave, onSkip }: {
  item: Item
  onSave: (vendor: { name: string; phone: string; amount: string }, notes: string) => void
  onSkip: () => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState(item.notes ?? '')
  const nameRef = useRef<HTMLInputElement>(null)

  // Auto-focus name on mount
  useMemo(() => { setTimeout(() => nameRef.current?.focus(), 50) }, [])

  function handleSave() {
    if (!name.trim()) { onSkip(); return }
    onSave({ name: name.trim(), phone: phone.trim(), amount }, notes.trim())
  }

  return (
    <div className="mx-4 mb-3 rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2">
      <div className="flex items-center gap-1.5 mb-2">
        <Building2 className="w-3.5 h-3.5 text-blue-500" />
        <span className="text-xs font-semibold text-blue-700">Who did you book?</span>
        <span className="text-xs text-blue-400 ml-auto">optional — skip if not decided yet</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input
          ref={nameRef}
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onSkip() }}
          placeholder="Vendor / contact name"
          className="col-span-2 text-sm bg-white border border-blue-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-300 placeholder-stone-400"
        />
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onSkip() }}
          placeholder="Phone (optional)"
          className="text-sm bg-white border border-blue-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-300 placeholder-stone-400"
        />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <input
          value={amount}
          type="number"
          onChange={e => setAmount(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onSkip() }}
          placeholder="₹ Amount"
          className="text-sm bg-white border border-blue-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-300 placeholder-stone-400"
        />
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') onSkip() }}
          placeholder="Notes (optional)"
          className="col-span-2 text-sm bg-white border border-blue-200 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-300 placeholder-stone-400"
        />
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button onClick={onSkip} className="text-xs text-stone-400 hover:text-stone-600 px-3 py-1.5 rounded-lg transition-colors">
          Skip for now
        </button>
        <button
          onClick={handleSave}
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors font-medium">
          {name.trim() ? 'Save vendor & continue →' : 'Mark as booked →'}
        </button>
      </div>
    </div>
  )
}

// ─── Inline due date ──────────────────────────────────────────────────────────

function DueDateCell({ value, onSave }: { value: string | null; onSave: (v: string | null) => void }) {
  const [editing, setEditing] = useState(false)

  if (editing) return (
    <input
      autoFocus
      type="date"
      defaultValue={value ?? ''}
      onBlur={e => { setEditing(false); onSave(e.target.value || null) }}
      onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }}
      className="text-xs border border-stone-300 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-rose-300 bg-white w-28"
    />
  )

  return (
    <button onClick={() => setEditing(true)}
      className={`text-xs flex items-center gap-1 flex-shrink-0 transition-colors hover:text-rose-600 ${
        value && isOverdue(value) ? 'text-red-500 font-medium' : value ? 'text-stone-400' : 'text-stone-200 hover:text-stone-400'
      }`}>
      <CalendarDays className="w-3 h-3" />
      {value ? fmtDate(value) : ''}
    </button>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface CompanyTemplate {
  id: string; name: string
  items: { title: string; category: string; side: Side }[]
}

export default function ChecklistClient({
  weddingId, initialItems, companyTemplates = [],
}: {
  weddingId: string
  initialItems: Item[]
  companyTemplates?: CompanyTemplate[]
}) {
  const [items, setItems] = useState<Item[]>(initialItems)
  const [sideFilter, setSideFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [capturingId, setCapturingId] = useState<string | null>(null) // booking capture open for this item
  const [pendingStatus, setPendingStatus] = useState<Record<string, Status>>({}) // next status waiting for capture

  const [addingCat, setAddingCat] = useState<string | null>(null)
  const [addTitle, setAddTitle] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [editNotes, setEditNotes] = useState('')

  const [newCatOpen, setNewCatOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  const [templateOpen, setTemplateOpen] = useState(false)
  const [templateTab, setTemplateTab] = useState<'builtin' | 'saved'>('builtin')
  const [selectedCompanyTpl, setSelectedCompanyTpl] = useState<string | null>(null)
  const [templateSelected, setTemplateSelected] = useState<Record<string, boolean>>({})
  const [templateLoading, setTemplateLoading] = useState(false)
  const [saveAsTemplateOpen, setSaveAsTemplateOpen] = useState(false)
  const [saveTemplateName, setSaveTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  // ─── Derived ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => items.filter(i => {
    if (sideFilter !== 'all' && i.side !== sideFilter) return false
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    return true
  }), [items, sideFilter, statusFilter])

  const categories = useMemo(() => Array.from(new Set(items.map(i => i.category))), [items])

  const byCategory = useMemo(() => {
    const map: Record<string, Item[]> = {}
    filtered.forEach(i => {
      if (!map[i.category]) map[i.category] = []
      map[i.category].push(i)
    })
    // Sort: overdue first, then by due_date, then pending/in-progress before done
    for (const cat of Object.keys(map)) {
      map[cat].sort((a, b) => {
        const aOver = isOverdue(a.due_date) && a.status !== 'done'
        const bOver = isOverdue(b.due_date) && b.status !== 'done'
        if (aOver && !bOver) return -1
        if (!aOver && bOver) return 1
        if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
        if (a.due_date && !b.due_date) return -1
        if (!a.due_date && b.due_date) return 1
        return 0
      })
    }
    return map
  }, [filtered])

  const stats = useMemo(() => ({
    total: items.length,
    done: items.filter(i => i.status === 'done').length,
    inProgress: items.filter(i => i.status === 'in_progress').length,
    overdue: items.filter(i => i.status !== 'done' && isOverdue(i.due_date)).length,
  }), [items])

  // ─── Status toggle ────────────────────────────────────────────────────────

  function handleStatusToggle(item: Item) {
    const next = STATUS_NEXT[item.status]
    // Show booking capture when advancing a booking task (not when cycling back to pending)
    if (next !== 'pending' && isBookingTask(item.title)) {
      setPendingStatus(p => ({ ...p, [item.id]: next }))
      setCapturingId(item.id)
      return
    }
    // Otherwise advance immediately
    applyStatusChange(item, next, item.notes)
  }

  async function applyStatusChange(item: Item, next: Status, notes: string | null) {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: next, notes } : i))
    const result = await updateItem(weddingId, item.id, { status: next, notes })
    if (result.error) {
      toast.error(result.error)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: item.status, notes: item.notes } : i))
    }
  }

  async function handleBookingSkip(item: Item) {
    const next = pendingStatus[item.id] ?? STATUS_NEXT[item.status]
    setCapturingId(null)
    await applyStatusChange(item, next, item.notes)
  }

  async function handleBookingSave(item: Item, vendor: { name: string; phone: string; amount: string }, notes: string) {
    const next = pendingStatus[item.id] ?? STATUS_NEXT[item.status]
    setCapturingId(null)

    // Optimistic update
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: next, notes: notes || i.notes } : i))

    const result = await bookVendor(weddingId, item.id, {
      status: next,
      notes: notes || item.notes || '',
      vendor: {
        name: vendor.name,
        category: item.category,
        phone: vendor.phone || undefined,
        total_amount: parseFloat(vendor.amount) || 0,
      },
    })

    if (result.error) {
      toast.error(result.error)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: item.status, notes: item.notes } : i))
    } else {
      toast.success(`${vendor.name} added as vendor`)
    }
  }

  // ─── Other actions ────────────────────────────────────────────────────────

  function startAdd(category: string) {
    setAddingCat(category)
    setAddTitle('')
    setTimeout(() => addInputRef.current?.focus(), 50)
  }

  async function commitAdd() {
    if (!addTitle.trim() || !addingCat) { setAddingCat(null); return }
    const title = addTitle.trim()
    setAddTitle('')
    setAddingCat(null)
    const result = await createItem(weddingId, { title, category: addingCat, side: 'shared', due_date: null, notes: null })
    if (result.error) { toast.error(result.error); return }
    setItems(prev => [...prev, { id: result.id!, title, category: addingCat!, side: 'shared', status: 'pending', due_date: null, notes: null, order: prev.length }])
  }

  function startEdit(item: Item) {
    setEditingId(item.id)
    setEditTitle(item.title)
    setTimeout(() => editInputRef.current?.focus(), 50)
  }

  async function commitEdit(item: Item) {
    if (!editTitle.trim()) { setEditingId(null); return }
    const title = editTitle.trim()
    setEditingId(null)
    if (title === item.title) return
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, title } : i))
    const result = await updateItem(weddingId, item.id, { title })
    if (result.error) { toast.error(result.error); setItems(prev => prev.map(i => i.id === item.id ? { ...i, title: item.title } : i)) }
  }

  async function handleDelete(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
    await deleteItem(weddingId, id)
  }

  async function handleCycleSide(item: Item) {
    const next: Side = item.side === 'shared' ? 'bride' : item.side === 'bride' ? 'groom' : 'shared'
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, side: next } : i))
    await updateItem(weddingId, item.id, { side: next })
  }

  async function handleDueDateSave(item: Item, val: string | null) {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, due_date: val } : i))
    await updateItem(weddingId, item.id, { due_date: val })
  }

  async function handleNotesSave(item: Item) {
    const notes = editNotes.trim() || null
    setEditingNotesId(null)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, notes } : i))
    await updateItem(weddingId, item.id, { notes })
  }

  // ─── New category ─────────────────────────────────────────────────────────

  function handleNewCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newCatName.trim()) return
    const cat = newCatName.trim()
    setNewCatName('')
    setNewCatOpen(false)
    startAdd(cat)
    setItems(prev => [...prev, { id: `__placeholder_${cat}`, title: '', category: cat, side: 'shared', status: 'pending', due_date: null, notes: null, order: prev.length }])
  }

  // ─── Template loader ──────────────────────────────────────────────────────

  function toggleTemplateGroup(category: string, tasks: string[]) {
    const keys = tasks.map(t => `${category}::${t}`)
    const allOn = keys.every(k => templateSelected[k])
    const next = { ...templateSelected }
    keys.forEach(k => { next[k] = !allOn })
    setTemplateSelected(next)
  }

  async function handleLoadTemplate() {
    let toCreate: { title: string; category: string; side: Side }[] = []

    if (templateTab === 'builtin') {
      TEMPLATE.forEach(group => {
        group.tasks.forEach(t => {
          if (templateSelected[`${group.category}::${t}`]) toCreate.push({ title: t, category: group.category, side: group.side })
        })
      })
    } else {
      const tpl = companyTemplates.find(t => t.id === selectedCompanyTpl)
      if (!tpl) { toast.error('Select a template'); return }
      const keys = Object.entries(templateSelected).filter(([, v]) => v).map(([k]) => k)
      toCreate = tpl.items.filter(i => keys.includes(`${i.category}::${i.title}`))
    }

    if (toCreate.length === 0) { toast.error('Select at least one task'); return }
    const existing = new Set(items.map(i => `${i.category}::${i.title}`))
    const fresh = toCreate.filter(t => !existing.has(`${t.category}::${t.title}`))
    if (fresh.length === 0) { toast.error('All selected tasks already exist'); return }
    setTemplateLoading(true)
    const result = await bulkCreateItems(weddingId, fresh)
    if (result.error) { toast.error(result.error); setTemplateLoading(false); return }
    toast.success(`${fresh.length} tasks added`)
    setTemplateOpen(false)
    setTemplateSelected({})
    window.location.reload()
  }

  async function handleSaveAsTemplate() {
    if (!saveTemplateName.trim()) return
    setSavingTemplate(true)
    const res = await saveCurrentAsTemplate(weddingId, saveTemplateName.trim())
    if ('error' in res) { toast.error(res.error); setSavingTemplate(false); return }
    toast.success('Template saved')
    setSaveAsTemplateOpen(false)
    setSaveTemplateName('')
    setSavingTemplate(false)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const SIDE_FILTERS = ['all', 'shared', 'bride', 'groom']
  const STATUS_FILTERS = ['all', 'pending', 'in_progress', 'done']
  const shownCategories = Object.keys(byCategory).sort()

  return (
    <div className="p-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Checklist</h1>
          <p className="text-stone-500 text-sm mt-1">
            {stats.done}/{stats.total} done
            {stats.inProgress > 0 && ` · ${stats.inProgress} in progress`}
            {stats.overdue > 0 && <span className="text-red-500"> · {stats.overdue} overdue</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setTemplateSelected({}); setTemplateOpen(true) }}>
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Load template
          </Button>
          {items.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setSaveAsTemplateOpen(true)}>
              Save as template
            </Button>
          )}
          <Button size="sm" className="bg-rose-700 hover:bg-rose-800" onClick={() => setNewCatOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add category
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      {stats.total > 0 && (
        <div className="h-1.5 bg-stone-100 rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(stats.done / stats.total) * 100}%` }} />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex gap-1">
          {SIDE_FILTERS.map(f => (
            <button key={f} onClick={() => setSideFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${sideFilter === f ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {STATUS_FILTERS.map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                statusFilter === f ? f === 'done' ? 'bg-green-600 text-white' : f === 'in_progress' ? 'bg-blue-600 text-white' : 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100'
              }`}>
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state */}
      {items.length === 0 && (
        <div className="text-center py-20 border border-dashed border-stone-200 rounded-xl">
          <p className="text-stone-500 font-medium">No tasks yet</p>
          <p className="text-stone-400 text-sm mt-1">Start from a template or add your own categories</p>
          <Button variant="outline" className="mt-4" onClick={() => { setTemplateSelected({}); setTemplateOpen(true) }}>
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Load template
          </Button>
        </div>
      )}

      {/* Category groups */}
      <div className="space-y-4">
        {shownCategories.map(cat => {
          const catItems = byCategory[cat]
          const allCatItems = items.filter(i => i.category === cat)
          const doneCount = allCatItems.filter(i => i.status === 'done').length
          const isCollapsed = collapsed[cat]

          return (
            <div key={cat} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 transition-colors text-left">
                <div className="flex items-center gap-2.5">
                  {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-stone-400" /> : <ChevronDown className="w-3.5 h-3.5 text-stone-400" />}
                  <p className="text-sm font-semibold text-stone-800">{cat}</p>
                  <span className="text-xs text-stone-400">{doneCount}/{allCatItems.length}</span>
                </div>
                {allCatItems.length > 0 && (
                  <div className="w-20 h-1 bg-stone-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(doneCount / allCatItems.length) * 100}%` }} />
                  </div>
                )}
              </button>

              {/* Items */}
              {!isCollapsed && (
                <div>
                  {catItems.filter(i => i.id !== `__placeholder_${cat}`).map(item => (
                    <div key={item.id}>
                      {/* Task row */}
                      <div className={`group flex items-start gap-3 px-4 py-2.5 border-t border-stone-100 hover:bg-stone-50 transition-colors ${item.status === 'done' ? 'opacity-60' : ''}`}>

                        {/* Status toggle */}
                        <button onClick={() => handleStatusToggle(item)}
                          title={isBookingTask(item.title) ? 'Click to book — will ask for vendor details' : 'Click to advance status'}
                          className="flex-shrink-0 mt-0.5 hover:scale-110 transition-transform">
                          <StatusIcon status={item.status} />
                        </button>

                        {/* Title + notes */}
                        <div className="flex-1 min-w-0">
                          {editingId === item.id ? (
                            <input
                              ref={editInputRef}
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              onBlur={() => commitEdit(item)}
                              onKeyDown={e => { if (e.key === 'Enter') commitEdit(item); if (e.key === 'Escape') setEditingId(null) }}
                              className="w-full text-sm text-stone-900 bg-stone-50 border border-stone-300 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-rose-300"
                            />
                          ) : (
                            <p onClick={() => startEdit(item)}
                              className={`text-sm text-stone-800 cursor-text leading-snug ${item.status === 'done' ? 'line-through text-stone-400' : ''}`}>
                              {item.title}
                              {isBookingTask(item.title) && item.status === 'pending' && (
                                <span className="ml-1.5 text-[10px] text-blue-400 font-medium">tap to book</span>
                              )}
                            </p>
                          )}

                          {/* Notes display / edit */}
                          {editingNotesId === item.id ? (
                            <input
                              autoFocus
                              value={editNotes}
                              onChange={e => setEditNotes(e.target.value)}
                              onBlur={() => handleNotesSave(item)}
                              onKeyDown={e => { if (e.key === 'Enter') handleNotesSave(item); if (e.key === 'Escape') setEditingNotesId(null) }}
                              placeholder="Add notes…"
                              className="mt-1 w-full text-xs bg-stone-50 border border-stone-200 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-rose-300 text-stone-600"
                            />
                          ) : item.notes ? (
                            <p onClick={() => { setEditingNotesId(item.id); setEditNotes(item.notes ?? '') }}
                              className="mt-0.5 text-xs text-stone-400 cursor-text hover:text-stone-600 truncate">
                              {item.notes}
                            </p>
                          ) : null}
                        </div>

                        {/* Side badge */}
                        <button onClick={() => handleCycleSide(item)}
                          className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize flex-shrink-0 transition-colors ${SIDE_COLORS[item.side]}`}>
                          {item.side}
                        </button>

                        {/* Due date (inline edit) */}
                        <DueDateCell value={item.due_date} onSave={val => handleDueDateSave(item, val)} />

                        {/* Notes icon (if no notes yet, show on hover) */}
                        {!item.notes && editingNotesId !== item.id && (
                          <button onClick={() => { setEditingNotesId(item.id); setEditNotes('') }}
                            className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-stone-500 transition-all flex-shrink-0"
                            title="Add notes">
                            <StickyNote className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete */}
                        <button onClick={() => handleDelete(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500 transition-all flex-shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Booking capture panel */}
                      {capturingId === item.id && (
                        <BookingCapture
                          item={item}
                          onSave={(vendor, notes) => handleBookingSave(item, vendor, notes)}
                          onSkip={() => handleBookingSkip(item)}
                        />
                      )}
                    </div>
                  ))}

                  {/* Inline add */}
                  {addingCat === cat ? (
                    <div className="flex items-center gap-3 px-4 py-2.5 border-t border-stone-100 bg-stone-50">
                      <Circle className="w-4 h-4 text-stone-200 flex-shrink-0" />
                      <input
                        ref={addInputRef}
                        value={addTitle}
                        onChange={e => setAddTitle(e.target.value)}
                        onBlur={commitAdd}
                        onKeyDown={e => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') setAddingCat(null) }}
                        placeholder="Task title… press Enter to add"
                        className="flex-1 text-sm bg-transparent outline-none text-stone-800 placeholder-stone-400"
                      />
                    </div>
                  ) : (
                    <button onClick={() => startAdd(cat)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-stone-400 hover:text-stone-600 hover:bg-stone-50 transition-colors border-t border-stone-100">
                      <Plus className="w-3.5 h-3.5" /> Add task
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* New category dialog */}
      <Dialog open={newCatOpen} onOpenChange={setNewCatOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New category</DialogTitle></DialogHeader>
          <form onSubmit={handleNewCategory} className="space-y-3">
            <input autoFocus value={newCatName} onChange={e => setNewCatName(e.target.value)}
              placeholder="e.g. Photography, Catering, Attire"
              className="w-full border border-stone-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-rose-300"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewCatOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-rose-700 hover:bg-rose-800">Create & add first task</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Template dialog */}
      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Load from template</DialogTitle>
            <p className="text-xs text-stone-400 mt-1">Select tasks to add. Already-existing tasks will be skipped.</p>
          </DialogHeader>

          {/* Tabs */}
          {companyTemplates.length > 0 && (
            <div className="flex gap-1 bg-stone-100 p-1 rounded-lg">
              <button onClick={() => { setTemplateTab('builtin'); setTemplateSelected({}) }}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${templateTab === 'builtin' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
                Default
              </button>
              <button onClick={() => { setTemplateTab('saved'); setTemplateSelected({}); setSelectedCompanyTpl(companyTemplates[0]?.id ?? null) }}
                className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${templateTab === 'saved' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500'}`}>
                Saved ({companyTemplates.length})
              </button>
            </div>
          )}

          {templateTab === 'builtin' && (
            <div className="space-y-4 my-2">
              {TEMPLATE.map(group => {
                const keys = group.tasks.map(t => `${group.category}::${t}`)
                const allOn = keys.every(k => templateSelected[k])
                const someOn = keys.some(k => templateSelected[k])
                return (
                  <div key={group.category}>
                    <button onClick={() => toggleTemplateGroup(group.category, group.tasks)}
                      className="flex items-center gap-2 w-full text-left mb-1.5">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${allOn ? 'bg-rose-700 border-rose-700' : someOn ? 'bg-rose-100 border-rose-300' : 'border-stone-300'}`}>
                        {(allOn || someOn) && <div className={`w-2 h-2 rounded-sm ${allOn ? 'bg-white' : 'bg-rose-500'}`} />}
                      </div>
                      <p className="text-sm font-semibold text-stone-800">{group.category}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize ${SIDE_COLORS[group.side]}`}>{group.side}</span>
                    </button>
                    <div className="ml-6 space-y-1">
                      {group.tasks.map(t => {
                        const key = `${group.category}::${t}`
                        return (
                          <label key={key} className="flex items-start gap-2 cursor-pointer group">
                            <div className={`mt-0.5 w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${templateSelected[key] ? 'bg-rose-700 border-rose-700' : 'border-stone-300 group-hover:border-stone-400'}`}>
                              {templateSelected[key] && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                            </div>
                            <input type="checkbox" className="hidden" checked={!!templateSelected[key]} onChange={() => setTemplateSelected(prev => ({ ...prev, [key]: !prev[key] }))} />
                            <span className="text-xs text-stone-600 leading-snug">{t}
                              {isBookingTask(t) && <span className="ml-1 text-[10px] text-blue-400">will ask vendor</span>}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {templateTab === 'saved' && (
            <div className="space-y-3 my-2">
              {/* Template selector */}
              <select value={selectedCompanyTpl ?? ''} onChange={e => { setSelectedCompanyTpl(e.target.value); setTemplateSelected({}) }}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200">
                {companyTemplates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.items.length} tasks)</option>)}
              </select>
              {/* Items from selected template */}
              {(() => {
                const tpl = companyTemplates.find(t => t.id === selectedCompanyTpl)
                if (!tpl) return null
                const grouped: Record<string, typeof tpl.items> = {}
                for (const i of tpl.items) {
                  if (!grouped[i.category]) grouped[i.category] = []
                  grouped[i.category].push(i)
                }
                return Object.entries(grouped).map(([cat, catItems]) => {
                  const keys = catItems.map(i => `${i.category}::${i.title}`)
                  const allOn = keys.every(k => templateSelected[k])
                  const someOn = keys.some(k => templateSelected[k])
                  return (
                    <div key={cat}>
                      <button onClick={() => {
                        const next = { ...templateSelected }
                        keys.forEach(k => { next[k] = !allOn })
                        setTemplateSelected(next)
                      }} className="flex items-center gap-2 w-full text-left mb-1.5">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${allOn ? 'bg-rose-700 border-rose-700' : someOn ? 'bg-rose-100 border-rose-300' : 'border-stone-300'}`}>
                          {(allOn || someOn) && <div className={`w-2 h-2 rounded-sm ${allOn ? 'bg-white' : 'bg-rose-500'}`} />}
                        </div>
                        <p className="text-sm font-semibold text-stone-800">{cat}</p>
                      </button>
                      <div className="ml-6 space-y-1">
                        {catItems.map(item => {
                          const key = `${item.category}::${item.title}`
                          return (
                            <label key={key} className="flex items-start gap-2 cursor-pointer group">
                              <div className={`mt-0.5 w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${templateSelected[key] ? 'bg-rose-700 border-rose-700' : 'border-stone-300 group-hover:border-stone-400'}`}>
                                {templateSelected[key] && <div className="w-1.5 h-1.5 bg-white rounded-sm" />}
                              </div>
                              <input type="checkbox" className="hidden" checked={!!templateSelected[key]} onChange={() => setTemplateSelected(prev => ({ ...prev, [key]: !prev[key] }))} />
                              <span className="text-xs text-stone-600 leading-snug">{item.title}</span>
                              <span className={`text-[10px] px-1 py-0.5 rounded capitalize flex-shrink-0 ${SIDE_COLORS[item.side]}`}>{item.side}</span>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              })()}
            </div>
          )}

          <DialogFooter className="sticky bottom-0 bg-white pt-2 border-t border-stone-100">
            <span className="text-xs text-stone-400 flex-1 self-center">{Object.values(templateSelected).filter(Boolean).length} selected</span>
            <Button variant="outline" onClick={() => setTemplateOpen(false)}>Cancel</Button>
            <Button className="bg-rose-700 hover:bg-rose-800" onClick={handleLoadTemplate} disabled={templateLoading}>
              {templateLoading ? 'Adding…' : 'Add selected tasks'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save as template dialog */}
      <Dialog open={saveAsTemplateOpen} onOpenChange={setSaveAsTemplateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Save as template</DialogTitle>
            <p className="text-xs text-stone-400 mt-1">Saves all {items.length} tasks as a reusable template</p>
          </DialogHeader>
          <input
            autoFocus
            value={saveTemplateName}
            onChange={e => setSaveTemplateName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSaveAsTemplate()}
            placeholder="Template name (e.g. 3-day destination wedding)"
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveAsTemplateOpen(false)}>Cancel</Button>
            <Button className="bg-rose-700 hover:bg-rose-800" onClick={handleSaveAsTemplate}
              disabled={savingTemplate || !saveTemplateName.trim()}>
              {savingTemplate ? 'Saving…' : 'Save template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
