'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Building2, User, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createRoom, updateRoom, deleteRoom, allocateRoom, removeAllocation, type RoomRow, type AllocationRow } from './actions'

const ROOM_TYPES = ['Single', 'Double', 'Twin', 'Suite', 'Presidential Suite', 'Dormitory', 'Hall']

type RoomWithAllocs = RoomRow & { allocations: AllocationRow[] }

type RForm = { room_number: string; room_type: string; floor: string; capacity: string; notes: string }
const REMPTY: RForm = { room_number: '', room_type: 'Single', floor: '', capacity: '', notes: '' }

type AForm = { guest_name: string; check_in: string; check_out: string; notes: string }
const AEMPTY: AForm = { guest_name: '', check_in: '', check_out: '', notes: '' }

export default function AccommodationClient({ eventId, initialRooms, initialAllocations }: {
  eventId: string; initialRooms: RoomRow[]; initialAllocations: AllocationRow[]
}) {
  const [rooms, setRooms] = useState<RoomWithAllocs[]>(
    initialRooms.map(r => ({ ...r, allocations: initialAllocations.filter(a => a.room_id === r.id) }))
  )
  const [expanded, setExpanded] = useState<string | null>(null)
  const [rDialog, setRDialog] = useState(false)
  const [editing, setEditing] = useState<RoomRow | null>(null)
  const [rForm, setRForm] = useState<RForm>(REMPTY)
  const [aDialog, setADialog] = useState<string | null>(null)
  const [aForm, setAForm] = useState<AForm>(AEMPTY)
  const [isPending, startTransition] = useTransition()

  const allocated = rooms.filter(r => r.is_allocated).length

  function openAdd() { setEditing(null); setRForm(REMPTY); setRDialog(true) }
  function openEdit(r: RoomRow) {
    setEditing(r)
    setRForm({ room_number: r.room_number, room_type: r.room_type ?? 'Single', floor: r.floor ?? '', capacity: r.capacity?.toString() ?? '', notes: r.notes ?? '' })
    setRDialog(true)
  }

  function handleRSave() {
    if (!rForm.room_number.trim()) { toast.error('Room number required'); return }
    startTransition(async () => {
      const payload = { room_number: rForm.room_number, room_type: rForm.room_type || undefined, floor: rForm.floor || undefined, capacity: rForm.capacity ? Number(rForm.capacity) : undefined, notes: rForm.notes || undefined }
      const stateUpdate: Partial<RoomRow> = { room_number: rForm.room_number, room_type: rForm.room_type || null, floor: rForm.floor || null, capacity: rForm.capacity ? Number(rForm.capacity) : null, notes: rForm.notes || null }
      if (editing) {
        const res = await updateRoom(eventId, editing.id, payload)
        if ('error' in res) { toast.error(res.error); return }
        setRooms(prev => prev.map(r => r.id === editing.id ? { ...r, ...stateUpdate } : r))
        toast.success('Updated')
      } else {
        const res = await createRoom(eventId, payload)
        if ('error' in res) { toast.error(res.error); return }
        const newRoom: RoomWithAllocs = { id: res.id, org_event_id: eventId, is_allocated: false, created_at: new Date().toISOString(), allocations: [], room_number: stateUpdate.room_number!, room_type: stateUpdate.room_type ?? null, floor: stateUpdate.floor ?? null, capacity: stateUpdate.capacity ?? null, notes: stateUpdate.notes ?? null }
        setRooms(prev => [...prev, newRoom])
        toast.success('Room added')
      }
      setRDialog(false)
    })
  }

  function handleAllocate(roomId: string) {
    if (!aForm.guest_name.trim()) { toast.error('Guest name required'); return }
    startTransition(async () => {
      const res = await allocateRoom(roomId, eventId, { guest_name: aForm.guest_name, check_in: aForm.check_in || undefined, check_out: aForm.check_out || undefined, notes: aForm.notes || undefined })
      if ('error' in res) { toast.error(res.error); return }
      const newA: AllocationRow = { id: res.id, room_id: roomId, guest_name: aForm.guest_name, check_in: aForm.check_in || null, check_out: aForm.check_out || null, notes: aForm.notes || null, created_at: new Date().toISOString() }
      setRooms(prev => prev.map(r => r.id === roomId ? { ...r, is_allocated: true, allocations: [...r.allocations, newA] } : r))
      setADialog(null); setAForm(AEMPTY); toast.success('Allocated')
    })
  }

  function handleRemoveAlloc(roomId: string, allocId: string) {
    startTransition(async () => {
      const res = await removeAllocation(roomId, allocId, eventId)
      if ('error' in res) { toast.error(res.error); return }
      setRooms(prev => prev.map(r => {
        if (r.id !== roomId) return r
        const remaining = r.allocations.filter(a => a.id !== allocId)
        return { ...r, allocations: remaining, is_allocated: remaining.length > 0 }
      }))
    })
  }

  const rf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setRForm(prev => ({ ...prev, [k]: e.target.value }))
  const af = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setAForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Accommodation</h1>
          <p className="text-sm text-stone-500 mt-0.5">{rooms.length} rooms · {allocated} occupied · {rooms.length - allocated} available</p>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Room
        </Button>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <Building2 className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No rooms added</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map(r => (
            <div key={r.id} className={cn('bg-white rounded-xl border p-4', r.is_allocated ? 'border-blue-200' : 'border-stone-200')}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <button onClick={() => openEdit(r)} className="font-semibold text-stone-900 hover:text-blue-600 text-left">
                    Room {r.room_number}
                  </button>
                  {r.floor && <p className="text-xs text-stone-400">Floor {r.floor}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className={cn('text-xs', r.is_allocated ? 'text-blue-600 border-blue-200' : 'text-green-600 border-green-200')}>
                    {r.is_allocated ? 'Occupied' : 'Available'}
                  </Badge>
                  <button onClick={() => { setRooms(prev => prev.filter(x => x.id !== r.id)); deleteRoom(eventId, r.id) }} className="text-stone-300 hover:text-red-500 ml-1">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              <div className="flex gap-2 text-xs text-stone-400 mb-3">
                {r.room_type && <span>{r.room_type}</span>}
                {r.capacity && <span>· {r.capacity} pax</span>}
              </div>
              {r.allocations.map(a => (
                <div key={a.id} className="flex items-center justify-between bg-blue-50 rounded-lg px-2.5 py-1.5 mb-1">
                  <div className="flex items-center gap-1.5 text-sm">
                    <User className="w-3 h-3 text-blue-400" />
                    <span className="font-medium text-blue-800">{a.guest_name}</span>
                    {a.check_in && <span className="text-blue-400 text-xs">{a.check_in}</span>}
                  </div>
                  <button onClick={() => handleRemoveAlloc(r.id, a.id)} className="text-blue-300 hover:text-red-500">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => { setADialog(r.id); setAForm(AEMPTY) }}
                className="text-xs text-blue-500 hover:text-blue-700 mt-1 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Assign guest
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={rDialog} onOpenChange={setRDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Edit Room' : 'Add Room'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Room Number *</Label><Input value={rForm.room_number} onChange={rf('room_number')} className="mt-1" /></div>
              <div><Label>Floor</Label><Input value={rForm.floor} onChange={rf('floor')} className="mt-1" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <select value={rForm.room_type} onChange={rf('room_type')} className="mt-1 w-full border border-stone-200 rounded-md px-2 py-1.5 text-sm">
                  {ROOM_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div><Label>Capacity</Label><Input type="number" value={rForm.capacity} onChange={rf('capacity')} className="mt-1" /></div>
            </div>
            <div><Label>Notes</Label><Input value={rForm.notes} onChange={rf('notes')} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRDialog(false)}>Cancel</Button>
            <Button onClick={handleRSave} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">{editing ? 'Save' : 'Add Room'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!aDialog} onOpenChange={open => !open && setADialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Assign Guest to Room</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Guest Name *</Label><Input value={aForm.guest_name} onChange={af('guest_name')} className="mt-1" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Check-in</Label><Input type="date" value={aForm.check_in} onChange={af('check_in')} className="mt-1" /></div>
              <div><Label>Check-out</Label><Input type="date" value={aForm.check_out} onChange={af('check_out')} className="mt-1" /></div>
            </div>
            <div><Label>Notes</Label><Input value={aForm.notes} onChange={af('notes')} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setADialog(null)}>Cancel</Button>
            <Button onClick={() => aDialog && handleAllocate(aDialog)} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
