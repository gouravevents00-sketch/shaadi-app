'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Phone, Car } from 'lucide-react'
import { addVehicle, deleteVehicle } from '../actions'

type Vehicle = {
  id: string
  celebration_id: string
  car_number: string
  car_type: string
  car_model: string | null
  capacity: number
  chauffeur_name: string | null
  chauffeur_phone: string | null
  assigned_to: string | null
  notes: string | null
}

const CAR_TYPES = ['sedan', 'suv', 'bus', 'tempo', 'auto', 'luxury', 'other'] as const

const TYPE_COLORS: Record<string, string> = {
  sedan: 'bg-blue-50 text-blue-700',
  suv: 'bg-emerald-50 text-emerald-700',
  bus: 'bg-amber-50 text-amber-700',
  tempo: 'bg-orange-50 text-orange-700',
  auto: 'bg-yellow-50 text-yellow-700',
  luxury: 'bg-purple-50 text-purple-700',
  other: 'bg-stone-100 text-stone-600',
}

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:border-rose-300 ${className}`}
      {...props}
    />
  )
}

type Props = { celebrationId: string; initialVehicles: Vehicle[] }

export default function VehiclesClient({ celebrationId, initialVehicles }: Props) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    car_number: '', car_type: 'sedan', car_model: '', capacity: '4',
    chauffeur_name: '', chauffeur_phone: '', assigned_to: '', notes: '',
  })
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    if (!form.car_number.trim()) return
    startTransition(async () => {
      const res = await addVehicle(celebrationId, {
        car_number: form.car_number,
        car_type: form.car_type,
        car_model: form.car_model || undefined,
        capacity: parseInt(form.capacity) || 4,
        chauffeur_name: form.chauffeur_name || undefined,
        chauffeur_phone: form.chauffeur_phone || undefined,
        assigned_to: form.assigned_to || undefined,
        notes: form.notes || undefined,
      })
      if ('error' in res) { toast.error(res.error); return }
      setVehicles(prev => [...prev, {
        id: res.id, celebration_id: celebrationId,
        car_number: form.car_number, car_type: form.car_type,
        car_model: form.car_model || null, capacity: parseInt(form.capacity) || 4,
        chauffeur_name: form.chauffeur_name || null,
        chauffeur_phone: form.chauffeur_phone || null,
        assigned_to: form.assigned_to || null,
        notes: form.notes || null,
      }])
      setForm({ car_number: '', car_type: 'sedan', car_model: '', capacity: '4', chauffeur_name: '', chauffeur_phone: '', assigned_to: '', notes: '' })
      setShowAdd(false)
      toast.success('Vehicle added')
    })
  }

  function handleDelete(v: Vehicle) {
    setVehicles(prev => prev.filter(x => x.id !== v.id))
    startTransition(async () => {
      const res = await deleteVehicle(v.id)
      if ('error' in res) { toast.error(res.error); setVehicles(prev => [...prev, v]) }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-800">Hired Vehicles</p>
          <p className="text-xs text-stone-400">
            {vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} · {vehicles.reduce((s, v) => s + v.capacity, 0)} seats total
          </p>
        </div>
        <button
          onClick={() => setShowAdd(v => !v)}
          className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800"
        >
          <Plus className="w-3.5 h-3.5" /> Add vehicle
        </button>
      </div>

      {showAdd && (
        <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-stone-800">Add vehicle</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Car number *</label>
              <Input value={form.car_number} onChange={e => setForm(f => ({ ...f, car_number: e.target.value }))} placeholder="RJ14 AB 1234" autoFocus />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Type</label>
              <select value={form.car_type} onChange={e => setForm(f => ({ ...f, car_type: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                {CAR_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Car model</label>
              <Input value={form.car_model} onChange={e => setForm(f => ({ ...f, car_model: e.target.value }))} placeholder="e.g. Innova Crysta" />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Seating capacity</label>
              <Input type="number" min="1" max="60" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Chauffeur name</label>
              <Input value={form.chauffeur_name} onChange={e => setForm(f => ({ ...f, chauffeur_name: e.target.value }))} placeholder="Ram Singh" />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Chauffeur phone</label>
              <Input value={form.chauffeur_phone} onChange={e => setForm(f => ({ ...f, chauffeur_phone: e.target.value }))} placeholder="98765 43210" type="tel" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-stone-500 mb-1 block">Assigned to (purpose / function)</label>
              <Input value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} placeholder="e.g. Baraat · Bride pickup · Airport transfer" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-stone-500 mb-1 block">Notes</label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any note…" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="text-xs text-stone-500 px-3 py-1.5">Cancel</button>
            <button onClick={handleAdd} disabled={!form.car_number.trim() || isPending}
              className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">Add</button>
          </div>
        </div>
      )}

      {vehicles.length === 0 && !showAdd ? (
        <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
          <Car className="w-10 h-10 mx-auto mb-3 text-stone-200" />
          <p className="text-stone-500 text-sm">No vehicles added yet</p>
          <button onClick={() => setShowAdd(true)} className="text-xs text-rose-600 mt-2">+ Add first vehicle</button>
        </div>
      ) : (
        <div className="space-y-3">
          {vehicles.map(v => (
            <div key={v.id} className="bg-white border border-stone-100 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-stone-800">{v.car_number}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium capitalize ${TYPE_COLORS[v.car_type] || TYPE_COLORS.other}`}>
                      {v.car_type}
                    </span>
                    <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">
                      {v.capacity} seats
                    </span>
                  </div>
                  {v.car_model && <p className="text-xs text-stone-500 mt-0.5">{v.car_model}</p>}
                  {v.assigned_to && (
                    <p className="text-xs text-rose-700 font-medium mt-1">{v.assigned_to}</p>
                  )}
                </div>
                <button onClick={() => handleDelete(v)} className="text-stone-200 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {(v.chauffeur_name || v.chauffeur_phone) && (
                <div className="mt-3 pt-3 border-t border-stone-50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-bold text-stone-500">{v.chauffeur_name?.[0] ?? '?'}</span>
                    </div>
                    <div>
                      {v.chauffeur_name && <p className="text-xs font-medium text-stone-700">{v.chauffeur_name}</p>}
                      {v.chauffeur_phone && <p className="text-[10px] text-stone-400">{v.chauffeur_phone}</p>}
                    </div>
                  </div>
                  {v.chauffeur_phone && (
                    <a
                      href={`https://wa.me/91${v.chauffeur_phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] text-green-700 bg-green-50 px-2.5 py-1 rounded-lg hover:bg-green-100 transition-colors"
                    >
                      <Phone className="w-2.5 h-2.5" /> WhatsApp
                    </a>
                  )}
                </div>
              )}

              {v.notes && <p className="text-[11px] text-stone-400 mt-2 italic">{v.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
