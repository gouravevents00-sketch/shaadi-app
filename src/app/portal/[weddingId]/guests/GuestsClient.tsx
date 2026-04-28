'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Phone, Mail, Users, UserCheck } from 'lucide-react'
import { addPortalGuest, deletePortalGuest } from './actions'

interface Guest {
  id: string; name: string; phone: string | null; email: string | null
  dietary: string | null; plus_count: number; notes: string | null; side: string
}

interface Props {
  weddingId: string
  initialGuests: Guest[]
  clientSide: string
}

const DIETARY = ['None', 'Vegetarian', 'Jain', 'Vegan', 'Non-Vegetarian', 'Gluten Free']

export default function GuestsClient({ weddingId, initialGuests, clientSide }: Props) {
  const [guests, setGuests] = useState<Guest[]>(initialGuests)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', dietary: '', plus_count: '0', notes: '' })

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    const optimistic: Guest = {
      id: `opt-${Date.now()}`, name: form.name.trim(), phone: form.phone || null,
      email: form.email || null, dietary: form.dietary || null,
      plus_count: parseInt(form.plus_count) || 0, notes: form.notes || null, side: clientSide,
    }
    setGuests(g => [optimistic, ...g])
    setForm({ name: '', phone: '', email: '', dietary: '', plus_count: '0', notes: '' })
    setShowForm(false)

    const res = await addPortalGuest(weddingId, {
      name: optimistic.name, phone: optimistic.phone ?? undefined,
      email: optimistic.email ?? undefined, dietary: optimistic.dietary ?? undefined,
      plus_count: optimistic.plus_count, notes: optimistic.notes ?? undefined,
    })
    if ('error' in res) {
      toast.error(res.error)
      setGuests(g => g.filter(x => x.id !== optimistic.id))
    } else {
      setGuests(g => g.map(x => x.id === optimistic.id ? { ...x, id: res.id } : x))
      toast.success('Guest added')
    }
    setSaving(false)
  }

  async function handleDelete(guest: Guest) {
    setGuests(g => g.filter(x => x.id !== guest.id))
    const res = await deletePortalGuest(weddingId, guest.id)
    if ('error' in res) {
      toast.error(res.error)
      setGuests(g => [...g, guest])
    }
  }

  const sideLabel = clientSide === 'bride' ? "Bride's side" : clientSide === 'groom' ? "Groom's side" : 'Your side'

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Guest List</h2>
          <p className="text-sm text-stone-400 mt-0.5">
            Add guests from <span className="font-medium text-stone-600">{sideLabel}</span> — {guests.length} added so far
          </p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 px-3 py-2 bg-rose-700 text-white text-sm rounded-lg hover:bg-rose-800">
          <Plus className="w-4 h-4" /> Add guest
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Name *</label>
              <input required value={form.name} onChange={e => setF('name', e.target.value)}
                placeholder="Full name" autoFocus
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Phone</label>
              <input value={form.phone} onChange={e => setF('phone', e.target.value)}
                placeholder="+91 98765 43210" type="tel"
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Email</label>
              <input value={form.email} onChange={e => setF('email', e.target.value)}
                placeholder="optional"
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Dietary</label>
              <select value={form.dietary} onChange={e => setF('dietary', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200">
                {DIETARY.map(d => <option key={d} value={d === 'None' ? '' : d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Plus ones</label>
              <input type="number" min="0" max="10" value={form.plus_count} onChange={e => setF('plus_count', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Notes</label>
              <input value={form.notes} onChange={e => setF('notes', e.target.value)}
                placeholder="e.g. Mama ji, needs wheelchair"
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-stone-500 px-3 py-1.5 hover:text-stone-700">Cancel</button>
            <button type="submit" disabled={saving}
              className="text-sm bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">
              {saving ? 'Adding…' : 'Add guest'}
            </button>
          </div>
        </form>
      )}

      {guests.length === 0 && !showForm && (
        <div className="text-center py-12 text-stone-400">
          <Users className="w-10 h-10 mx-auto mb-3 text-stone-200" />
          <p className="text-sm font-medium">No guests added yet</p>
          <p className="text-xs mt-1">Add your family & friends — the event team will manage invitations</p>
        </div>
      )}

      {guests.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100">
          {guests.map(g => (
            <div key={g.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-rose-600">{g.name[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800">
                  {g.name}
                  {g.plus_count > 0 && <span className="text-xs text-stone-400 ml-1">+{g.plus_count}</span>}
                </p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {g.phone && <span className="flex items-center gap-1 text-xs text-stone-400"><Phone className="w-3 h-3" />{g.phone}</span>}
                  {g.dietary && <span className="text-xs text-stone-400">{g.dietary}</span>}
                  {g.notes && <span className="text-xs text-stone-400 truncate max-w-32">{g.notes}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> Attending
                </span>
                <button onClick={() => handleDelete(g)} className="text-stone-300 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
