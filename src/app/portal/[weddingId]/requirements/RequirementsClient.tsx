'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, ChevronDown, ChevronUp, Check, Circle } from 'lucide-react'
import { addRequirement, updateRequirement, deleteRequirement } from './actions'

interface Requirement {
  id: string
  title: string
  description: string | null
  priority: string
  status: string
  side: string
  created_at: string
}

interface Props {
  weddingId: string
  initialRequirements: Requirement[]
}

const PRIORITY_COLOR: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-stone-100 text-stone-500 border-stone-200',
}

const SIDES = ['both', 'bride', 'groom'] as const
const PRIORITIES = ['high', 'medium', 'low'] as const

export default function RequirementsClient({ weddingId, initialRequirements }: Props) {
  const [requirements, setRequirements] = useState<Requirement[]>(initialRequirements)
  const [isPending, startTransition] = useTransition()

  // Add form state
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [side, setSide] = useState<'both' | 'bride' | 'groom'>('both')
  const [saving, setSaving] = useState(false)

  // Expanded descriptions
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const open   = requirements.filter(r => r.status !== 'done')
  const done   = requirements.filter(r => r.status === 'done')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    const optimistic: Requirement = {
      id: `opt-${Date.now()}`,
      title: title.trim(),
      description: description.trim() || null,
      priority,
      side,
      status: 'pending',
      created_at: new Date().toISOString(),
    }
    setRequirements(prev => [optimistic, ...prev])
    setTitle(''); setDescription(''); setShowForm(false)

    const res = await addRequirement(weddingId, { title: optimistic.title, description: optimistic.description ?? undefined, priority, side })
    if ('error' in res) {
      toast.error(res.error)
      setRequirements(prev => prev.filter(r => r.id !== optimistic.id))
    } else {
      setRequirements(prev => prev.map(r => r.id === optimistic.id ? { ...r, id: res.id } : r))
    }
    setSaving(false)
  }

  async function toggleDone(req: Requirement) {
    const next = req.status === 'done' ? 'pending' : 'done'
    setRequirements(prev => prev.map(r => r.id === req.id ? { ...r, status: next } : r))
    const res = await updateRequirement(weddingId, req.id, { status: next })
    if ('error' in res) {
      toast.error(res.error)
      setRequirements(prev => prev.map(r => r.id === req.id ? { ...r, status: req.status } : r))
    }
  }

  async function handleDelete(req: Requirement) {
    setRequirements(prev => prev.filter(r => r.id !== req.id))
    const res = await deleteRequirement(weddingId, req.id)
    if ('error' in res) {
      toast.error(res.error)
      setRequirements(prev => [...prev, req].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function ReqRow({ req }: { req: Requirement }) {
    const isExpanded = expanded.has(req.id)
    const isDone = req.status === 'done'
    return (
      <div className={`border rounded-xl overflow-hidden transition-all ${isDone ? 'border-stone-100 bg-stone-50' : 'border-stone-200 bg-white'}`}>
        <div className="flex items-center gap-3 px-3 py-3">
          <button
            onClick={() => toggleDone(req)}
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
              isDone ? 'border-emerald-400 bg-emerald-400' : 'border-stone-300 hover:border-rose-400'
            }`}
          >
            {isDone && <Check className="w-3 h-3 text-white" />}
          </button>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium leading-snug ${isDone ? 'line-through text-stone-400' : 'text-stone-800'}`}>
              {req.title}
            </p>
            {req.description && !isExpanded && (
              <p className="text-xs text-stone-400 truncate mt-0.5">{req.description}</p>
            )}
            {req.description && isExpanded && (
              <p className="text-xs text-stone-500 mt-1 whitespace-pre-wrap">{req.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${PRIORITY_COLOR[req.priority]}`}>
              {req.priority}
            </span>
            {req.side !== 'both' && (
              <span className="text-xs text-stone-400 capitalize">{req.side}</span>
            )}
            {req.description && (
              <button onClick={() => toggleExpand(req.id)} className="text-stone-300 hover:text-stone-500">
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            )}
            <button
              onClick={() => handleDelete(req)}
              className="text-stone-300 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">My Requirements</h2>
          <p className="text-sm text-stone-400 mt-0.5">
            Share your wishes and preferences with your planning team
          </p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 px-3 py-2 bg-rose-700 text-white text-sm rounded-lg hover:bg-rose-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
          <div>
            <input
              type="text"
              placeholder="What do you want? (e.g. String lights all around the venue)"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200"
            />
          </div>
          <div>
            <textarea
              placeholder="Any details, references, or context… (optional)"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-500">Priority</span>
              {PRIORITIES.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`text-xs px-2 py-1 rounded-md border transition-colors capitalize ${
                    priority === p
                      ? PRIORITY_COLOR[p]
                      : 'border-stone-200 text-stone-500 hover:border-stone-300'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-stone-500">For</span>
              {SIDES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSide(s)}
                  className={`text-xs px-2 py-1 rounded-md border transition-colors capitalize ${
                    side === s
                      ? 'border-rose-300 bg-rose-100 text-rose-700'
                      : 'border-stone-200 text-stone-500 hover:border-stone-300'
                  }`}
                >
                  {s === 'both' ? 'Both' : s}
                </button>
              ))}
            </div>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setTitle(''); setDescription('') }}
                className="text-xs text-stone-500 hover:text-stone-700 px-2 py-1"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="text-xs bg-rose-700 text-white px-3 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save requirement'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Open requirements */}
      {open.length > 0 && (
        <div className="space-y-2">
          {open.map(req => <ReqRow key={req.id} req={req} />)}
        </div>
      )}

      {/* Empty state */}
      {requirements.length === 0 && !showForm && (
        <div className="text-center py-12 text-stone-400">
          <Circle className="w-10 h-10 mx-auto mb-3 text-stone-200" />
          <p className="text-sm font-medium">No requirements yet</p>
          <p className="text-xs mt-1">Add your wishes — decor, food, music, anything!</p>
        </div>
      )}

      {/* Done */}
      {done.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">
            Addressed ({done.length})
          </p>
          <div className="space-y-2 opacity-60">
            {done.map(req => <ReqRow key={req.id} req={req} />)}
          </div>
        </div>
      )}
    </div>
  )
}
