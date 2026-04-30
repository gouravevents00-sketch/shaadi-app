'use client'

import { useState, useRef, useMemo } from 'react'
import { toast } from 'sonner'
import { Plus, X, ChevronDown, ChevronRight, Sparkles, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import {
  updateBudgetTotal, createCategory, updateCategory, deleteCategory,
  createItem, updateItem, deleteItem, importFromChecklist,
} from './actions'

interface Category { id: string; name: string; estimated: number; order: number }
interface Item { id: string; category_id: string; description: string; quoted: number; paid: number; due_date: string | null }

function fmt(n: number) {
  if (n >= 100000) return `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`
  return n > 0 ? `₹${n.toLocaleString('en-IN')}` : '—'
}

function isOverdue(d: string | null) {
  if (!d) return false
  return new Date(d + 'T00:00:00') < new Date(new Date().toDateString())
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function EditableAmount({ value, onSave, placeholder = 'Set budget', large = false }: {
  value: number; onSave: (v: number) => void; placeholder?: string; large?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  function start() { setVal(value === 0 ? '' : String(value)); setEditing(true); setTimeout(() => ref.current?.select(), 20) }
  function commit() { setEditing(false); const n = parseFloat(val) || 0; if (n !== value) onSave(n) }
  if (editing) return (
    <input ref={ref} type="number" value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') commit(); if (e.key === 'Escape') setEditing(false) }}
      className={`border border-blue-300 rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-300 bg-white w-full ${large ? 'text-lg font-semibold' : 'text-sm'}`}
    />
  )
  return (
    <button onClick={start} className={`text-left w-full rounded-lg px-2 py-1 hover:bg-stone-100 transition-colors ${
      value === 0 ? 'text-stone-300 italic' : large ? 'text-lg font-semibold text-stone-900' : 'text-sm font-medium text-stone-800'
    }`}>
      {value === 0 ? placeholder : fmt(value)}
    </button>
  )
}

function AmountCell({ value, onSave, green }: { value: number; onSave: (v: number) => void; green?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  function start() { setVal(value === 0 ? '' : String(value)); setEditing(true); setTimeout(() => ref.current?.select(), 20) }
  function commit() { setEditing(false); const n = parseFloat(val) || 0; if (n !== value) onSave(n) }
  if (editing) return (
    <input ref={ref} type="number" value={val} onChange={e => setVal(e.target.value)}
      onBlur={commit} onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') commit(); if (e.key === 'Escape') setEditing(false) }}
      className="w-full text-right text-xs border border-blue-300 rounded px-1 py-0.5 outline-none bg-white"
    />
  )
  return (
    <button onClick={start} className={`text-xs text-right w-full px-1 py-0.5 rounded hover:bg-stone-100 transition-colors ${
      value === 0 ? 'text-stone-200' : green ? 'text-emerald-600 font-medium' : 'text-stone-700 font-medium'
    }`}>
      {value === 0 ? '—' : fmt(value)}
    </button>
  )
}

function ItemDesc({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  function commit() { setEditing(false); if (val.trim() && val.trim() !== value) onSave(val.trim()); else setVal(value) }
  if (editing) return (
    <input autoFocus value={val} onChange={e => setVal(e.target.value)}
      onBlur={commit} onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Tab') commit(); if (e.key === 'Escape') { setEditing(false); setVal(value) } }}
      className="w-full text-xs border border-blue-300 rounded px-1 py-0.5 outline-none bg-white"
    />
  )
  return <button onClick={() => { setVal(value); setEditing(true) }} className="text-xs text-stone-700 text-left truncate w-full hover:text-blue-700">{value}</button>
}

export default function BudgetClient({
  eventId, budgetTotal: initialBudgetTotal, initialCategories, initialItems, hasChecklist,
}: {
  eventId: string; budgetTotal: number
  initialCategories: Category[]; initialItems: Item[]
  hasChecklist: boolean
}) {
  const [budgetTotal, setBudgetTotal] = useState(initialBudgetTotal)
  const [categories, setCategories] = useState<Category[]>(initialCategories)
  const [items, setItems] = useState<Item[]>(initialItems)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [importing, setImporting] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [catForm, setCatForm] = useState({ name: '', estimated: '' })
  const [catLoading, setCatLoading] = useState(false)
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null)
  const [addingCat, setAddingCat] = useState<string | null>(null)
  const [addDesc, setAddDesc] = useState('')
  const addRef = useRef<HTMLInputElement>(null)

  const stats = useMemo(() => {
    const allocated = categories.reduce((s, c) => s + Number(c.estimated), 0)
    const committed = items.reduce((s, i) => s + Number(i.quoted), 0)
    const paid = items.reduce((s, i) => s + Number(i.paid), 0)
    const unallocated = budgetTotal - allocated
    const pct = budgetTotal > 0 ? (paid / budgetTotal) * 100 : 0
    return { allocated, committed, paid, unallocated, pct }
  }, [categories, items, budgetTotal])

  const upcoming = useMemo(() =>
    items.filter(i => i.due_date && Number(i.paid) < Number(i.quoted) && !isOverdue(i.due_date))
      .sort((a, b) => (a.due_date ?? '') < (b.due_date ?? '') ? -1 : 1).slice(0, 5),
  [items])

  async function saveBudgetTotal(val: number) {
    setBudgetTotal(val)
    const r = await updateBudgetTotal(eventId, val)
    if (r.error) toast.error(r.error)
  }

  async function handleImport() {
    setImporting(true)
    const r = await importFromChecklist(eventId)
    setImporting(false)
    if (r.error) { toast.error(r.error); return }
    toast.success(r.created ? `${r.created} categories added` : 'Already up to date')
    window.location.reload()
  }

  async function handleAddCat(e: React.FormEvent) {
    e.preventDefault()
    setCatLoading(true)
    const r = await createCategory(eventId, { name: catForm.name, estimated: parseFloat(catForm.estimated) || 0 })
    setCatLoading(false)
    if (r.error) { toast.error(r.error); return }
    setCategories(prev => [...prev, { id: r.id!, name: catForm.name, estimated: parseFloat(catForm.estimated) || 0, order: prev.length }])
    setCatForm({ name: '', estimated: '' })
    setCatOpen(false)
  }

  async function saveCatBudget(cat: Category, val: number) {
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, estimated: val } : c))
    const r = await updateCategory(eventId, cat.id, { estimated: val })
    if (r.error) toast.error(r.error)
  }

  async function handleDeleteCat(catId: string) {
    setCategories(prev => prev.filter(c => c.id !== catId))
    setItems(prev => prev.filter(i => i.category_id !== catId))
    setDeleteCatId(null)
    await deleteCategory(eventId, catId)
  }

  function startAdd(catId: string) {
    setAddingCat(catId); setAddDesc('')
    setExpanded(p => ({ ...p, [catId]: true }))
    setTimeout(() => addRef.current?.focus(), 80)
  }

  async function commitAdd() {
    if (!addDesc.trim() || !addingCat) { setAddingCat(null); return }
    const desc = addDesc.trim(); setAddingCat(null)
    const r = await createItem(eventId, { category_id: addingCat, description: desc })
    if (r.error) { toast.error(r.error); return }
    setItems(prev => [...prev, { id: r.id!, category_id: addingCat!, description: desc, quoted: 0, paid: 0, due_date: null }])
  }

  async function saveItemField(item: Item, field: keyof Item, value: number | string | null) {
    const prev = { ...item }
    setItems(p => p.map(i => i.id === item.id ? { ...i, [field]: value } : i))
    const r = await updateItem(eventId, item.id, { [field]: value } as Parameters<typeof updateItem>[2])
    if (r.error) { toast.error(r.error); setItems(p => p.map(i => i.id === item.id ? prev : i)) }
  }

  async function handleDeleteItem(itemId: string) {
    setItems(prev => prev.filter(i => i.id !== itemId))
    await deleteItem(eventId, itemId)
  }

  const isEmpty = categories.length === 0

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Budget</h1>
          <p className="text-stone-500 text-sm mt-1">
            {budgetTotal > 0
              ? `${fmt(budgetTotal)} total · ${fmt(stats.paid)} paid · ${fmt(Math.max(budgetTotal - stats.paid, 0))} remaining`
              : 'Set a total budget to track spend'}
          </p>
        </div>
        <div className="flex gap-2">
          {hasChecklist && !isEmpty && (
            <Button variant="outline" size="sm" onClick={handleImport} disabled={importing}>
              <Sparkles className="w-3.5 h-3.5 mr-1" />{importing ? 'Importing…' : 'Sync checklist'}
            </Button>
          )}
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => setCatOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" /> Add category
          </Button>
        </div>
      </div>

      {/* Total budget editable */}
      <div className="mb-4 p-4 bg-white border border-stone-200 rounded-xl">
        <p className="text-xs text-stone-400 font-medium uppercase tracking-wide mb-1">Total Budget</p>
        <EditableAmount value={budgetTotal} onSave={saveBudgetTotal} placeholder="Click to set total budget" large />
      </div>

      {/* Progress bar */}
      {budgetTotal > 0 && stats.paid > 0 && (
        <div className="mb-4">
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${Math.min(stats.pct, 100)}%`, background: stats.pct > 90 ? '#ef4444' : stats.pct > 70 ? '#f59e0b' : '#22c55e' }} />
          </div>
          <p className="text-xs text-stone-400 mt-1">{fmt(stats.paid)} paid of {fmt(budgetTotal)} · {stats.pct.toFixed(1)}%</p>
        </div>
      )}

      {/* Summary pills */}
      {!isEmpty && (
        <div className="flex gap-3 mb-4 flex-wrap">
          {stats.committed > 0 && (
            <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-sm">
              <span className="font-semibold text-blue-700">{fmt(stats.committed)}</span>
              <span className="text-blue-500 ml-1.5">committed</span>
            </div>
          )}
          {stats.paid > 0 && (
            <div className="px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-lg text-sm">
              <span className="font-semibold text-emerald-700">{fmt(stats.paid)}</span>
              <span className="text-emerald-500 ml-1.5">paid</span>
            </div>
          )}
          {budgetTotal > 0 && stats.unallocated > 0 && (
            <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span className="font-semibold text-amber-700">{fmt(stats.unallocated)}</span>
              <span className="text-amber-500">unallocated</span>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {isEmpty ? (
        <div className="border border-dashed border-stone-200 rounded-xl p-12 text-center">
          {hasChecklist ? (
            <>
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
              <p className="font-semibold text-stone-900 mb-1">Import from checklist</p>
              <p className="text-stone-400 text-sm mb-6 max-w-xs mx-auto">
                Your checklist categories become budget categories automatically.
              </p>
              <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleImport} disabled={importing}>
                {importing ? 'Importing…' : '⚡ Import categories'}
              </Button>
              <p className="text-xs text-stone-400 mt-4">
                Or <button className="underline hover:text-stone-600" onClick={() => setCatOpen(true)}>add manually</button>
              </p>
            </>
          ) : (
            <>
              <p className="text-stone-500 font-medium mb-1">No budget categories yet</p>
              <p className="text-stone-400 text-sm mb-4">Add categories like Venue, Catering, AV/Tech, Marketing…</p>
              <Button variant="outline" onClick={() => setCatOpen(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Add category</Button>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {categories.map(cat => {
              const catItems = items.filter(i => i.category_id === cat.id)
              const totalCommitted = catItems.reduce((s, i) => s + Number(i.quoted), 0)
              const totalPaid = catItems.reduce((s, i) => s + Number(i.paid), 0)
              const pct = Number(cat.estimated) > 0 ? (totalPaid / Number(cat.estimated)) * 100 : 0
              const isOver = Number(cat.estimated) > 0 && totalCommitted > Number(cat.estimated)
              const isOpen = expanded[cat.id]

              return (
                <div key={cat.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                  <div className="px-4 pt-4 pb-3">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <p className="text-sm font-semibold text-stone-800">{cat.name}</p>
                      <button onClick={() => setDeleteCatId(cat.id)} className="text-stone-200 hover:text-red-400 transition-colors mt-0.5">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="mb-2">
                      <p className="text-[10px] text-stone-400 font-medium uppercase tracking-wide mb-0.5">Budget</p>
                      <EditableAmount value={Number(cat.estimated)} onSave={v => saveCatBudget(cat, v)} large />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-stone-500">
                      <span>Paid <span className="font-semibold text-emerald-600">{fmt(totalPaid)}</span></span>
                      {totalCommitted > 0 && <span>Committed <span className={`font-semibold ${isOver ? 'text-red-600' : 'text-stone-700'}`}>{fmt(totalCommitted)}</span></span>}
                      {Number(cat.estimated) > 0 && <span className="ml-auto text-stone-400">{fmt(Math.max(Number(cat.estimated) - totalPaid, 0))} left</span>}
                    </div>
                    {Number(cat.estimated) > 0 && (
                      <div className="h-1 bg-stone-100 rounded-full mt-2 overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${Math.min(pct, 100)}%`, background: pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : '#22c55e' }} />
                      </div>
                    )}
                  </div>

                  <div className="w-full flex items-center justify-between px-4 py-2 border-t border-stone-100 text-xs text-stone-400 hover:bg-stone-50 cursor-pointer"
                    onClick={() => setExpanded(p => ({ ...p, [cat.id]: !p[cat.id] }))}>
                    <span className="flex items-center gap-1.5">
                      {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                      {catItems.length > 0 ? `${catItems.length} item${catItems.length > 1 ? 's' : ''}` : 'No items yet'}
                    </span>
                    <button onClick={e => { e.stopPropagation(); startAdd(cat.id) }}
                      className="flex items-center gap-1 hover:text-blue-700 transition-colors">
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  </div>

                  {isOpen && (
                    <div className="border-t border-stone-100">
                      {catItems.length > 0 && (
                        <div className="px-3 py-1 bg-stone-50 grid grid-cols-[1fr_5rem_5rem_5rem_1rem] gap-1 text-[9px] font-semibold text-stone-400 uppercase tracking-wide">
                          <span>Item</span><span className="text-right">Quoted</span><span className="text-right">Paid</span><span className="text-right">Due</span><span />
                        </div>
                      )}
                      {catItems.map(item => (
                        <div key={item.id} className="group grid grid-cols-[1fr_5rem_5rem_5rem_1rem] gap-1 items-center px-3 py-2 border-t border-stone-100 hover:bg-stone-50">
                          <ItemDesc value={item.description} onSave={v => saveItemField(item, 'description', v)} />
                          <AmountCell value={Number(item.quoted)} onSave={v => saveItemField(item, 'quoted', v)} />
                          <AmountCell value={Number(item.paid)} onSave={v => saveItemField(item, 'paid', v)} green />
                          <span className={`text-right text-[10px] ${item.due_date && isOverdue(item.due_date) && Number(item.paid) < Number(item.quoted) ? 'text-red-500 font-medium' : 'text-stone-300'}`}>
                            {item.due_date ? fmtDate(item.due_date) : '—'}
                          </span>
                          <button onClick={() => handleDeleteItem(item.id)} className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500 transition-all">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {addingCat === cat.id ? (
                        <div className="flex items-center gap-2 px-3 py-2 border-t border-stone-100 bg-stone-50">
                          <input ref={addRef} value={addDesc} onChange={e => setAddDesc(e.target.value)}
                            onBlur={commitAdd}
                            onKeyDown={e => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') setAddingCat(null) }}
                            placeholder="e.g. Venue deposit, catering advance…"
                            className="flex-1 text-xs bg-transparent outline-none text-stone-800 placeholder-stone-400"
                          />
                        </div>
                      ) : (
                        <button onClick={() => startAdd(cat.id)}
                          className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-stone-400 hover:text-stone-600 hover:bg-stone-50 border-t border-stone-100 transition-colors">
                          <Plus className="w-3 h-3" /> Add item
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Upcoming payments */}
          {upcoming.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">Upcoming payments</p>
              <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                {upcoming.map((item, idx) => {
                  const cat = categories.find(c => c.id === item.category_id)
                  return (
                    <div key={item.id} className={`flex items-center justify-between px-4 py-3 ${idx > 0 ? 'border-t border-stone-100' : ''}`}>
                      <div>
                        <p className="text-sm font-medium text-stone-800">{item.description}</p>
                        {cat && <p className="text-xs text-stone-400">{cat.name}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{fmt(Number(item.quoted) - Number(item.paid))}</p>
                        <p className="text-xs text-stone-400">due {fmtDate(item.due_date!)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Add category dialog */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add category</DialogTitle></DialogHeader>
          <form onSubmit={handleAddCat} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input autoFocus placeholder="e.g. Venue, Catering, AV/Tech" value={catForm.name}
                onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Budget (₹)</Label>
              <Input type="number" placeholder="e.g. 500000" value={catForm.estimated}
                onChange={e => setCatForm(f => ({ ...f, estimated: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCatOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={catLoading}>
                {catLoading ? 'Adding…' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteCatId} onOpenChange={() => setDeleteCatId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete category?</DialogTitle></DialogHeader>
          <p className="text-sm text-stone-500">All items under this category will also be deleted.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCatId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteCatId && handleDeleteCat(deleteCatId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
