'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, Circle, CircleDot, Plus, Trash2, Sparkles, CalendarDays, Users, ArrowRight, Handshake, Loader2, Wallet, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { updateTaskStatus, addTask, deleteTask, updateGuestCount, upgradeToPro, connectToCreativeEra, addCelebrationGuest, deleteCelebrationGuest, addBudgetItem, deleteBudgetItem, updateBudgetActual } from './actions'

type CelebGuest = {
  id: string; celebration_id: string; name: string
  phone: string | null; dietary: string | null; plus_count: number; side: string
}

type BudgetItem = {
  id: string; celebration_id: string; category: string
  description: string; estimated: number; actual: number | null; status: string
}

type Task = {
  id: string
  celebration_id: string
  title: string
  category: string
  status: 'pending' | 'in_progress' | 'done'
  due_date: string | null
  notes: string | null
  ai_generated: boolean
  created_at: string
}

type Celebration = {
  id: string
  user_id: string
  type: string
  name: string
  event_date: string | null
  venue: string | null
  city: string | null
  budget: number
  guest_count: number
  notes: string | null
  created_at: string
}

const TYPE_EMOJIS: Record<string, string> = {
  wedding: '💒', sagai: '💍', sangeet: '🎵', namkaran: '👶', mundan: '✂️',
  annaprashan: '🍚', janeu: '🧵', godh_bharai: '🤰', griha_pravesh: '🏠',
  puja: '🪔', birthday: '🎂', anniversary: '❤️', graduation: '🎓',
  retirement: '🎉', kitty: '👗', other: '✨',
}

const STATUS_ICONS = {
  pending: Circle,
  in_progress: CircleDot,
  done: CheckCircle2,
}

const STATUS_COLORS = {
  pending: 'text-stone-400',
  in_progress: 'text-blue-500',
  done: 'text-emerald-500',
}

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const DIETARY = ['', 'Vegetarian', 'Jain', 'Vegan', 'Non-Vegetarian', 'Gluten Free']
const BUDGET_CATS = ['Venue', 'Catering', 'Decoration', 'Photography', 'Music/DJ', 'Mehendi', 'Makeup', 'Clothes', 'Invitations', 'Transport', 'Other']

export default function MyCelebrationClient({
  celebration,
  initialTasks,
  initialPlan,
  initialConnection,
  initialGuests,
  initialBudget,
}: {
  celebration: Celebration
  initialTasks: Task[]
  initialPlan: string
  initialConnection: { id: string; status: string; wedding_id: string | null } | null
  initialGuests: CelebGuest[]
  initialBudget: BudgetItem[]
}) {
  const router = useRouter()
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [isPro, setIsPro] = useState(initialPlan === 'pro')
  const [connection, setConnection] = useState(initialConnection)
  const [connectingNow, setConnectingNow] = useState(false)
  const [guestCount, setGuestCount] = useState(celebration.guest_count)

  // Pro: guests
  const [guests, setGuests] = useState<CelebGuest[]>(initialGuests)
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [guestForm, setGuestForm] = useState({ name: '', phone: '', dietary: '', plus_count: '0', side: 'both' })

  // Pro: budget
  const [budget, setBudget] = useState<BudgetItem[]>(initialBudget)
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [budgetForm, setBudgetForm] = useState({ category: '', description: '', estimated: '' })
  const [expandedBudget, setExpandedBudget] = useState(false)
  const [editingGuests, setEditingGuests] = useState(false)
  const [guestInput, setGuestInput] = useState(String(celebration.guest_count))
  const [isPending, startTransition] = useTransition()
  const [addingCategory, setAddingCategory] = useState('')
  const [newTitle, setNewTitle] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const doneCount = tasks.filter(t => t.status === 'done').length
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0
  const daysLeft = celebration.event_date
    ? Math.ceil((new Date(celebration.event_date).getTime() - Date.now()) / 86400000)
    : null

  // Group tasks by category
  const byCategory = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    acc[t.category] = acc[t.category] || []
    acc[t.category].push(t)
    return acc
  }, {})
  const categories = Object.keys(byCategory).sort()

  function cycleStatus(task: Task) {
    const next: Record<string, 'pending' | 'in_progress' | 'done'> = {
      pending: 'in_progress', in_progress: 'done', done: 'pending',
    }
    const newStatus = next[task.status]
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    startTransition(async () => {
      const res = await updateTaskStatus(task.id, newStatus)
      if ('error' in res) {
        toast.error(res.error)
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t))
      }
    })
  }

  function handleDelete(task: Task) {
    setTasks(prev => prev.filter(t => t.id !== task.id))
    startTransition(async () => {
      const res = await deleteTask(task.id)
      if ('error' in res) {
        toast.error(res.error)
        setTasks(prev => [...prev, task])
      }
    })
  }

  function handleAdd() {
    if (!newTitle.trim()) return
    startTransition(async () => {
      const res = await addTask(celebration.id, newTitle.trim(), addingCategory || 'General')
      if ('error' in res) { toast.error(res.error); return }
      const newTask: Task = {
        id: res.id, celebration_id: celebration.id, title: newTitle.trim(),
        category: addingCategory || 'General', status: 'pending',
        due_date: null, notes: null, ai_generated: false,
        created_at: new Date().toISOString(),
      }
      setTasks(prev => [...prev, newTask])
      setNewTitle('')
      setAddingCategory('')
      setShowAdd(false)
      toast.success('Task added')
    })
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top nav */}
      <nav className="border-b border-stone-100 bg-white px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-rose-700 flex items-center justify-center">
            <span className="text-white text-xs font-bold">✦</span>
          </div>
          <span className="text-sm font-semibold text-stone-700">My Celebrations</span>
        </div>
        <Link href="/celebrate/new" className="text-xs text-stone-500 hover:text-stone-700">+ New celebration</Link>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Hero card */}
        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="text-4xl">{TYPE_EMOJIS[celebration.type] || '✨'}</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-stone-900 truncate">{celebration.name}</h1>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                {celebration.event_date && (
                  <span className="text-sm text-stone-500 flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5" /> {fmtDate(celebration.event_date)}
                    {daysLeft !== null && daysLeft > 0 && (
                      <span className={`ml-1 font-medium ${daysLeft <= 30 ? 'text-rose-600' : 'text-stone-600'}`}>
                        · {daysLeft} days to go
                      </span>
                    )}
                  </span>
                )}
                {editingGuests ? (
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-stone-400" />
                    <input
                      type="number" min="0" value={guestInput}
                      onChange={e => setGuestInput(e.target.value)}
                      onBlur={() => {
                        const n = parseInt(guestInput) || 0
                        setGuestCount(n)
                        setEditingGuests(false)
                        startTransition(async () => { await updateGuestCount(celebration.id, n) })
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                      autoFocus
                      className="w-16 text-sm border border-rose-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-rose-400"
                    />
                    <span className="text-sm text-stone-500">guests</span>
                  </span>
                ) : (
                  <button onClick={() => { setEditingGuests(true); setGuestInput(String(guestCount)) }}
                    className="text-sm text-stone-500 flex items-center gap-1 hover:text-rose-600 transition-colors group">
                    <Users className="w-3.5 h-3.5" />
                    ~{guestCount} guests
                    <span className="text-xs text-stone-300 group-hover:text-rose-400 ml-0.5">edit</span>
                  </button>
                )}
                {(celebration.venue || celebration.city) && (
                  <span className="text-sm text-stone-500">
                    {[celebration.venue, celebration.city].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-stone-500">{doneCount}/{tasks.length} tasks done</span>
              <span className={`font-semibold ${pct === 100 ? 'text-emerald-600' : 'text-stone-600'}`}>{pct}%</span>
            </div>
            <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">Your checklist</h2>
            <button onClick={() => setShowAdd(v => !v)} className="text-xs text-rose-600 font-medium hover:text-rose-800 flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add task
            </button>
          </div>

          {showAdd && (
            <div className="bg-white border border-rose-200 rounded-xl p-4 mb-4 flex gap-2">
              <div className="flex-1 space-y-2">
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  placeholder="Task title" autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd() }} />
                <Input value={addingCategory} onChange={e => setAddingCategory(e.target.value)}
                  placeholder="Category (e.g. Venue, Catering)" />
              </div>
              <div className="flex flex-col gap-2">
                <Button size="sm" onClick={handleAdd} disabled={!newTitle.trim() || isPending} className="bg-rose-700 hover:bg-rose-800">Add</Button>
                <Button size="sm" variant="outline" onClick={() => { setShowAdd(false); setNewTitle(''); }}>Cancel</Button>
              </div>
            </div>
          )}

          {categories.length === 0 ? (
            <div className="text-center py-10 text-stone-400 text-sm">
              <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>No tasks yet. Add your first task above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map(cat => {
                const catTasks = byCategory[cat]
                const catDone = catTasks.filter(t => t.status === 'done').length
                return (
                  <div key={cat} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50 border-b border-stone-100">
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{cat}</p>
                      <p className="text-xs text-stone-400">{catDone}/{catTasks.length}</p>
                    </div>
                    <div className="divide-y divide-stone-50">
                      {catTasks.map(task => {
                        const Icon = STATUS_ICONS[task.status]
                        return (
                          <div key={task.id} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50 group transition-colors">
                            <button onClick={() => cycleStatus(task)} className={`flex-shrink-0 ${STATUS_COLORS[task.status]}`}>
                              <Icon className="w-4.5 h-4.5" />
                            </button>
                            <span className={`flex-1 text-sm ${task.status === 'done' ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                              {task.title}
                              {task.ai_generated && task.status === 'pending' && (
                                <span className="ml-1.5 text-xs text-stone-300">· suggested</span>
                              )}
                            </span>
                            <button onClick={() => handleDelete(task)}
                              className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-400 transition-all flex-shrink-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
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

        {/* ── PRO: Guest list ──────────────────────────────── */}
        {isPro && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-rose-500" />
                <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">Guest List</h2>
                <span className="text-xs bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full font-medium">{guests.reduce((s, g) => s + 1 + g.plus_count, 0)}</span>
              </div>
              <button onClick={() => setShowGuestForm(v => !v)}
                className="text-xs text-rose-600 font-medium hover:text-rose-800 flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> Add guest
              </button>
            </div>

            {showGuestForm && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-stone-600 mb-1 block">Name *</label>
                    <Input value={guestForm.name} onChange={e => setGuestForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="Full name" autoFocus />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">Phone</label>
                    <Input value={guestForm.phone} onChange={e => setGuestForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+91 98765 43210" type="tel" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">Plus ones</label>
                    <Input type="number" min="0" max="10" value={guestForm.plus_count}
                      onChange={e => setGuestForm(f => ({ ...f, plus_count: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">Dietary</label>
                    <select value={guestForm.dietary} onChange={e => setGuestForm(f => ({ ...f, dietary: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                      {DIETARY.map(d => <option key={d} value={d}>{d || 'No preference'}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">Side</label>
                    <select value={guestForm.side} onChange={e => setGuestForm(f => ({ ...f, side: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                      <option value="both">Both sides</option>
                      <option value="bride">Bride&apos;s side</option>
                      <option value="groom">Groom&apos;s side</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowGuestForm(false)}
                    className="text-sm text-stone-500 px-3 py-1.5 hover:text-stone-700">Cancel</button>
                  <button disabled={!guestForm.name.trim() || isPending}
                    onClick={() => {
                      if (!guestForm.name.trim()) return
                      startTransition(async () => {
                        const res = await addCelebrationGuest(celebration.id, {
                          name: guestForm.name, phone: guestForm.phone || undefined,
                          dietary: guestForm.dietary || undefined,
                          plus_count: parseInt(guestForm.plus_count) || 0, side: guestForm.side,
                        })
                        if ('error' in res) { toast.error(res.error); return }
                        setGuests(g => [...g, {
                          id: res.id, celebration_id: celebration.id, name: guestForm.name,
                          phone: guestForm.phone || null, dietary: guestForm.dietary || null,
                          plus_count: parseInt(guestForm.plus_count) || 0, side: guestForm.side,
                        }])
                        setGuestForm({ name: '', phone: '', dietary: '', plus_count: '0', side: 'both' })
                        setShowGuestForm(false)
                      })
                    }}
                    className="text-sm bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">
                    Add guest
                  </button>
                </div>
              </div>
            )}

            {guests.length === 0 && !showGuestForm ? (
              <div className="text-center py-8 border border-dashed border-stone-200 rounded-xl">
                <Users className="w-8 h-8 mx-auto mb-2 text-stone-200" />
                <p className="text-sm text-stone-500">No guests added yet</p>
                <button onClick={() => setShowGuestForm(true)} className="text-xs text-rose-600 mt-1">+ Add your first guest</button>
              </div>
            ) : guests.length > 0 && (
              <div className="bg-white border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100">
                {guests.map(g => (
                  <div key={g.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-rose-600">{g.name[0]?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800">
                        {g.name}{g.plus_count > 0 && <span className="text-xs text-stone-400 ml-1">+{g.plus_count}</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {g.phone && <span className="text-xs text-stone-400">{g.phone}</span>}
                        {g.dietary && <span className="text-xs bg-stone-100 text-stone-400 px-1.5 py-0.5 rounded">{g.dietary}</span>}
                      </div>
                    </div>
                    <button onClick={() => {
                      setGuests(prev => prev.filter(x => x.id !== g.id))
                      startTransition(async () => {
                        const res = await deleteCelebrationGuest(g.id)
                        if ('error' in res) { toast.error(res.error); setGuests(prev => [...prev, g]) }
                      })
                    }} className="text-stone-200 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PRO: Budget tracker ───────────────────────────── */}
        {isPro && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-rose-500" />
                <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wider">Budget</h2>
                {budget.length > 0 && (
                  <span className="text-xs text-stone-400">
                    ₹{budget.reduce((s, b) => s + (b.actual ?? b.estimated), 0).toLocaleString('en-IN')} total
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {budget.length > 0 && (
                  <button onClick={() => setExpandedBudget(v => !v)} className="text-stone-400 hover:text-stone-600">
                    {expandedBudget ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                )}
                <button onClick={() => setShowBudgetForm(v => !v)}
                  className="text-xs text-rose-600 font-medium hover:text-rose-800 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add item
                </button>
              </div>
            </div>

            {showBudgetForm && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">Category</label>
                    <select value={budgetForm.category} onChange={e => setBudgetForm(f => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                      <option value="">Select…</option>
                      {BUDGET_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-stone-600 mb-1 block">Estimated (₹)</label>
                    <Input type="number" min="0" value={budgetForm.estimated}
                      onChange={e => setBudgetForm(f => ({ ...f, estimated: e.target.value }))}
                      placeholder="0" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-medium text-stone-600 mb-1 block">Description *</label>
                    <Input value={budgetForm.description} onChange={e => setBudgetForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="e.g. Taj Falaknuma — venue booking" autoFocus />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowBudgetForm(false)}
                    className="text-sm text-stone-500 px-3 py-1.5 hover:text-stone-700">Cancel</button>
                  <button disabled={!budgetForm.description.trim() || !budgetForm.category || isPending}
                    onClick={() => {
                      if (!budgetForm.description.trim() || !budgetForm.category) return
                      startTransition(async () => {
                        const res = await addBudgetItem(celebration.id, {
                          category: budgetForm.category,
                          description: budgetForm.description,
                          estimated: parseFloat(budgetForm.estimated) || 0,
                        })
                        if ('error' in res) { toast.error(res.error); return }
                        setBudget(b => [...b, {
                          id: res.id, celebration_id: celebration.id,
                          category: budgetForm.category, description: budgetForm.description,
                          estimated: parseFloat(budgetForm.estimated) || 0,
                          actual: null, status: 'planned',
                        }])
                        setBudgetForm({ category: '', description: '', estimated: '' })
                        setShowBudgetForm(false)
                        setExpandedBudget(true)
                      })
                    }}
                    className="text-sm bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">
                    Add
                  </button>
                </div>
              </div>
            )}

            {budget.length === 0 && !showBudgetForm ? (
              <div className="text-center py-8 border border-dashed border-stone-200 rounded-xl">
                <Wallet className="w-8 h-8 mx-auto mb-2 text-stone-200" />
                <p className="text-sm text-stone-500">No budget items yet</p>
                <button onClick={() => setShowBudgetForm(true)} className="text-xs text-rose-600 mt-1">+ Track your first expense</button>
              </div>
            ) : (budget.length > 0 && expandedBudget) && (
              <div className="bg-white border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100">
                {budget.map(item => (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{item.description}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{item.category}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-stone-800">₹{(item.actual ?? item.estimated).toLocaleString('en-IN')}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        item.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                        item.status === 'booked' ? 'bg-blue-100 text-blue-700' :
                        'bg-stone-100 text-stone-500'
                      }`}>{item.status}</span>
                    </div>
                    <button onClick={() => {
                      setBudget(prev => prev.filter(x => x.id !== item.id))
                      startTransition(async () => {
                        const res = await deleteBudgetItem(item.id)
                        if ('error' in res) { toast.error(res.error); setBudget(prev => [...prev, item]) }
                      })
                    }} className="text-stone-200 hover:text-red-400 transition-colors ml-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {/* Summary row */}
                <div className="px-4 py-3 bg-stone-50 flex justify-between text-sm font-semibold">
                  <span className="text-stone-600">Total</span>
                  <span className="text-stone-900">₹{budget.reduce((s, b) => s + (b.actual ?? b.estimated), 0).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
            {budget.length > 0 && !expandedBudget && !showBudgetForm && (
              <button onClick={() => setExpandedBudget(true)}
                className="w-full text-xs text-stone-400 hover:text-stone-600 py-2 border border-dashed border-stone-200 rounded-xl">
                Show {budget.length} item{budget.length !== 1 ? 's' : ''} → ₹{budget.reduce((s, b) => s + (b.actual ?? b.estimated), 0).toLocaleString('en-IN')} total
              </button>
            )}
          </div>
        )}

        {/* Upgrade to Pro */}
        {!isPro ? (
          <div className="bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-rose-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-stone-800 text-sm">Want to manage everything yourself?</p>
                <ul className="mt-2 mb-3 space-y-1">
                  {['Guest list with dietary & RSVP tracking', 'Budget tracker with actuals vs estimates', 'Full vendor management dashboard', 'Seating planner & document store'].map(f => (
                    <li key={f} className="text-xs text-stone-600 flex items-center gap-1.5">
                      <span className="text-emerald-500 font-bold">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await upgradeToPro(celebration.id)
                      if ('error' in res) { toast.error(res.error); return }
                      setIsPro(true)
                      toast.success('You\'re on Pro! Setting up your dashboard…')
                      if (res.weddingId) router.push(`/weddings/${res.weddingId}/setup`)
                    })
                  }}
                  className="inline-flex items-center gap-1.5 text-xs bg-rose-700 text-white px-3 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50 transition-colors">
                  {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  Upgrade to Pro — it&apos;s free
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">You're on Pro</p>
              <p className="text-xs text-emerald-600">Full access — guests, vendors, seating & more</p>
            </div>
          </div>
        )}

        {/* Connect with planner */}
        {!connection ? (
          <div className="bg-white border border-stone-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                <Handshake className="w-5 h-5 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-800 text-sm">Want a professional planner?</p>
                <p className="text-xs text-stone-500 mt-0.5 mb-3">
                  Connect with a wedding planner — they take over event management and you get a dedicated portal for your guest list, functions, and preferences.
                </p>
                <button
                  disabled={connectingNow}
                  onClick={async () => {
                    setConnectingNow(true)
                    const res = await connectToCreativeEra(celebration.id)
                    setConnectingNow(false)
                    if ('error' in res) { toast.error(res.error); return }
                    setConnection({ id: '', status: res.status ?? 'pending', wedding_id: res.weddingId ?? null })
                    toast.success('Request sent! Your planner will reach out shortly.')
                  }}
                  className="inline-flex items-center gap-1.5 text-xs bg-rose-700 text-white px-3 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50 transition-colors">
                  {connectingNow ? <Loader2 className="w-3 h-3 animate-spin" /> : <Handshake className="w-3 h-3" />}
                  Connect with a planner
                </button>
              </div>
            </div>
          </div>
        ) : connection.status === 'accepted' && connection.wedding_id ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Planner connected</p>
                <p className="text-xs text-emerald-600">Your planner has accepted — portal is ready</p>
              </div>
            </div>
            <a href={`/portal/${connection.wedding_id}`}
              className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors flex-shrink-0 flex items-center gap-1">
              Open portal <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Handshake className="w-5 h-5 text-amber-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Request under review</p>
                <p className="text-xs text-amber-600">Your planner will reach out soon to confirm</p>
              </div>
            </div>
            <a href={`/my/${celebration.id}/preferences`}
              className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 font-medium hover:text-amber-900">
              Fill your preferences while you wait <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        )}


      </div>
    </div>
  )
}
