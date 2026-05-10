'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Leaf, Drumstick, Pencil, Check, X } from 'lucide-react'
import { addMenuItem, deleteMenuItem, updateFunctionTheme } from '../actions'

type MenuItem = {
  id: string
  celebration_id: string
  function_id: string | null
  dish_name: string
  dish_type: string
  plate_count: number | null
  is_veg: boolean
  notes: string | null
}

type Fn = {
  id: string
  name: string
  date: string
  decoration_theme: string | null
}

const DISH_TYPES = ['starter', 'main', 'dessert', 'drink', 'snack', 'other'] as const

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

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
  initialMenu: MenuItem[]
  functions: Fn[]
}

export default function MenuClient({ celebrationId, initialMenu, functions }: Props) {
  const [menu, setMenu] = useState<MenuItem[]>(initialMenu)
  const [fnThemes, setFnThemes] = useState<Record<string, string>>(
    Object.fromEntries(functions.map(f => [f.id, f.decoration_theme ?? '']))
  )
  const [editingTheme, setEditingTheme] = useState<string | null>(null)
  const [themeInput, setThemeInput] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [filterFn, setFilterFn] = useState('all')
  const [form, setForm] = useState({
    dish_name: '', function_id: '', dish_type: 'main', plate_count: '', is_veg: true, notes: '',
  })
  const [isPending, startTransition] = useTransition()

  const filtered = filterFn === 'all' ? menu : menu.filter(m => m.function_id === filterFn)
  const ungrouped = filtered.filter(m => !m.function_id)
  const byFunction = functions.map(fn => ({
    fn,
    items: filtered.filter(m => m.function_id === fn.id),
  })).filter(g => filterFn === 'all' ? true : g.fn.id === filterFn)

  const totalDishes = menu.length
  const vegCount = menu.filter(m => m.is_veg).length

  function handleAdd() {
    if (!form.dish_name.trim()) return
    startTransition(async () => {
      const res = await addMenuItem(celebrationId, {
        dish_name: form.dish_name,
        function_id: form.function_id || undefined,
        dish_type: form.dish_type,
        plate_count: form.plate_count ? parseInt(form.plate_count) : undefined,
        is_veg: form.is_veg,
        notes: form.notes || undefined,
      })
      if ('error' in res) { toast.error(res.error); return }
      setMenu(prev => [...prev, {
        id: res.id, celebration_id: celebrationId, function_id: form.function_id || null,
        dish_name: form.dish_name, dish_type: form.dish_type,
        plate_count: form.plate_count ? parseInt(form.plate_count) : null,
        is_veg: form.is_veg, notes: form.notes || null,
      }])
      setForm({ dish_name: '', function_id: '', dish_type: 'main', plate_count: '', is_veg: true, notes: '' })
      setShowAdd(false)
      toast.success('Dish added')
    })
  }

  function handleDelete(item: MenuItem) {
    setMenu(prev => prev.filter(m => m.id !== item.id))
    startTransition(async () => {
      const res = await deleteMenuItem(item.id)
      if ('error' in res) { toast.error(res.error); setMenu(prev => [...prev, item]) }
    })
  }

  function handleSaveTheme(fnId: string) {
    const theme = themeInput.trim()
    setFnThemes(prev => ({ ...prev, [fnId]: theme }))
    setEditingTheme(null)
    startTransition(async () => {
      const res = await updateFunctionTheme(fnId, theme)
      if ('error' in res) toast.error(res.error)
    })
  }

  function renderItems(items: MenuItem[]) {
    return (
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.id} className="bg-white border border-stone-100 rounded-xl px-3 py-2.5 flex items-center gap-3">
            <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${item.is_veg ? 'bg-emerald-100' : 'bg-red-100'}`}>
              {item.is_veg
                ? <Leaf className="w-3 h-3 text-emerald-600" />
                : <Drumstick className="w-3 h-3 text-red-500" />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800 truncate">{item.dish_name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded capitalize">{item.dish_type}</span>
                {item.plate_count !== null && (
                  <span className="text-[10px] text-stone-400">{item.plate_count} plates</span>
                )}
                {item.notes && <span className="text-[10px] text-stone-400 truncate max-w-32">{item.notes}</span>}
              </div>
            </div>
            <button onClick={() => handleDelete(item)} className="text-stone-200 hover:text-red-400 transition-colors flex-shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-800">Food Menu</p>
          <p className="text-xs text-stone-400">{totalDishes} dishes · {vegCount} veg · {totalDishes - vegCount} non-veg</p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800"
        >
          <Plus className="w-3.5 h-3.5" /> Add dish
        </button>
      </div>

      {functions.length > 0 && menu.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          <button onClick={() => setFilterFn('all')}
            className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${filterFn === 'all' ? 'bg-rose-700 text-white' : 'bg-white border border-stone-200 text-stone-600'}`}>
            All
          </button>
          {functions.map(fn => (
            <button key={fn.id} onClick={() => setFilterFn(fn.id)}
              className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap font-medium transition-colors ${filterFn === fn.id ? 'bg-rose-700 text-white' : 'bg-white border border-stone-200 text-stone-600'}`}>
              {fn.name}
            </button>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-stone-800">Add dish</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-stone-500 mb-1 block">Dish name *</label>
              <Input value={form.dish_name} onChange={e => setForm(f => ({ ...f, dish_name: e.target.value }))} placeholder="e.g. Dal Makhani" autoFocus />
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
              <label className="text-xs text-stone-500 mb-1 block">Type</label>
              <select value={form.dish_type} onChange={e => setForm(f => ({ ...f, dish_type: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                {DISH_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Plate count</label>
              <Input type="number" min="0" value={form.plate_count} onChange={e => setForm(f => ({ ...f, plate_count: e.target.value }))} placeholder="e.g. 250" />
            </div>
            <div className="col-span-2 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="veg" checked={form.is_veg} onChange={() => setForm(f => ({ ...f, is_veg: true }))} className="accent-emerald-600" />
                <span className="text-xs text-stone-700 flex items-center gap-1"><Leaf className="w-3 h-3 text-emerald-600" /> Veg</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="veg" checked={!form.is_veg} onChange={() => setForm(f => ({ ...f, is_veg: false }))} className="accent-red-500" />
                <span className="text-xs text-stone-700 flex items-center gap-1"><Drumstick className="w-3 h-3 text-red-500" /> Non-veg</span>
              </label>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-stone-500 mb-1 block">Notes</label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any note…" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="text-xs text-stone-500 px-3 py-1.5">Cancel</button>
            <button onClick={handleAdd} disabled={!form.dish_name.trim() || isPending}
              className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">Add</button>
          </div>
        </div>
      )}

      {menu.length === 0 && !showAdd ? (
        <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
          <p className="text-2xl mb-2">🍽️</p>
          <p className="text-stone-500 text-sm">No dishes added yet</p>
          <button onClick={() => setShowAdd(true)} className="text-xs text-rose-600 mt-2">+ Add first dish</button>
        </div>
      ) : (
        <div className="space-y-5">
          {byFunction.map(({ fn, items }) => (
            <div key={fn.id}>
              <div className="flex items-center gap-2 mb-2">
                <div>
                  <p className="text-xs font-semibold text-stone-600 uppercase tracking-wider">{fn.name} · {fmtDate(fn.date)}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {editingTheme === fn.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={themeInput}
                          onChange={e => setThemeInput(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveTheme(fn.id); if (e.key === 'Escape') setEditingTheme(null) }}
                          placeholder="e.g. Garden floral"
                          className="text-xs px-2 py-0.5 border border-rose-300 rounded focus:outline-none w-40"
                        />
                        <button onClick={() => handleSaveTheme(fn.id)} className="text-emerald-600 hover:text-emerald-700"><Check className="w-3 h-3" /></button>
                        <button onClick={() => setEditingTheme(null)} className="text-stone-400 hover:text-stone-600"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingTheme(fn.id); setThemeInput(fnThemes[fn.id] ?? '') }}
                        className="flex items-center gap-1 text-[10px] text-stone-400 hover:text-rose-600 transition-colors"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                        {fnThemes[fn.id] ? `Theme: ${fnThemes[fn.id]}` : 'Set decoration theme'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {items.length > 0 ? renderItems(items) : (
                <p className="text-xs text-stone-400 italic ml-1">No dishes for this function</p>
              )}
            </div>
          ))}
          {ungrouped.length > 0 && (
            <div>
              {byFunction.length > 0 && <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">General</p>}
              {renderItems(ungrouped)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
