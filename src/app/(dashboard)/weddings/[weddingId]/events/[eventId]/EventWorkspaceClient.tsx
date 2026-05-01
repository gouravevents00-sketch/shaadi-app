'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, CheckCircle2, Circle, AlertCircle, Clock, Utensils, Palette, ShoppingBag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { upsertFbCount, createDecorItem, updateDecorStatus, deleteDecorItem } from './actions'
import type { FbCount, DecorItem, VendorLink } from './page'

const MEAL_TYPES = ['breakfast', 'lunch', 'high_tea', 'dinner', 'snacks'] as const
const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', high_tea: 'High Tea',
  dinner: 'Dinner', snacks: 'Snacks / Cocktails'
}

const DECOR_STATUS_STYLE: Record<string, string> = {
  pending:     'bg-stone-100 text-stone-500',
  in_progress: 'bg-blue-100 text-blue-700',
  done:        'bg-emerald-100 text-emerald-700',
  issue:       'bg-red-100 text-red-700',
}
const DECOR_STATUS_CYCLE = ['pending', 'in_progress', 'done', 'issue'] as const

type Tab = 'fb' | 'decor' | 'vendors'

export default function EventWorkspaceClient({ weddingId, eventId, initialFbCounts, initialDecorItems, vendorLinks }: {
  weddingId: string
  eventId: string
  initialFbCounts: FbCount[]
  initialDecorItems: DecorItem[]
  vendorLinks: VendorLink[]
}) {
  const [tab, setTab] = useState<Tab>('fb')
  const [fbCounts, setFbCounts] = useState<FbCount[]>(initialFbCounts)
  const [decorItems, setDecorItems] = useState<DecorItem[]>(initialDecorItems)

  // ─── F&B Handlers ─────────────────────────────────────────────
  function getFb(mealType: string) {
    return fbCounts.find(f => f.meal_type === mealType) ?? {
      id: '', event_id: eventId, meal_type: mealType, veg: 0, non_veg: 0, jain: 0, other: 0, notes: null
    }
  }

  async function saveFb(mealType: string, field: 'veg' | 'non_veg' | 'jain' | 'other', value: number) {
    const current = getFb(mealType)
    const updated = { ...current, [field]: value }
    setFbCounts(prev => {
      const idx = prev.findIndex(f => f.meal_type === mealType)
      if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], [field]: value }; return n }
      return [...prev, { ...updated, id: 'tmp-' + Date.now() } as FbCount]
    })
    const res = await upsertFbCount(weddingId, eventId, {
      meal_type: mealType, veg: updated.veg, non_veg: updated.non_veg,
      jain: updated.jain, other: updated.other,
    })
    if (res.error) toast.error(res.error)
  }

  // ─── Decor Handlers ───────────────────────────────────────────
  const [newDecorTitle, setNewDecorTitle] = useState('')

  async function addDecorItem() {
    if (!newDecorTitle.trim()) return
    const tmp: DecorItem = {
      id: 'tmp-' + Date.now(), event_id: eventId, title: newDecorTitle.trim(),
      status: 'pending', issue_note: null, completed_at: null
    }
    setDecorItems(prev => [...prev, tmp])
    setNewDecorTitle('')
    const res = await createDecorItem(weddingId, eventId, tmp.title)
    if (res.error) { toast.error(res.error); setDecorItems(prev => prev.filter(d => d.id !== tmp.id)); return }
    setDecorItems(prev => prev.map(d => d.id === tmp.id ? { ...d, id: res.id! } : d))
  }

  async function cycleDecorStatus(item: DecorItem) {
    const idx = DECOR_STATUS_CYCLE.indexOf(item.status)
    const next = DECOR_STATUS_CYCLE[(idx + 1) % DECOR_STATUS_CYCLE.length]
    setDecorItems(prev => prev.map(d => d.id === item.id ? { ...d, status: next } : d))
    const res = await updateDecorStatus(weddingId, item.id, next)
    if (res.error) { toast.error(res.error); setDecorItems(prev => prev.map(d => d.id === item.id ? { ...d, status: item.status } : d)) }
  }

  async function deleteDecor(id: string) {
    setDecorItems(prev => prev.filter(d => d.id !== id))
    const res = await deleteDecorItem(weddingId, id)
    if (res.error) toast.error(res.error)
  }

  const vendors = vendorLinks.map(vl => vl.vendors).filter(Boolean)

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-stone-100 rounded-xl mb-6 w-fit">
        {([
          { key: 'fb', label: 'F&B', icon: Utensils },
          { key: 'decor', label: 'Decor', icon: Palette },
          { key: 'vendors', label: 'Vendors', icon: ShoppingBag },
        ] as { key: Tab; label: string; icon: React.ElementType }[]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? 'bg-white shadow-sm text-stone-900' : 'text-stone-500 hover:text-stone-700'}`}>
            <t.icon className="w-4 h-4" />{t.label}
          </button>
        ))}
      </div>

      {/* F&B Tab */}
      {tab === 'fb' && (
        <div className="space-y-4">
          <p className="text-xs text-stone-400">Track meal counts per type — helps caterer with quantities</p>
          {MEAL_TYPES.map(mt => {
            const fb = getFb(mt)
            const total = fb.veg + fb.non_veg + fb.jain + fb.other
            return (
              <div key={mt} className="bg-white border border-stone-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-stone-800 capitalize">{MEAL_LABELS[mt]}</h3>
                  {total > 0 && <span className="text-sm text-stone-400">{total} total</span>}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {(['veg', 'non_veg', 'jain', 'other'] as const).map(field => (
                    <div key={field}>
                      <label className="text-xs text-stone-400 capitalize block mb-1">
                        {field === 'non_veg' ? 'Non-veg' : field.charAt(0).toUpperCase() + field.slice(1)}
                      </label>
                      <CountInput
                        value={fb[field]}
                        onChange={v => saveFb(mt, field, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Decor Tab */}
      {tab === 'decor' && (
        <div>
          <div className="flex gap-2 mb-4">
            <Input
              placeholder="Add decor item (e.g. Floral arch stage, Fairy lights entrance)"
              value={newDecorTitle}
              onChange={e => setNewDecorTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addDecorItem()}
              className="text-sm"
            />
            <Button onClick={addDecorItem} className="bg-rose-700 hover:bg-rose-800 flex-shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {decorItems.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
              <Palette className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-stone-400 text-sm">No decor items yet — add things that need to be set up for this event</p>
            </div>
          ) : (
            <div className="space-y-2">
              {decorItems.map(item => (
                <div key={item.id} className="bg-white border border-stone-200 rounded-xl px-4 py-3 flex items-center gap-3">
                  <button onClick={() => cycleDecorStatus(item)} className="flex-shrink-0">
                    {item.status === 'done'
                      ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      : item.status === 'issue'
                      ? <AlertCircle className="w-5 h-5 text-red-400" />
                      : item.status === 'in_progress'
                      ? <Clock className="w-5 h-5 text-blue-400" />
                      : <Circle className="w-5 h-5 text-stone-300" />}
                  </button>
                  <span className={`text-sm flex-1 ${item.status === 'done' ? 'line-through text-stone-400' : 'text-stone-800'}`}>
                    {item.title}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${DECOR_STATUS_STYLE[item.status]}`}>
                    {item.status.replace('_', ' ')}
                  </span>
                  <button onClick={() => deleteDecor(item.id)} className="text-stone-300 hover:text-red-400 flex-shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {decorItems.length > 0 && (
            <p className="text-xs text-stone-400 mt-3">
              {decorItems.filter(d => d.status === 'done').length}/{decorItems.length} done
              {decorItems.some(d => d.status === 'issue') && ` · ${decorItems.filter(d => d.status === 'issue').length} issues`}
            </p>
          )}
        </div>
      )}

      {/* Vendors Tab */}
      {tab === 'vendors' && (
        <div>
          {vendors.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
              <ShoppingBag className="w-8 h-8 text-stone-300 mx-auto mb-2" />
              <p className="text-stone-400 text-sm">No vendors assigned to this event</p>
              <p className="text-xs text-stone-300 mt-1">Go to Vendors page and tag this ceremony on each vendor</p>
            </div>
          ) : (
            <div className="space-y-2">
              {vendors.map(v => v && (
                <div key={v.id} className="bg-white border border-stone-200 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-800 text-sm">{v.name}</p>
                    <p className="text-xs text-stone-400">{v.category}{v.contact_name ? ` · ${v.contact_name}` : ''}{v.phone ? ` · ${v.phone}` : ''}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
                    v.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                    v.status === 'confirmed' ? 'bg-amber-100 text-amber-700' :
                    v.status === 'booked' ? 'bg-blue-100 text-blue-700' :
                    'bg-stone-100 text-stone-500'
                  }`}>{v.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function CountInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [local, setLocal] = useState(String(value || ''))
  return (
    <input
      type="number"
      min={0}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => onChange(parseInt(local) || 0)}
      onKeyDown={e => e.key === 'Enter' && onChange(parseInt(local) || 0)}
      className="w-full text-sm text-center border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
    />
  )
}
