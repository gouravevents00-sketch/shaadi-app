'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Plus, Trash2, CheckCircle2, Circle, CircleDot,
  AlertTriangle, Clock, Filter, ChevronDown,
} from 'lucide-react'
import { createStaffTask, updateStaffTaskStatus, deleteStaffTask } from '../day/actions'

// ── Types ──────────────────────────────────────────────────────

interface TeamMember { id: string; userId: string; name: string; role: string }
interface WEvent { id: string; name: string; date: string }

interface StaffTask {
  id: string
  title: string
  description: string | null
  category: string
  priority: string
  status: string
  due_date: string | null
  due_time: string | null
  assigned_to: string | null
  assigned_name: string | null
  event_id: string | null
  completed_at: string | null
  created_at: string
}

// ── Constants ──────────────────────────────────────────────────

const CATEGORIES = ['general', 'setup', 'decor', 'guest', 'vendor', 'logistics', 'hospitality', 'fb']
const PRIORITIES = ['low', 'medium', 'high', 'urgent']

const PRIORITY_STYLE: Record<string, string> = {
  low:    'bg-stone-100 text-stone-500',
  medium: 'bg-blue-100 text-blue-700',
  high:   'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-600',
}

const STATUS_ICON: Record<string, React.ElementType> = {
  pending:     Circle,
  in_progress: CircleDot,
  done:        CheckCircle2,
  blocked:     AlertTriangle,
}

const STATUS_NEXT: Record<string, string> = {
  pending: 'in_progress', in_progress: 'done', done: 'pending', blocked: 'in_progress',
}

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ── Main Component ─────────────────────────────────────────────

export default function StaffTasksPanel({
  weddingId, teamMembers, events, initialTasks,
}: {
  weddingId: string
  teamMembers: TeamMember[]
  events: WEvent[]
  initialTasks: StaffTask[]
}) {
  const [tasks, setTasks] = useState<StaffTask[]>(initialTasks)
  const [modal, setModal] = useState(false)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [form, setForm] = useState({
    title: '', description: '', category: 'general', priority: 'medium',
    assigned_to: '', due_date: '', due_time: '', event_id: '',
  })

  // ── Derived ─────────────────────────────────────────────────

  const filtered = tasks.filter(t =>
    (filterStatus === 'all' || t.status === filterStatus) &&
    (filterAssignee === 'all' || t.assigned_to === filterAssignee)
  )

  const stats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    urgent: tasks.filter(t => t.priority === 'urgent' && t.status !== 'done').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
  }

  // ── Handlers ────────────────────────────────────────────────

  async function handleCreate() {
    if (!form.title.trim()) { toast.error('Add a title'); return }
    const member = teamMembers.find(m => m.userId === form.assigned_to)
    const r = await createStaffTask(weddingId, {
      title: form.title.trim(),
      description: form.description || undefined,
      category: form.category,
      priority: form.priority,
      assigned_to: form.assigned_to || null,
      assigned_name: member?.name ?? null,
      due_date: form.due_date || null,
      due_time: form.due_time || null,
      event_id: form.event_id || null,
    })
    if ('error' in r) { toast.error(r.error); return }
    const ev = events.find(e => e.id === form.event_id) ?? null
    setTasks(prev => [{
      ...(r as StaffTask),
      assigned_name: member?.name ?? null,
    }, ...prev])
    setModal(false)
    setForm({ title: '', description: '', category: 'general', priority: 'medium', assigned_to: '', due_date: '', due_time: '', event_id: '' })
    toast.success('Task created')
  }

  async function handleCycleStatus(task: StaffTask) {
    const next = STATUS_NEXT[task.status] ?? 'pending'
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t))
    const r = await updateStaffTaskStatus(weddingId, task.id, next)
    if ('error' in r) {
      toast.error(r.error)
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t))
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm('Delete this task?')) return
    const r = await deleteStaffTask(weddingId, taskId)
    if ('error' in r) { toast.error(r.error); return }
    setTasks(prev => prev.filter(t => t.id !== taskId))
    toast.success('Deleted')
  }

  // ── Group by assignee ────────────────────────────────────────

  const byAssignee: Record<string, StaffTask[]> = {}
  filtered.forEach(t => {
    const key = t.assigned_name ?? 'Unassigned'
    if (!byAssignee[key]) byAssignee[key] = []
    byAssignee[key].push(t)
  })

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-stone-900">Staff Tasks</h2>
          <p className="text-sm text-stone-400 mt-0.5">
            {stats.done}/{stats.total} done
            {stats.urgent > 0 && <span className="text-red-500 ml-2">· {stats.urgent} urgent</span>}
            {stats.blocked > 0 && <span className="text-amber-600 ml-2">· {stats.blocked} blocked</span>}
          </p>
        </div>
        <Button size="sm" onClick={() => setModal(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Task
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-3.5 h-3.5 text-stone-400" />
        {(['all', 'pending', 'in_progress', 'done', 'blocked'] as const).map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors capitalize ${
              filterStatus === s ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-200 text-stone-600 hover:bg-stone-50'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
        <select
          value={filterAssignee}
          onChange={e => setFilterAssignee(e.target.value)}
          className="ml-auto text-xs border border-stone-200 rounded-lg px-2 py-1 bg-white text-stone-600 outline-none"
        >
          <option value="all">All members</option>
          {teamMembers.map(m => <option key={m.userId} value={m.userId}>{m.name}</option>)}
          <option value="">Unassigned</option>
        </select>
      </div>

      {/* Tasks grouped by assignee */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{tasks.length === 0 ? 'No tasks yet — create the first one' : 'No tasks match this filter'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byAssignee).sort(([a], [b]) => a === 'Unassigned' ? 1 : b === 'Unassigned' ? -1 : a.localeCompare(b)).map(([name, assigneeTasks]) => (
            <div key={name}>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">{name} · {assigneeTasks.filter(t => t.status === 'done').length}/{assigneeTasks.length}</p>
              <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                {assigneeTasks.map((task, i) => {
                  const StatusIcon = STATUS_ICON[task.status] ?? Circle
                  const iconColor = task.status === 'done' ? 'text-emerald-500'
                    : task.status === 'in_progress' ? 'text-blue-500'
                    : task.status === 'blocked' ? 'text-red-400'
                    : 'text-stone-300'
                  const ev = events.find(e => e.id === task.event_id)
                  return (
                    <div key={task.id} className={`flex items-start gap-3 px-4 py-3 ${i < assigneeTasks.length - 1 ? 'border-b border-stone-100' : ''}`}>
                      <button onClick={() => handleCycleStatus(task)} className={`flex-shrink-0 mt-0.5 transition-colors hover:scale-110 ${iconColor}`}>
                        <StatusIcon className="w-4 h-4" />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-stone-400' : 'text-stone-900'}`}>
                          {task.title}
                        </p>
                        {task.description && <p className="text-xs text-stone-400 mt-0.5">{task.description}</p>}
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <Badge className={`${PRIORITY_STYLE[task.priority]} border-0 text-[10px] capitalize`}>{task.priority}</Badge>
                          <span className="text-[10px] text-stone-400 capitalize bg-stone-50 px-1.5 py-0.5 rounded">{task.category}</span>
                          {task.due_date && (
                            <span className="text-[10px] text-stone-400 flex items-center gap-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              {fmtDate(task.due_date)}{task.due_time ? ` ${task.due_time.slice(0, 5)}` : ''}
                            </span>
                          )}
                          {ev && <span className="text-[10px] text-rose-600">{ev.name}</span>}
                        </div>
                      </div>
                      <button onClick={() => handleDelete(task.id)} className="p-1.5 text-stone-300 hover:text-red-500 transition-colors flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create task modal */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Staff Task</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Title *</label>
              <Input placeholder="Set up welcome arch at entrance" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Description</label>
              <Input placeholder="Additional details..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Category</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v || f.category }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Priority</label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v || f.priority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Assign to</label>
              <Select value={form.assigned_to} onValueChange={v => setForm(f => ({ ...f, assigned_to: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {teamMembers.map(m => <SelectItem key={m.userId} value={m.userId}>{m.name} · {m.role}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Due Date</label>
                <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Due Time</label>
                <Input type="time" value={form.due_time} onChange={e => setForm(f => ({ ...f, due_time: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Linked Event (optional)</label>
              <Select value={form.event_id} onValueChange={v => setForm(f => ({ ...f, event_id: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {events.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={handleCreate}>Create Task</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
