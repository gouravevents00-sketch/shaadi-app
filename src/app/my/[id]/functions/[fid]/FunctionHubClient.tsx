'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { ArrowLeft, Users, CheckSquare, Store, Clock, MapPin, Calendar, Plus, Check } from 'lucide-react'
import Link from 'next/link'
import { addTask, updateTaskStatus } from '../../actions'

type CelebFunction = {
  id: string
  name: string
  date: string
  start_time: string | null
  end_time: string | null
  venue_space: string | null
  expected_count: number | null
  notes: string | null
}

type Task = {
  id: string
  title: string
  category: string
  status: 'pending' | 'in_progress' | 'done'
  due_date: string | null
}

type Guest = {
  id: string
  name: string
  phone: string | null
  rsvp_status: string
  guest_functions: string[] | null
}

type Vendor = {
  id: string
  name: string
  category: string
  phone: string | null
  status: string
  total_amount: number
  advance_paid: number
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtTime(t: string) { return t.slice(0, 5) }

type Props = {
  celebrationId: string
  plan: string
  fn: CelebFunction
  tasks: Task[]
  attendingGuests: Guest[]
  allGuests: Guest[]
  vendors: Vendor[]
}

const VENDOR_STATUS_COLORS: Record<string, string> = {
  enquired: 'bg-stone-100 text-stone-600',
  confirmed: 'bg-blue-100 text-blue-700',
  booked: 'bg-purple-100 text-purple-700',
  paid: 'bg-emerald-100 text-emerald-700',
}

export default function FunctionHubClient({ celebrationId, plan, fn, tasks: initialTasks, attendingGuests, allGuests, vendors }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [activeTab, setActiveTab] = useState<'overview' | 'guests' | 'tasks' | 'vendors'>('overview')
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTask, setNewTask] = useState('')
  const [isPending, startTransition] = useTransition()

  const confirmedGuests = attendingGuests.filter(g => g.rsvp_status === 'confirmed')
  const pendingGuests = attendingGuests.filter(g => g.rsvp_status === 'pending')
  const doneTasks = tasks.filter(t => t.status === 'done').length
  const totalTasks = tasks.length

  function handleAddTask() {
    if (!newTask.trim()) return
    startTransition(async () => {
      const res = await addTask(celebrationId, newTask.trim(), fn.name)
      if ('error' in res) { toast.error(res.error); return }
      setTasks(prev => [...prev, { id: res.id, title: newTask.trim(), category: fn.name, status: 'pending', due_date: null }])
      setNewTask('')
      setShowAddTask(false)
      toast.success('Task added')
    })
  }

  function cycleTaskStatus(task: Task) {
    const next: Task['status'] = task.status === 'pending' ? 'in_progress' : task.status === 'in_progress' ? 'done' : 'pending'
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t))
    startTransition(async () => { await updateTaskStatus(task.id, next) })
  }

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Calendar },
    { id: 'guests' as const, label: `Guests (${attendingGuests.length})`, icon: Users },
    { id: 'tasks' as const, label: `Tasks (${doneTasks}/${totalTasks})`, icon: CheckSquare },
    { id: 'vendors' as const, label: 'Vendors', icon: Store },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/my/${celebrationId}`} className="w-8 h-8 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-stone-900 text-lg leading-tight">{fn.name}</h1>
          {fn.date && <p className="text-xs text-stone-400">{fmtDate(fn.date)}</p>}
        </div>
      </div>

      {/* Quick info bar */}
      <div className="flex flex-wrap gap-2">
        {fn.start_time && (
          <div className="flex items-center gap-1.5 bg-white border border-stone-100 rounded-lg px-3 py-1.5">
            <Clock className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-xs text-stone-600">{fmtTime(fn.start_time)}{fn.end_time ? ` – ${fmtTime(fn.end_time)}` : ''}</span>
          </div>
        )}
        {fn.venue_space && (
          <div className="flex items-center gap-1.5 bg-white border border-stone-100 rounded-lg px-3 py-1.5">
            <MapPin className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-xs text-stone-600">{fn.venue_space}</span>
          </div>
        )}
        {fn.expected_count && (
          <div className="flex items-center gap-1.5 bg-white border border-stone-100 rounded-lg px-3 py-1.5">
            <Users className="w-3.5 h-3.5 text-stone-400" />
            <span className="text-xs text-stone-600">{fn.expected_count} expected</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto bg-stone-100 rounded-xl p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-white text-stone-800 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white border border-stone-100 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-stone-900">{attendingGuests.length}</p>
              <p className="text-[10px] text-stone-400">Guests</p>
            </div>
            <div className="bg-white border border-stone-100 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-emerald-600">{confirmedGuests.length}</p>
              <p className="text-[10px] text-stone-400">Confirmed</p>
            </div>
            <div className="bg-white border border-stone-100 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-stone-900">{totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0}%</p>
              <p className="text-[10px] text-stone-400">Tasks done</p>
            </div>
          </div>

          {fn.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-700 mb-1">Notes</p>
              <p className="text-sm text-amber-800">{fn.notes}</p>
            </div>
          )}

          {/* Quick pending items */}
          {tasks.filter(t => t.status !== 'done').length > 0 && (
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Pending tasks</p>
              <div className="space-y-2">
                {tasks.filter(t => t.status !== 'done').slice(0, 5).map(t => (
                  <div key={t.id} className="flex items-center gap-2">
                    <button onClick={() => cycleTaskStatus(t)} className="w-4 h-4 rounded border-2 border-stone-200 flex-shrink-0 hover:border-rose-400 transition-colors" />
                    <p className="text-sm text-stone-700 flex-1">{t.title}</p>
                  </div>
                ))}
              </div>
              {tasks.filter(t => t.status !== 'done').length > 5 && (
                <button onClick={() => setActiveTab('tasks')} className="text-xs text-rose-600 mt-2">
                  View all {tasks.filter(t => t.status !== 'done').length} pending tasks
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'guests' && (
        <div className="space-y-3">
          {/* RSVP breakdown */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-emerald-700">{confirmedGuests.length}</p>
              <p className="text-[10px] text-emerald-600">Confirmed</p>
            </div>
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-amber-700">{pendingGuests.length}</p>
              <p className="text-[10px] text-amber-600">Pending</p>
            </div>
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-red-600">{attendingGuests.filter(g => g.rsvp_status === 'declined').length}</p>
              <p className="text-[10px] text-red-500">Declined</p>
            </div>
          </div>

          {attendingGuests.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-stone-200 rounded-xl">
              <Users className="w-8 h-8 mx-auto mb-2 text-stone-200" />
              <p className="text-stone-500 text-sm">No guests linked to this function</p>
              <p className="text-xs text-stone-400 mt-1">Assign guests from the Guests section</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {attendingGuests.map(g => (
                <div key={g.id} className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl px-3 py-2.5">
                  <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{g.name[0]}</div>
                  <span className="text-sm text-stone-700 flex-1">{g.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${g.rsvp_status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : g.rsvp_status === 'declined' ? 'bg-red-100 text-red-500' : 'bg-stone-100 text-stone-500'}`}>
                    {g.rsvp_status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'tasks' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-stone-500">{doneTasks}/{totalTasks} done</p>
            <button
              onClick={() => setShowAddTask(v => !v)}
              className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add task
            </button>
          </div>

          {showAddTask && (
            <div className="flex gap-2">
              <input
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddTask() }}
                placeholder={`Task for ${fn.name}…`}
                className="flex-1 text-sm px-3 py-2 border border-stone-200 bg-white rounded-lg focus:outline-none focus:border-rose-300"
                autoFocus
              />
              <button onClick={handleAddTask} disabled={!newTask.trim() || isPending} className="bg-rose-700 text-white text-xs px-4 rounded-lg disabled:opacity-50">Add</button>
              <button onClick={() => setShowAddTask(false)} className="text-stone-400 text-xs px-2">✕</button>
            </div>
          )}

          {tasks.length === 0 && !showAddTask ? (
            <div className="text-center py-10 border border-dashed border-stone-200 rounded-xl">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 text-stone-200" />
              <p className="text-stone-500 text-sm">No tasks for this function</p>
              <button onClick={() => setShowAddTask(true)} className="text-xs text-rose-600 mt-2">+ Add first task</button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl px-3 py-2.5">
                  <button
                    onClick={() => cycleTaskStatus(task)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500 text-white' : task.status === 'in_progress' ? 'border-amber-400' : 'border-stone-200 hover:border-rose-400'}`}
                  >
                    {task.status === 'done' && <Check className="w-2.5 h-2.5" />}
                    {task.status === 'in_progress' && <div className="w-2 h-2 rounded-full bg-amber-400" />}
                  </button>
                  <p className={`text-sm flex-1 ${task.status === 'done' ? 'line-through text-stone-400' : 'text-stone-700'}`}>{task.title}</p>
                  {task.due_date && <p className="text-[10px] text-stone-400">{new Date(task.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'vendors' && (
        <div className="space-y-2">
          {vendors.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-stone-200 rounded-xl">
              <Store className="w-8 h-8 mx-auto mb-2 text-stone-200" />
              <p className="text-stone-500 text-sm">No vendors added</p>
              <Link href={`/my/${celebrationId}/vendors`} className="text-xs text-rose-600 mt-2 block">+ Add vendors</Link>
            </div>
          ) : (
            vendors.map(v => (
              <div key={v.id} className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl px-3 py-2.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800">{v.name}</p>
                  <p className="text-xs text-stone-400">{v.category}</p>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${VENDOR_STATUS_COLORS[v.status] ?? 'bg-stone-100 text-stone-500'}`}>
                  {v.status}
                </span>
                {v.phone && (
                  <a href={`tel:${v.phone}`} className="text-stone-400 hover:text-green-600 transition-colors">
                    <span className="text-xs">📞</span>
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
