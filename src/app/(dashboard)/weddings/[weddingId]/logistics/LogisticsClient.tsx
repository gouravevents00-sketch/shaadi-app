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
  Truck, Plane, MapPin, Phone, Plus, Pencil, Trash2,
  Car, Bus, Clock, CheckCircle2, XCircle, Circle, AlertCircle,
  ChevronDown, ChevronRight, Users,
} from 'lucide-react'
import {
  createVehicle, updateVehicle, deleteVehicle,
  createPickup, updatePickup, deletePickup,
  upsertArrival, deleteArrival,
} from './actions'

// ── Types ──────────────────────────────────────────────────────

interface Vehicle {
  id: string; number: string; type: string
  driver_name: string; driver_phone: string; capacity: number
}

interface Pickup {
  id: string; type: string; scheduled_time: string; actual_time: string | null
  from_location: string; to_location: string; status: string; notes: string | null
  guests: { id: string; name: string; phone: string | null } | null
  vehicles: { id: string; number: string; driver_name: string; driver_phone: string } | null
}

interface Arrival {
  id: string; mode: string; flight_train_no: string | null
  arrival_time: string | null; pickup_required: boolean; status: string
  guests: { id: string; name: string; phone: string | null } | null
  events: { id: string; name: string } | null
}

interface Guest { id: string; name: string; phone: string | null; side: string }
interface WEvent { id: string; name: string; date: string }

// ── Constants ──────────────────────────────────────────────────

const VEHICLE_TYPES = ['car', 'suv', 'van', 'bus']
const PICKUP_STATUSES = ['scheduled', 'in_progress', 'completed', 'cancelled']
const ARRIVAL_STATUSES = ['expected', 'arrived', 'no_show']
const ARRIVAL_MODES = ['self', 'flight', 'train', 'bus', 'car', 'other']

const VEHICLE_ICON: Record<string, React.ElementType> = { bus: Bus, default: Car }
const PICKUP_STATUS_STYLE: Record<string, string> = {
  scheduled:   'bg-stone-100 text-stone-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed:   'bg-emerald-100 text-emerald-700',
  cancelled:   'bg-red-100 text-red-500',
}
const ARRIVAL_STATUS_STYLE: Record<string, string> = {
  expected: 'bg-stone-100 text-stone-500',
  arrived:  'bg-emerald-100 text-emerald-700',
  no_show:  'bg-red-100 text-red-600',
}

function fmt(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ── Main Component ─────────────────────────────────────────────

export default function LogisticsClient({
  weddingId, weddingName,
  initialVehicles, initialPickups, initialArrivals,
  guests, events,
}: {
  weddingId: string; weddingName: string
  initialVehicles: Vehicle[]; initialPickups: Pickup[]; initialArrivals: Arrival[]
  guests: Guest[]; events: WEvent[]
}) {
  const [tab, setTab] = useState<'vehicles' | 'pickups' | 'arrivals'>('vehicles')
  const [vehicles, setVehicles]   = useState<Vehicle[]>(initialVehicles)
  const [pickups, setPickups]     = useState<Pickup[]>(initialPickups)
  const [arrivals, setArrivals]   = useState<Arrival[]>(initialArrivals)

  // ── Vehicle modal state ──
  const [vehicleModal, setVehicleModal] = useState(false)
  const [vehicleEdit, setVehicleEdit]   = useState<Vehicle | null>(null)
  const [vForm, setVForm] = useState({ number: '', type: 'car', driver_name: '', driver_phone: '', capacity: 4 })

  // ── Pickup modal state ──
  const [pickupModal, setPickupModal]   = useState(false)
  const [pickupEdit, setPickupEdit]     = useState<Pickup | null>(null)
  const [pForm, setPForm] = useState({
    guest_id: '', vehicle_id: '', type: 'pickup',
    scheduled_time: '', from_location: '', to_location: '', notes: '',
  })

  // ── Arrival modal state ──
  const [arrivalModal, setArrivalModal] = useState(false)
  const [arrivalEdit, setArrivalEdit]   = useState<Arrival | null>(null)
  const [aForm, setAForm] = useState({
    guest_id: '', event_id: '', mode: 'flight',
    flight_train_no: '', arrival_time: '', pickup_required: false, status: 'expected',
  })

  // ─── Vehicle CRUD ───────────────────────────────────────────

  function openVehicle(v?: Vehicle) {
    if (v) {
      setVehicleEdit(v)
      setVForm({ number: v.number, type: v.type, driver_name: v.driver_name, driver_phone: v.driver_phone, capacity: v.capacity })
    } else {
      setVehicleEdit(null)
      setVForm({ number: '', type: 'car', driver_name: '', driver_phone: '', capacity: 4 })
    }
    setVehicleModal(true)
  }

  async function saveVehicle() {
    if (!vForm.number || !vForm.driver_name || !vForm.driver_phone) {
      toast.error('Fill vehicle number, driver name and phone')
      return
    }
    if (vehicleEdit) {
      const r = await updateVehicle(weddingId, vehicleEdit.id, vForm)
      if ('error' in r) { toast.error(r.error); return }
      setVehicles(prev => prev.map(v => v.id === vehicleEdit.id ? { ...v, ...vForm } : v))
    } else {
      const r = await createVehicle(weddingId, vForm)
      if ('error' in r) { toast.error(r.error); return }
      setVehicles(prev => [...prev, r as Vehicle])
    }
    setVehicleModal(false)
    toast.success(vehicleEdit ? 'Vehicle updated' : 'Vehicle added')
  }

  async function removeVehicle(id: string) {
    if (!confirm('Delete this vehicle?')) return
    const r = await deleteVehicle(weddingId, id)
    if ('error' in r) { toast.error(r.error); return }
    setVehicles(prev => prev.filter(v => v.id !== id))
    toast.success('Deleted')
  }

  // ─── Pickup CRUD ────────────────────────────────────────────

  function openPickup(p?: Pickup) {
    if (p) {
      setPickupEdit(p)
      setPForm({
        guest_id: p.guests?.id ?? '',
        vehicle_id: p.vehicles?.id ?? '',
        type: p.type,
        scheduled_time: p.scheduled_time?.slice(0, 16) ?? '',
        from_location: p.from_location,
        to_location: p.to_location,
        notes: p.notes ?? '',
      })
    } else {
      setPickupEdit(null)
      setPForm({ guest_id: '', vehicle_id: '', type: 'pickup', scheduled_time: '', from_location: '', to_location: '', notes: '' })
    }
    setPickupModal(true)
  }

  async function savePickup() {
    if (!pForm.guest_id || !pForm.scheduled_time || !pForm.from_location || !pForm.to_location) {
      toast.error('Fill guest, time, from and to')
      return
    }
    const payload = {
      guest_id: pForm.guest_id,
      vehicle_id: pForm.vehicle_id || null,
      type: pForm.type,
      scheduled_time: pForm.scheduled_time,
      from_location: pForm.from_location,
      to_location: pForm.to_location,
      notes: pForm.notes || null,
    }
    if (pickupEdit) {
      const r = await updatePickup(weddingId, pickupEdit.id, payload)
      if ('error' in r) { toast.error(r.error); return }
      // Refresh local state with guest/vehicle details
      const g = guests.find(g => g.id === pForm.guest_id)
      const v = vehicles.find(v => v.id === pForm.vehicle_id) ?? null
      setPickups(prev => prev.map(p => p.id === pickupEdit.id ? {
        ...p, ...payload,
        guests: g ? { id: g.id, name: g.name, phone: g.phone } : null,
        vehicles: v ? { id: v.id, number: v.number, driver_name: v.driver_name, driver_phone: v.driver_phone } : null,
      } : p))
    } else {
      const r = await createPickup(weddingId, payload)
      if ('error' in r) { toast.error(r.error); return }
      const g = guests.find(g => g.id === pForm.guest_id)
      const v = vehicles.find(v => v.id === pForm.vehicle_id) ?? null
      setPickups(prev => [...prev, {
        ...(r as Pickup), ...payload,
        guests: g ? { id: g.id, name: g.name, phone: g.phone } : null,
        vehicles: v ? { id: v.id, number: v.number, driver_name: v.driver_name, driver_phone: v.driver_phone } : null,
      }])
    }
    setPickupModal(false)
    toast.success(pickupEdit ? 'Updated' : 'Pickup added')
  }

  async function updatePickupStatus(pickupId: string, status: string) {
    const actual_time = status === 'completed' ? new Date().toISOString() : null
    const r = await updatePickup(weddingId, pickupId, { status, actual_time })
    if ('error' in r) { toast.error(r.error); return }
    setPickups(prev => prev.map(p => p.id === pickupId ? { ...p, status, actual_time } : p))
  }

  async function removePickup(id: string) {
    if (!confirm('Delete this pickup?')) return
    const r = await deletePickup(weddingId, id)
    if ('error' in r) { toast.error(r.error); return }
    setPickups(prev => prev.filter(p => p.id !== id))
    toast.success('Deleted')
  }

  // ─── Arrival CRUD ───────────────────────────────────────────

  function openArrival(a?: Arrival) {
    if (a) {
      setArrivalEdit(a)
      setAForm({
        guest_id: a.guests?.id ?? '',
        event_id: a.events?.id ?? '',
        mode: a.mode,
        flight_train_no: a.flight_train_no ?? '',
        arrival_time: a.arrival_time?.slice(0, 16) ?? '',
        pickup_required: a.pickup_required,
        status: a.status,
      })
    } else {
      setArrivalEdit(null)
      setAForm({ guest_id: '', event_id: '', mode: 'flight', flight_train_no: '', arrival_time: '', pickup_required: false, status: 'expected' })
    }
    setArrivalModal(true)
  }

  async function saveArrival() {
    if (!aForm.guest_id) { toast.error('Select a guest'); return }
    const payload = {
      id: arrivalEdit?.id,
      guest_id: aForm.guest_id,
      event_id: aForm.event_id || null,
      mode: aForm.mode,
      flight_train_no: aForm.flight_train_no || null,
      arrival_time: aForm.arrival_time || null,
      pickup_required: aForm.pickup_required,
      status: aForm.status,
    }
    const r = await upsertArrival(weddingId, payload)
    if ('error' in r) { toast.error(r.error); return }
    const g = guests.find(g => g.id === aForm.guest_id)
    const ev = events.find(e => e.id === aForm.event_id) ?? null
    const newRow: Arrival = {
      id: arrivalEdit?.id ?? crypto.randomUUID(),
      mode: aForm.mode,
      flight_train_no: aForm.flight_train_no || null,
      arrival_time: aForm.arrival_time || null,
      pickup_required: aForm.pickup_required,
      status: aForm.status,
      guests: g ? { id: g.id, name: g.name, phone: g.phone } : null,
      events: ev ? { id: ev.id, name: ev.name } : null,
    }
    if (arrivalEdit) {
      setArrivals(prev => prev.map(a => a.id === arrivalEdit.id ? newRow : a))
    } else {
      setArrivals(prev => [...prev, newRow])
    }
    setArrivalModal(false)
    toast.success(arrivalEdit ? 'Updated' : 'Arrival logged')
  }

  async function updateArrivalStatus(arrivalId: string, status: string) {
    const r = await upsertArrival(weddingId, { id: arrivalId, guest_id: '', event_id: null, mode: '', flight_train_no: null, arrival_time: null, pickup_required: false, status })
    if ('error' in r) { toast.error(r.error); return }
    setArrivals(prev => prev.map(a => a.id === arrivalId ? { ...a, status } : a))
  }

  async function removeArrival(id: string) {
    if (!confirm('Delete this arrival record?')) return
    const r = await deleteArrival(weddingId, id)
    if ('error' in r) { toast.error(r.error); return }
    setArrivals(prev => prev.filter(a => a.id !== id))
    toast.success('Deleted')
  }

  // ─── Stats ──────────────────────────────────────────────────
  const vehicleCapacity = vehicles.reduce((s, v) => s + v.capacity, 0)
  const pickupsDone = pickups.filter(p => p.status === 'completed').length
  const arrivalsConfirmed = arrivals.filter(a => a.status === 'arrived').length

  // ─── Render ─────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Logistics</h1>
          <p className="text-sm text-stone-400 mt-0.5">{weddingName}</p>
        </div>
        <Button
          size="sm"
          onClick={() => tab === 'vehicles' ? openVehicle() : tab === 'pickups' ? openPickup() : openArrival()}
        >
          <Plus className="w-4 h-4 mr-2" />
          {tab === 'vehicles' ? 'Add Vehicle' : tab === 'pickups' ? 'Add Pickup/Drop' : 'Log Arrival'}
        </Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-stone-800">{vehicles.length}</p>
          <p className="text-xs text-stone-400 mt-0.5">Vehicles · {vehicleCapacity} seats</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-stone-800">{pickupsDone}/{pickups.length}</p>
          <p className="text-xs text-stone-400 mt-0.5">Pickups done</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-stone-800">{arrivalsConfirmed}/{arrivals.length}</p>
          <p className="text-xs text-stone-400 mt-0.5">Arrived</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-100 rounded-lg p-1 w-fit">
        {(['vehicles', 'pickups', 'arrivals'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── VEHICLES TAB ──────────────────────────────────────── */}
      {tab === 'vehicles' && (
        <div>
          {vehicles.length === 0 ? (
            <EmptyState icon={Truck} label="No vehicles added yet" sub="Add cars, buses, SUVs with driver details" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {vehicles.map(v => {
                const VIcon = VEHICLE_ICON[v.type] ?? VEHICLE_ICON.default
                const assignedPickups = pickups.filter(p => p.vehicles?.id === v.id)
                return (
                  <div key={v.id} className="bg-white border border-stone-200 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center">
                          <VIcon className="w-5 h-5 text-stone-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-stone-900">{v.number}</p>
                          <p className="text-xs text-stone-400 capitalize">{v.type} · {v.capacity} seats</p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => openVehicle(v)} className="p-1.5 text-stone-300 hover:text-stone-600 rounded transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => removeVehicle(v.id)} className="p-1.5 text-stone-300 hover:text-red-500 rounded transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-stone-600">
                      <Users className="w-3.5 h-3.5 text-stone-400" />
                      <span>{v.driver_name}</span>
                    </div>
                    <a href={`tel:${v.driver_phone}`} className="flex items-center gap-2 text-sm text-rose-700 hover:text-rose-800 mt-1">
                      <Phone className="w-3.5 h-3.5" />
                      {v.driver_phone}
                    </a>
                    {assignedPickups.length > 0 && (
                      <p className="text-xs text-stone-400 mt-2 border-t border-stone-100 pt-2">
                        {assignedPickups.length} pickup{assignedPickups.length !== 1 ? 's' : ''} assigned
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PICKUPS TAB ───────────────────────────────────────── */}
      {tab === 'pickups' && (
        <div>
          {pickups.length === 0 ? (
            <EmptyState icon={MapPin} label="No pickups scheduled" sub="Schedule airport picks, venue drops, and transfers" />
          ) : (
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              {pickups.map((p, i) => (
                <div key={p.id} className={`px-4 py-3 ${i < pickups.length - 1 ? 'border-b border-stone-100' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-stone-900">{p.guests?.name ?? '—'}</p>
                        <Badge className={`${PICKUP_STATUS_STYLE[p.status]} border-0 text-xs capitalize`}>{p.status.replace('_', ' ')}</Badge>
                        <span className="text-xs text-stone-400 capitalize">{p.type}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-stone-500 mb-1">
                        <Clock className="w-3 h-3" />
                        {fmt(p.scheduled_time)}
                        {p.actual_time && <span className="text-emerald-600 ml-1">· done {fmt(p.actual_time)}</span>}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-stone-400">
                        <MapPin className="w-3 h-3" />
                        {p.from_location} <ChevronRight className="w-3 h-3" /> {p.to_location}
                      </div>
                      {p.vehicles && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <Truck className="w-3 h-3 text-stone-400" />
                          <span className="text-xs text-stone-500">{p.vehicles.number} · {p.vehicles.driver_name}</span>
                          <a href={`tel:${p.vehicles.driver_phone}`} className="text-xs text-rose-700">{p.vehicles.driver_phone}</a>
                        </div>
                      )}
                      {p.notes && <p className="text-xs text-stone-400 mt-1 italic">{p.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {p.status === 'scheduled' && (
                        <button onClick={() => updatePickupStatus(p.id, 'in_progress')}
                          title="Start" className="p-1.5 rounded text-blue-500 hover:bg-blue-50 transition-colors">
                          <Circle className="w-4 h-4" />
                        </button>
                      )}
                      {p.status === 'in_progress' && (
                        <button onClick={() => updatePickupStatus(p.id, 'completed')}
                          title="Mark done" className="p-1.5 rounded text-emerald-500 hover:bg-emerald-50 transition-colors">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {(p.status === 'scheduled' || p.status === 'in_progress') && (
                        <button onClick={() => updatePickupStatus(p.id, 'cancelled')}
                          title="Cancel" className="p-1.5 rounded text-stone-300 hover:text-red-400 transition-colors">
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      {p.guests?.phone && (
                        <a href={`tel:${p.guests.phone}`} className="p-1.5 rounded text-stone-300 hover:text-rose-600 transition-colors">
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      <button onClick={() => openPickup(p)} className="p-1.5 rounded text-stone-300 hover:text-stone-600 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removePickup(p.id)} className="p-1.5 rounded text-stone-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ARRIVALS TAB ──────────────────────────────────────── */}
      {tab === 'arrivals' && (
        <div>
          {arrivals.length === 0 ? (
            <EmptyState icon={Plane} label="No arrivals tracked" sub="Log flight/train arrivals and track who has reached" />
          ) : (
            <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
              {arrivals.map((a, i) => (
                <div key={a.id} className={`px-4 py-3 ${i < arrivals.length - 1 ? 'border-b border-stone-100' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-stone-900">{a.guests?.name ?? '—'}</p>
                        <Badge className={`${ARRIVAL_STATUS_STYLE[a.status]} border-0 text-xs capitalize`}>
                          {a.status.replace('_', ' ')}
                        </Badge>
                        {a.pickup_required && (
                          <Badge className="bg-amber-100 text-amber-700 border-0 text-xs">Pickup needed</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400">
                        <span className="capitalize">{a.mode}</span>
                        {a.flight_train_no && <span className="font-mono bg-stone-100 px-1.5 py-0.5 rounded">{a.flight_train_no}</span>}
                        {a.arrival_time && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {fmt(a.arrival_time)}
                          </span>
                        )}
                        {a.events && <span className="text-stone-400">for {a.events.name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {a.status === 'expected' && (
                        <button onClick={() => updateArrivalStatus(a.id, 'arrived')}
                          title="Mark arrived" className="p-1.5 rounded text-emerald-500 hover:bg-emerald-50 transition-colors">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {a.status === 'expected' && (
                        <button onClick={() => updateArrivalStatus(a.id, 'no_show')}
                          title="Mark no-show" className="p-1.5 rounded text-stone-300 hover:text-red-400 transition-colors">
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      {a.guests?.phone && (
                        <a href={`tel:${a.guests.phone}`} className="p-1.5 rounded text-stone-300 hover:text-rose-600 transition-colors">
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      <button onClick={() => openArrival(a)} className="p-1.5 rounded text-stone-300 hover:text-stone-600 transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeArrival(a.id)} className="p-1.5 rounded text-stone-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── VEHICLE MODAL ─────────────────────────────────────── */}
      <Dialog open={vehicleModal} onOpenChange={setVehicleModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{vehicleEdit ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Vehicle Number *</label>
                <Input placeholder="MH 01 AB 1234" value={vForm.number} onChange={e => setVForm(f => ({ ...f, number: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Type</label>
                <Select value={vForm.type} onValueChange={v => setVForm(f => ({ ...f, type: v || f.type }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map(t => <SelectItem key={t} value={t} className="capitalize">{t.toUpperCase()}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Driver Name *</label>
              <Input placeholder="Raju Kumar" value={vForm.driver_name} onChange={e => setVForm(f => ({ ...f, driver_name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Driver Phone *</label>
                <Input placeholder="+91 98765 43210" value={vForm.driver_phone} onChange={e => setVForm(f => ({ ...f, driver_phone: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Capacity (seats)</label>
                <Input type="number" min={1} max={50} value={vForm.capacity} onChange={e => setVForm(f => ({ ...f, capacity: parseInt(e.target.value) || 4 }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVehicleModal(false)}>Cancel</Button>
            <Button onClick={saveVehicle}>{vehicleEdit ? 'Save' : 'Add Vehicle'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PICKUP MODAL ──────────────────────────────────────── */}
      <Dialog open={pickupModal} onOpenChange={setPickupModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{pickupEdit ? 'Edit Pickup/Drop' : 'Schedule Pickup/Drop'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Guest *</label>
              <Select value={pForm.guest_id} onValueChange={v => setPForm(f => ({ ...f, guest_id: v || f.guest_id }))}>
                <SelectTrigger><SelectValue placeholder="Select guest" /></SelectTrigger>
                <SelectContent>
                  {guests.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Type</label>
                <Select value={pForm.type} onValueChange={v => setPForm(f => ({ ...f, type: v || f.type }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pickup">Pickup</SelectItem>
                    <SelectItem value="drop">Drop</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Vehicle</label>
                <Select value={pForm.vehicle_id} onValueChange={v => setPForm(f => ({ ...f, vehicle_id: v ?? '' }))}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.number} · {v.driver_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Scheduled Time *</label>
              <Input type="datetime-local" value={pForm.scheduled_time} onChange={e => setPForm(f => ({ ...f, scheduled_time: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">From *</label>
                <Input placeholder="Airport T2" value={pForm.from_location} onChange={e => setPForm(f => ({ ...f, from_location: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">To *</label>
                <Input placeholder="Nahargarh Palace" value={pForm.to_location} onChange={e => setPForm(f => ({ ...f, to_location: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Notes</label>
              <Input placeholder="Luggage? Special needs?" value={pForm.notes} onChange={e => setPForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickupModal(false)}>Cancel</Button>
            <Button onClick={savePickup}>{pickupEdit ? 'Save' : 'Schedule'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ARRIVAL MODAL ─────────────────────────────────────── */}
      <Dialog open={arrivalModal} onOpenChange={setArrivalModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{arrivalEdit ? 'Edit Arrival' : 'Log Arrival'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Guest *</label>
              <Select value={aForm.guest_id} onValueChange={v => setAForm(f => ({ ...f, guest_id: v || f.guest_id }))}>
                <SelectTrigger><SelectValue placeholder="Select guest" /></SelectTrigger>
                <SelectContent>
                  {guests.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Mode</label>
                <Select value={aForm.mode} onValueChange={v => setAForm(f => ({ ...f, mode: v || f.mode }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ARRIVAL_MODES.map(m => <SelectItem key={m} value={m} className="capitalize">{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Flight / Train No.</label>
                <Input placeholder="6E 2341" value={aForm.flight_train_no} onChange={e => setAForm(f => ({ ...f, flight_train_no: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Arrival Time</label>
              <Input type="datetime-local" value={aForm.arrival_time} onChange={e => setAForm(f => ({ ...f, arrival_time: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Event (optional)</label>
              <Select value={aForm.event_id} onValueChange={v => setAForm(f => ({ ...f, event_id: v ?? '' }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {events.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Status</label>
                <Select value={aForm.status} onValueChange={v => setAForm(f => ({ ...f, status: v || f.status }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ARRIVAL_STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 mt-5">
                <input
                  type="checkbox"
                  id="pickup_req"
                  checked={aForm.pickup_required}
                  onChange={e => setAForm(f => ({ ...f, pickup_required: e.target.checked }))}
                  className="w-4 h-4 accent-rose-600"
                />
                <label htmlFor="pickup_req" className="text-sm text-stone-700">Pickup required</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArrivalModal(false)}>Cancel</Button>
            <Button onClick={saveArrival}>{arrivalEdit ? 'Save' : 'Log Arrival'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

// ── Empty state ────────────────────────────────────────────────

function EmptyState({ icon: Icon, label, sub }: { icon: React.ElementType; label: string; sub: string }) {
  return (
    <div className="text-center py-16 text-stone-400">
      <Icon className="w-8 h-8 mx-auto mb-3 opacity-30" />
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className="text-xs mt-1">{sub}</p>
    </div>
  )
}
