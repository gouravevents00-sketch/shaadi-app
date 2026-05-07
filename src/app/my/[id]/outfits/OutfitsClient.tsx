'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Shirt } from 'lucide-react'
import { addOutfit, updateOutfitStatus, deleteOutfit } from '../actions'

type Outfit = {
  id: string
  person_name: string
  person_role: string | null
  function_name: string | null
  outfit_description: string | null
  color: string | null
  designer_vendor: string | null
  status: string
  notes: string | null
}

type Fn = { id: string; name: string }

const OUTFIT_STATUS = ['planned', 'ordered', 'trial_done', 'ready']
const STATUS_COLORS: Record<string, string> = {
  planned: 'bg-stone-100 text-stone-600',
  ordered: 'bg-blue-100 text-blue-700',
  trial_done: 'bg-amber-100 text-amber-700',
  ready: 'bg-emerald-100 text-emerald-700',
}
const ROLES = ['bride', 'groom', 'family', 'other']

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
  initialOutfits: Outfit[]
  functions: Fn[]
}

export default function OutfitsClient({ celebrationId, initialOutfits, functions }: Props) {
  const [outfits, setOutfits] = useState<Outfit[]>(initialOutfits)
  const [showAdd, setShowAdd] = useState(false)
  const [filterRole, setFilterRole] = useState('all')
  const [form, setForm] = useState({
    person_name: '', person_role: 'bride', function_name: '',
    outfit_description: '', color: '', designer_vendor: '', notes: '',
  })
  const [isPending, startTransition] = useTransition()

  const filtered = filterRole === 'all' ? outfits : outfits.filter(o => o.person_role === filterRole)

  function handleAdd() {
    if (!form.person_name.trim()) return
    startTransition(async () => {
      const res = await addOutfit(celebrationId, {
        person_name: form.person_name,
        person_role: form.person_role || undefined,
        function_name: form.function_name || undefined,
        outfit_description: form.outfit_description || undefined,
        color: form.color || undefined,
        designer_vendor: form.designer_vendor || undefined,
        notes: form.notes || undefined,
      })
      if ('error' in res) { toast.error(res.error); return }
      setOutfits(prev => [...prev, {
        id: res.id,
        person_name: form.person_name,
        person_role: form.person_role || null,
        function_name: form.function_name || null,
        outfit_description: form.outfit_description || null,
        color: form.color || null,
        designer_vendor: form.designer_vendor || null,
        status: 'planned',
        notes: form.notes || null,
      }])
      setForm({ person_name: '', person_role: 'bride', function_name: '', outfit_description: '', color: '', designer_vendor: '', notes: '' })
      setShowAdd(false)
      toast.success('Outfit added')
    })
  }

  const roleGroups = ['bride', 'groom', 'family', 'other']
  const groupedOutfits = roleGroups.reduce<Record<string, Outfit[]>>((acc, role) => {
    const items = filtered.filter(o => (o.person_role || 'other') === role)
    if (items.length) acc[role] = items
    return acc
  }, {})

  const readyCount = outfits.filter(o => o.status === 'ready').length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-800">Outfits</p>
          <p className="text-xs text-stone-400">{outfits.length} outfits · {readyCount} ready</p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {/* Role filter */}
      {outfits.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <button onClick={() => setFilterRole('all')} className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${filterRole === 'all' ? 'bg-rose-700 text-white' : 'bg-white border border-stone-200 text-stone-600'}`}>All</button>
          {ROLES.map(r => <button key={r} onClick={() => setFilterRole(r)} className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap font-medium capitalize transition-colors ${filterRole === r ? 'bg-rose-700 text-white' : 'bg-white border border-stone-200 text-stone-600'}`}>{r}</button>)}
        </div>
      )}

      {showAdd && (
        <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-stone-800">Add outfit</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-stone-500 mb-1 block">Person *</label>
              <Input value={form.person_name} onChange={e => setForm(f => ({ ...f, person_name: e.target.value }))} placeholder="Rupal / Gourav / etc." autoFocus />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Role</label>
              <select value={form.person_role} onChange={e => setForm(f => ({ ...f, person_role: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none capitalize">
                {ROLES.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Function</label>
              <select value={form.function_name} onChange={e => setForm(f => ({ ...f, function_name: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                <option value="">All functions</option>
                {functions.map(fn => <option key={fn.id} value={fn.name}>{fn.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-stone-500 mb-1 block">Outfit description</label>
              <Input value={form.outfit_description} onChange={e => setForm(f => ({ ...f, outfit_description: e.target.value }))} placeholder="Red lehenga / Navy sherwani…" />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Color</label>
              <Input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} placeholder="Crimson red" />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Designer / Vendor</label>
              <Input value={form.designer_vendor} onChange={e => setForm(f => ({ ...f, designer_vendor: e.target.value }))} placeholder="Sabyasachi / local tailor" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-stone-500 mb-1 block">Notes</label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Alterations needed, trial on June 10…" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="text-xs text-stone-500 px-3 py-1.5">Cancel</button>
            <button onClick={handleAdd} disabled={!form.person_name.trim() || isPending}
              className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">Add</button>
          </div>
        </div>
      )}

      {outfits.length === 0 && !showAdd ? (
        <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
          <Shirt className="w-10 h-10 mx-auto mb-3 text-stone-200" />
          <p className="text-stone-500 text-sm">No outfits tracked yet</p>
          <button onClick={() => setShowAdd(true)} className="text-xs text-rose-600 mt-2">+ Add first outfit</button>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedOutfits).map(([role, items]) => (
            <div key={role}>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 capitalize">{role}</p>
              <div className="space-y-2">
                {items.map(outfit => (
                  <div key={outfit.id} className="bg-white border border-stone-100 rounded-xl p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0">
                        <Shirt className="w-4.5 h-4.5 text-rose-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-stone-800">{outfit.person_name}</p>
                          {outfit.function_name && (
                            <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">{outfit.function_name}</span>
                          )}
                        </div>
                        {outfit.outfit_description && <p className="text-xs text-stone-600 mt-0.5">{outfit.outfit_description}</p>}
                        {outfit.color && <p className="text-xs text-stone-400">Color: {outfit.color}</p>}
                        {outfit.designer_vendor && <p className="text-xs text-stone-400">By: {outfit.designer_vendor}</p>}
                        {outfit.notes && <p className="text-xs text-stone-400 mt-1 italic">{outfit.notes}</p>}
                      </div>
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <select
                          value={outfit.status}
                          onChange={e => {
                            setOutfits(prev => prev.map(o => o.id === outfit.id ? { ...o, status: e.target.value } : o))
                            startTransition(async () => { await updateOutfitStatus(outfit.id, e.target.value) })
                          }}
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium border-0 focus:outline-none cursor-pointer ${STATUS_COLORS[outfit.status] ?? 'bg-stone-100 text-stone-500'}`}
                        >
                          {OUTFIT_STATUS.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                        </select>
                        <button
                          onClick={() => {
                            setOutfits(prev => prev.filter(o => o.id !== outfit.id))
                            startTransition(async () => {
                              const res = await deleteOutfit(outfit.id)
                              if ('error' in res) { toast.error(res.error); setOutfits(prev => [...prev, outfit]) }
                            })
                          }}
                          className="text-stone-200 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
