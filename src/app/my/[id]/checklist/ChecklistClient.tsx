'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  CheckCircle2, Circle, CircleDot, Plus, Trash2, Sparkles,
  Bell, SlidersHorizontal, LayoutTemplate, X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  updateTaskStatus, addTask, deleteTask, updateTaskDetails,
  bulkAddTasks, bulkUpdateTaskStatus, bulkDeleteTasks,
} from '../actions'

type Task = {
  id: string; title: string; category: string
  status: 'pending' | 'in_progress' | 'done'
  due_date: string | null; notes: string | null; ai_generated: boolean; created_at: string
}
type CelebFunction = { id: string; name: string; date: string }

const TASK_TEMPLATE: Array<{ title: string; category: string }> = [
  { title: 'Create master guest list', category: 'Pre-Wedding' },
  { title: 'Set overall wedding budget', category: 'Pre-Wedding' },
  { title: 'Book main venue', category: 'Pre-Wedding' },
  { title: 'Create wedding website or digital invite', category: 'Pre-Wedding' },
  { title: 'Send save-the-date messages', category: 'Pre-Wedding' },
  { title: 'Book accommodation for outstation guests', category: 'Pre-Wedding' },
  { title: 'Book pandit and confirm muhurat', category: 'Ceremonies & Rituals' },
  { title: 'Prepare puja samagri list', category: 'Ceremonies & Rituals' },
  { title: 'Arrange garlands and ritual items', category: 'Ceremonies & Rituals' },
  { title: 'Organize ring ceremony setup', category: 'Ceremonies & Rituals' },
  { title: 'Confirm pheras and wedding ritual schedule', category: 'Ceremonies & Rituals' },
  { title: 'Arrange kalash and ritual fire setup', category: 'Ceremonies & Rituals' },
  { title: 'Book floral decorator', category: 'Decor & Ambiance' },
  { title: 'Finalize mandap / stage design', category: 'Decor & Ambiance' },
  { title: 'Choose color palette and theme', category: 'Decor & Ambiance' },
  { title: 'Arrange entrance and pathway decor', category: 'Decor & Ambiance' },
  { title: 'Book lighting vendor', category: 'Decor & Ambiance' },
  { title: 'Finalize caterer and menu', category: 'Food & Catering' },
  { title: 'Confirm number of food stations', category: 'Food & Catering' },
  { title: 'Plan welcome tea/snacks for arrival', category: 'Food & Catering' },
  { title: 'Book bartending / mocktail counter', category: 'Food & Catering' },
  { title: 'Arrange welcome drinks for guests', category: 'Food & Catering' },
  { title: 'Book photographer', category: 'Photography & Video' },
  { title: 'Book videographer', category: 'Photography & Video' },
  { title: 'Plan pre-wedding shoot location', category: 'Photography & Video' },
  { title: 'Confirm candid photography package', category: 'Photography & Video' },
  { title: 'Book DJ and sound system', category: 'Music & Entertainment' },
  { title: 'Hire dhol and band for baraat', category: 'Music & Entertainment' },
  { title: 'Confirm mehandi singer or live music', category: 'Music & Entertainment' },
  { title: 'Arrange sangeet performers', category: 'Music & Entertainment' },
  { title: 'Book emcee / anchor', category: 'Music & Entertainment' },
  { title: 'Send formal invitations to all guests', category: 'Guests & Hospitality' },
  { title: 'Track RSVPs and confirm final count', category: 'Guests & Hospitality' },
  { title: 'Arrange transportation for guests', category: 'Guests & Hospitality' },
  { title: 'Assign airport/station pickup duties', category: 'Guests & Hospitality' },
  { title: 'Create seating and room allotment plan', category: 'Guests & Hospitality' },
  { title: 'Book bridal makeup artist', category: 'Outfits & Beauty' },
  { title: 'Finalize bride outfit(s)', category: 'Outfits & Beauty' },
  { title: 'Finalize groom outfit(s)', category: 'Outfits & Beauty' },
  { title: 'Book mehandi artist', category: 'Outfits & Beauty' },
  { title: 'Arrange bidaai transportation', category: 'Post-Wedding' },
  { title: 'Book wedding car decoration', category: 'Post-Wedding' },
  { title: 'Share wedding photos with guests', category: 'Post-Wedding' },
  { title: 'Write thank you messages to guests', category: 'Post-Wedding' },
  { title: 'Sort and store wedding gifts', category: 'Post-Wedding' },
]

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function isOverdue(d: string | null) {
  if (!d) return false
  return new Date(d + 'T00:00:00') < new Date(new Date().toDateString())
}

export default function ChecklistClient({
  celebrationId,
  initialTasks,
  functions,
}: {
  celebrationId: string
  initialTasks: Task[]
  functions: CelebFunction[]
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'done'>('all')
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskCat, setNewTaskCat] = useState('')
  const [newTaskDue, setNewTaskDue] = useState('')
  const [showTemplate, setShowTemplate] = useState(false)
  const [templateSelected, setTemplateSelected] = useState<Set<number>>(new Set())
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const doneCount = tasks.filter(t => t.status === 'done').length
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0

  const filteredTasks = tasks.filter(t =>
    taskFilter === 'all' ? true : taskFilter === 'done' ? t.status === 'done' : t.status !== 'done'
  )
  const tasksByCategory = filteredTasks.reduce<Record<string, Task[]>>((acc, t) => {
    acc[t.category] = acc[t.category] || []
    acc[t.category].push(t)
    return acc
  }, {})

  function cycleStatus(task: Task) {
    const next = { pending: 'in_progress' as const, in_progress: 'done' as const, done: 'pending' as const }
    const newStatus = next[task.status]
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t))
    startTransition(async () => {
      const res = await updateTaskStatus(task.id, newStatus)
      if ('error' in res) { toast.error(res.error); setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t)) }
    })
  }

  function handleAddTask() {
    if (!newTaskTitle.trim()) return
    startTransition(async () => {
      const res = await addTask(celebrationId, newTaskTitle.trim(), newTaskCat || 'General')
      if ('error' in res) { toast.error(res.error); return }
      const t: Task = { id: res.id, title: newTaskTitle.trim(), category: newTaskCat || 'General', status: 'pending', due_date: newTaskDue || null, notes: null, ai_generated: false, created_at: new Date().toISOString() }
      setTasks(prev => [...prev, t])
      if (newTaskDue) startTransition(async () => { await updateTaskDetails(res.id, { due_date: newTaskDue }) })
      setNewTaskTitle(''); setNewTaskCat(''); setNewTaskDue(''); setShowAddTask(false)
      toast.success('Task added')
    })
  }

  function handleDeleteTask(task: Task) {
    setTasks(prev => prev.filter(t => t.id !== task.id))
    startTransition(async () => {
      const res = await deleteTask(task.id)
      if ('error' in res) { toast.error(res.error); setTasks(prev => [...prev, task]) }
    })
  }

  function toggleTaskSelect(id: string) {
    setSelectedTaskIds(prev => {
      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
    })
  }

  function handleBulkComplete() {
    const ids = [...selectedTaskIds]
    setTasks(prev => prev.map(t => ids.includes(t.id) ? { ...t, status: 'done' } : t))
    setSelectedTaskIds(new Set()); setBulkMode(false)
    startTransition(async () => { await bulkUpdateTaskStatus(ids, 'done') })
    toast.success(`${ids.length} tasks marked done`)
  }

  function handleBulkDelete() {
    const ids = [...selectedTaskIds]
    setTasks(prev => prev.filter(t => !ids.includes(t.id)))
    setSelectedTaskIds(new Set()); setBulkMode(false)
    startTransition(async () => { await bulkDeleteTasks(ids) })
    toast.success(`${ids.length} tasks deleted`)
  }

  async function handleLoadTemplate() {
    const selected = TASK_TEMPLATE.filter((_, i) => templateSelected.has(i))
    const existing = new Set(tasks.map(t => t.title.toLowerCase()))
    const toAdd = selected.filter(t => !existing.has(t.title.toLowerCase()))
    if (!toAdd.length) { toast.error('All selected tasks already exist'); return }
    const res = await bulkAddTasks(celebrationId, toAdd)
    if ('error' in res) { toast.error(res.error); return }
    const newTasks: Task[] = toAdd.map((t, i) => ({
      id: (res.ids as string[])[i], title: t.title, category: t.category,
      status: 'pending', due_date: null, notes: null, ai_generated: false, created_at: new Date().toISOString()
    }))
    setTasks(prev => [...prev, ...newTasks])
    setShowTemplate(false); setTemplateSelected(new Set())
    toast.success(`${toAdd.length} tasks added`)
  }

  return (
    <div className="max-w-2xl md:max-w-4xl mx-auto px-4 pt-5 pb-8 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Checklist</h1>
          <p className="text-sm text-stone-400 mt-0.5">{doneCount}/{tasks.length} done · {pct}% complete</p>
        </div>
        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-stone-50 border-2 border-stone-200 relative">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 48 48">
            <circle cx="24" cy="24" r="20" fill="none" stroke="#e7e5e4" strokeWidth="4" />
            <circle cx="24" cy="24" r="20" fill="none" stroke={pct === 100 ? '#10b981' : '#e11d48'} strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 20}`}
              strokeDashoffset={`${2 * Math.PI * 20 * (1 - pct / 100)}`}
              strokeLinecap="round" />
          </svg>
          <span className="text-xs font-bold text-stone-700 relative">{pct}%</span>
        </div>
      </div>

      {/* Filter + actions */}
      <div className="flex items-center gap-2">
        <div className="flex bg-white border border-stone-200 rounded-lg overflow-hidden flex-1">
          {(['all', 'pending', 'done'] as const).map(f => (
            <button key={f} onClick={() => setTaskFilter(f)}
              className={`flex-1 text-xs py-2 font-medium transition-colors ${taskFilter === f ? 'bg-rose-700 text-white' : 'text-stone-500 hover:bg-stone-50'}`}>
              {f === 'all' ? `All (${tasks.length})` : f === 'pending' ? `Pending (${tasks.filter(t => t.status !== 'done').length})` : `Done (${doneCount})`}
            </button>
          ))}
        </div>
        <button onClick={() => { setBulkMode(v => !v); setSelectedTaskIds(new Set()) }}
          className={`flex items-center gap-1 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${bulkMode ? 'bg-stone-800 text-white border-stone-800' : 'bg-white border-stone-200 text-stone-600'}`}>
          <SlidersHorizontal className="w-3.5 h-3.5" /><span className="hidden md:inline ml-1">Select</span>
        </button>
        <button onClick={() => setShowTemplate(true)}
          className="flex items-center gap-1 bg-stone-100 text-stone-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-stone-200">
          <LayoutTemplate className="w-3.5 h-3.5" /><span className="hidden md:inline ml-1">Template</span>
        </button>
        <button onClick={() => setShowAddTask(v => !v)}
          className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800">
          <Plus className="w-3.5 h-3.5" /><span className="hidden md:inline ml-1">Add task</span>
        </button>
      </div>

      {/* Bulk bar */}
      {bulkMode && selectedTaskIds.size > 0 && (
        <div className="flex items-center gap-2 bg-stone-900 text-white rounded-xl px-4 py-2.5">
          <span className="text-xs flex-1 font-medium">{selectedTaskIds.size} selected</span>
          <button onClick={handleBulkComplete} className="text-xs bg-emerald-600 px-3 py-1.5 rounded-lg hover:bg-emerald-700">Mark done</button>
          <button onClick={handleBulkDelete} className="text-xs bg-red-600 px-3 py-1.5 rounded-lg hover:bg-red-700">Delete</button>
          <button onClick={() => { setSelectedTaskIds(new Set()); setBulkMode(false) }} className="text-stone-400 hover:text-white ml-1"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Add task form */}
      {showAddTask && (
        <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-3">
          <Input value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
            placeholder="Task title" autoFocus onKeyDown={e => { if (e.key === 'Enter') handleAddTask() }} />
          <div className="flex gap-2">
            <Input value={newTaskCat} onChange={e => setNewTaskCat(e.target.value)} placeholder="Category" className="flex-1" />
            <Input type="date" value={newTaskDue} onChange={e => setNewTaskDue(e.target.value)} className="flex-1" min={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[{ label: 'Today', days: 0 }, { label: '+1 week', days: 7 }, { label: '+2 weeks', days: 14 }, { label: '+1 month', days: 30 }].map(({ label, days }) => {
              const d = new Date(); d.setDate(d.getDate() + days)
              const v = d.toISOString().slice(0, 10)
              return (
                <button key={label} onClick={() => setNewTaskDue(v)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${newTaskDue === v ? 'bg-rose-700 text-white border-rose-700' : 'bg-stone-50 border-stone-200 text-stone-600 hover:border-rose-300'}`}>
                  {label}
                </button>
              )
            })}
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAddTask(false)} className="text-xs text-stone-500 px-3 py-1.5">Cancel</button>
            <button onClick={handleAddTask} disabled={!newTaskTitle.trim() || isPending}
              className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">Add</button>
          </div>
        </div>
      )}

      {/* Template modal */}
      {showTemplate && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowTemplate(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between flex-shrink-0">
              <div>
                <p className="font-bold text-stone-900">Task Template</p>
                <p className="text-xs text-stone-400">45 tasks across 9 categories</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setTemplateSelected(new Set(TASK_TEMPLATE.map((_, i) => i)))} className="text-xs text-rose-600">Select all</button>
                <button onClick={() => setTemplateSelected(new Set())} className="text-xs text-stone-400">Clear</button>
                <button onClick={() => setShowTemplate(false)}><X className="w-5 h-5 text-stone-400" /></button>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {Object.entries(
                TASK_TEMPLATE.reduce<Record<string, Array<{ t: typeof TASK_TEMPLATE[0]; i: number }>>>((acc, t, i) => {
                  acc[t.category] = acc[t.category] || []
                  acc[t.category].push({ t, i })
                  return acc
                }, {})
              ).map(([cat, items]) => (
                <div key={cat} className="bg-stone-50 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-stone-100">
                    <p className="text-xs font-semibold text-stone-700">{cat}</p>
                    <span className="text-[10px] text-stone-400">{items.length} tasks</span>
                  </div>
                  {items.map(({ t, i }) => (
                    <label key={i} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-stone-100">
                      <input type="checkbox" checked={templateSelected.has(i)}
                        onChange={() => setTemplateSelected(prev => { const next = new Set(prev); next.has(i) ? next.delete(i) : next.add(i); return next })}
                        className="rounded border-stone-300 text-rose-700" />
                      <span className="text-xs text-stone-700">{t.title}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-stone-100 flex justify-between items-center flex-shrink-0">
              <span className="text-xs text-stone-500">{templateSelected.size} selected</span>
              <button onClick={handleLoadTemplate} disabled={!templateSelected.size || isPending}
                className="text-sm bg-rose-700 text-white px-5 py-2 rounded-xl hover:bg-rose-800 disabled:opacity-50 font-medium">
                Add {templateSelected.size} tasks
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task list */}
      {Object.keys(tasksByCategory).length === 0 ? (
        <div className="text-center py-14">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-stone-200" />
          <p className="text-stone-500 text-sm">
            {taskFilter === 'done' ? 'Nothing completed yet'
              : tasks.length === 0 ? <span>No tasks yet — <button onClick={() => setShowTemplate(true)} className="text-rose-600 underline">load template</button></span>
              : 'All tasks done! 🎉'}
          </p>
        </div>
      ) : (
        Object.entries(tasksByCategory).map(([cat, catTasks]) => {
          const catDone = catTasks.filter(t => t.status === 'done').length
          return (
            <div key={cat} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50 border-b border-stone-100">
                <p className="text-xs font-semibold text-stone-600">{cat}</p>
                <p className="text-xs text-stone-400">{catDone}/{catTasks.length}</p>
              </div>
              <div className="divide-y divide-stone-50">
                {catTasks.map(task => {
                  const Icon = task.status === 'done' ? CheckCircle2 : task.status === 'in_progress' ? CircleDot : Circle
                  const overdue = isOverdue(task.due_date) && task.status !== 'done'
                  const isSelected = selectedTaskIds.has(task.id)
                  return (
                    <div key={task.id} className={`flex items-start gap-3 px-4 py-3 hover:bg-stone-50 group transition-colors ${isSelected ? 'bg-rose-50' : ''}`}>
                      {bulkMode ? (
                        <input type="checkbox" checked={isSelected} onChange={() => toggleTaskSelect(task.id)}
                          className="mt-0.5 flex-shrink-0 rounded border-stone-300 text-rose-700" />
                      ) : (
                        <button onClick={() => cycleStatus(task)}
                          className={`mt-0.5 flex-shrink-0 ${task.status === 'done' ? 'text-emerald-500' : task.status === 'in_progress' ? 'text-blue-500' : 'text-stone-300'}`}>
                          <Icon className="w-[18px] h-[18px]" />
                        </button>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${task.status === 'done' ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                          {task.title}
                          {task.ai_generated && task.status === 'pending' && (
                            <span className="ml-1.5 text-[10px] bg-violet-100 text-violet-500 px-1 py-0.5 rounded font-medium">AI</span>
                          )}
                        </p>
                        {task.due_date && (
                          <p className={`text-xs mt-0.5 flex items-center gap-1 ${overdue ? 'text-red-500 font-medium' : 'text-stone-400'}`}>
                            <Bell className="w-3 h-3" />
                            {overdue ? 'Overdue · ' : ''}{fmtDate(task.due_date)}
                          </p>
                        )}
                        {task.notes && <p className="text-xs text-stone-400 mt-0.5">{task.notes}</p>}
                      </div>
                      {!bulkMode && (
                        <button onClick={() => handleDeleteTask(task)}
                          className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-400 transition-all flex-shrink-0 mt-0.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
