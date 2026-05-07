'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Flame, Check } from 'lucide-react'
import { addRitual, toggleRitual, deleteRitual } from '../actions'

type Ritual = {
  id: string
  function_id: string | null
  name: string
  description: string | null
  time_of_day: string | null
  duration_minutes: number | null
  pandit_required: boolean
  items_required: string[]
  is_done: boolean
}

type Fn = { id: string; name: string }

const TIME_OF_DAY = ['morning', 'afternoon', 'evening', 'night']

const RITUAL_PRESETS: string[] = [
  'Ganesh Puja', 'Mehandi', 'Haldi', 'Sagai (Engagement)', 'Jaimala', 'Kanya Daan',
  'Saptapadi (7 pheras)', 'Sindoor ceremony', 'Vidaai', 'Griha Pravesh', 'Aarti',
  'Mangalsutra', 'Mangalashtak', 'Gotra Uccharan', 'Var Mala',
]

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:border-rose-300 ${className}`}
      {...props}
    />
  )
}

type Props = {
  celebrationId: string
  initialRituals: Ritual[]
  functions: Fn[]
}

export default function RitualsClient({ celebrationId, initialRituals, functions }: Props) {
  const [rituals, setRituals] = useState<Ritual[]>(initialRituals)
  const [showAdd, setShowAdd] = useState(false)
  const [filterFn, setFilterFn] = useState('all')
  const [form, setForm] = useState({
    name: '', function_id: '', description: '', time_of_day: '',
    duration_minutes: '', pandit_required: false, items_input: '',
  })
  const [isPending, startTransition] = useTransition()

  const filtered = filterFn === 'all' ? rituals : rituals.filter(r => r.function_id === filterFn)
  const doneCount = rituals.filter(r => r.is_done).length

  function handleAdd() {
    if (!form.name.trim()) return
    const items = form.items_input ? form.items_input.split(',').map(s => s.trim()).filter(Boolean) : []
    startTransition(async () => {
      const res = await addRitual(celebrationId, {
        name: form.name,
        function_id: form.function_id || undefined,
        description: form.description || undefined,
        time_of_day: form.time_of_day || undefined,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : undefined,
        pandit_required: form.pandit_required,
        items_required: items,
      })
      if ('error' in res) { toast.error(res.error); return }
      setRituals(prev => [...prev, {
        id: res.id, function_id: form.function_id || null, name: form.name,
        description: form.description || null, time_of_day: form.time_of_day || null,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
        pandit_required: form.pandit_required, items_required: items, is_done: false,
      }])
      setForm({ name: '', function_id: '', description: '', time_of_day: '', duration_minutes: '', pandit_required: false, items_input: '' })
      setShowAdd(false)
      toast.success('Ritual added')
    })
  }

  function handleToggle(ritual: Ritual) {
    const next = !ritual.is_done
    setRituals(prev => prev.map(r => r.id === ritual.id ? { ...r, is_done: next } : r))
    startTransition(async () => { await toggleRitual(ritual.id, next) })
  }

  // Group by function
  const ungrouped = filtered.filter(r => !r.function_id)
  const byFunction = functions.map(fn => ({
    fn,
    items: filtered.filter(r => r.function_id === fn.id),
  })).filter(g => g.items.length > 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-800">Rituals & Ceremonies</p>
          <p className="text-xs text-stone-400">{doneCount}/{rituals.length} completed</p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {/* Function filter */}
      {functions.length > 0 && rituals.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <button onClick={() => setFilterFn('all')} className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${filterFn === 'all' ? 'bg-rose-700 text-white' : 'bg-white border border-stone-200 text-stone-600'}`}>All</button>
          {functions.map(fn => <button key={fn.id} onClick={() => setFilterFn(fn.id)} className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${filterFn === fn.id ? 'bg-rose-700 text-white' : 'bg-white border border-stone-200 text-stone-600'}`}>{fn.name}</button>)}
        </div>
      )}

      {showAdd && (
        <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-3">
          <div>
            <p className="text-xs text-stone-400 mb-2">Quick add:</p>
            <div className="flex flex-wrap gap-1.5">
              {RITUAL_PRESETS.map(p => (
                <button key={p} onClick={() => setForm(f => ({ ...f, name: p }))}
                  className="text-[11px] px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-full hover:bg-rose-100 transition-colors">{p}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-stone-500 mb-1 block">Ritual name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Kanya Daan" autoFocus />
            </div>
            {functions.length > 0 && (
              <div>
                <label className="text-xs text-stone-500 mb-1 block">Function</label>
                <select value={form.function_id} onChange={e => setForm(f => ({ ...f, function_id: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                  <option value="">General</option>
                  {functions.map(fn => <option key={fn.id} value={fn.id}>{fn.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Time of day</label>
              <select value={form.time_of_day} onChange={e => setForm(f => ({ ...f, time_of_day: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                <option value="">Any</option>
                {TIME_OF_DAY.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Duration (mins)</label>
              <Input type="number" min="5" step="5" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} placeholder="30" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-stone-500 mb-1 block">Items required (comma separated)</label>
              <Input value={form.items_input} onChange={e => setForm(f => ({ ...f, items_input: e.target.value }))} placeholder="Kalash, Flowers, Akshat…" />
            </div>
            <div className="col-span-2">
              <label className="flex items-center gap-2 text-xs text-stone-600 cursor-pointer">
                <input type="checkbox" checked={form.pandit_required} onChange={e => setForm(f => ({ ...f, pandit_required: e.target.checked }))} className="rounded" />
                Pandit required
              </label>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-stone-500 mb-1 block">Notes</label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Any special notes…" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="text-xs text-stone-500 px-3 py-1.5">Cancel</button>
            <button onClick={handleAdd} disabled={!form.name.trim() || isPending}
              className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">Add</button>
          </div>
        </div>
      )}

      {rituals.length === 0 && !showAdd ? (
        <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
          <Flame className="w-10 h-10 mx-auto mb-3 text-stone-200" />
          <p className="text-stone-500 text-sm">No rituals tracked yet</p>
          <button onClick={() => setShowAdd(true)} className="text-xs text-rose-600 mt-2">+ Add first ritual</button>
        </div>
      ) : (
        <div className="space-y-4">
          {byFunction.map(({ fn, items }) => (
            <div key={fn.id}>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">{fn.name}</p>
              <RitualList rituals={items} onToggle={handleToggle} onDelete={(r) => {
                setRituals(prev => prev.filter(x => x.id !== r.id))
                startTransition(async () => {
                  const res = await deleteRitual(r.id)
                  if ('error' in res) { toast.error(res.error); setRituals(prev => [...prev, r]) }
                })
              }} />
            </div>
          ))}
          {ungrouped.length > 0 && (
            <div>
              {byFunction.length > 0 && <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">General</p>}
              <RitualList rituals={ungrouped} onToggle={handleToggle} onDelete={(r) => {
                setRituals(prev => prev.filter(x => x.id !== r.id))
                startTransition(async () => {
                  const res = await deleteRitual(r.id)
                  if ('error' in res) { toast.error(res.error); setRituals(prev => [...prev, r]) }
                })
              }} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function RitualList({ rituals, onToggle, onDelete }: { rituals: Ritual[]; onToggle: (r: Ritual) => void; onDelete: (r: Ritual) => void }) {
  return (
    <div className="space-y-2">
      {rituals.map(ritual => (
        <div key={ritual.id} className={`bg-white border rounded-xl p-3 transition-colors ${ritual.is_done ? 'border-emerald-100' : 'border-stone-100'}`}>
          <div className="flex items-start gap-3">
            <button
              onClick={() => onToggle(ritual)}
              className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${ritual.is_done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-stone-200 hover:border-rose-400'}`}
            >
              {ritual.is_done && <Check className="w-2.5 h-2.5" />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${ritual.is_done ? 'line-through text-stone-400' : 'text-stone-800'}`}>{ritual.name}</p>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {ritual.time_of_day && <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded capitalize">{ritual.time_of_day}</span>}
                {ritual.duration_minutes && <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">{ritual.duration_minutes} min</span>}
                {ritual.pandit_required && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">Pandit needed</span>}
              </div>
              {ritual.items_required && ritual.items_required.length > 0 && (
                <p className="text-[11px] text-stone-400 mt-1">Items: {ritual.items_required.join(', ')}</p>
              )}
              {ritual.description && <p className="text-xs text-stone-400 mt-1 italic">{ritual.description}</p>}
            </div>
            <button onClick={() => onDelete(ritual)} className="text-stone-200 hover:text-red-400 transition-colors flex-shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
