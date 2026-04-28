'use client'

import { useState, useRef, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Plus, MoreVertical, Pencil, Trash2, Gift, BedDouble,
  Search, ChevronDown, ChevronRight, X, Map, Upload, ImageIcon
} from 'lucide-react'
import {
  bulkCreateRooms, updateRoom, deleteRoom,
  allocateGuest, removeAllocation, markKitGiven,
  saveRoomMap, deleteRoomMap,
} from './actions'

// ─── Types ───────────────────────────────────────────────────────

interface FamilyMember { name: string; dietary: string }

interface AllocationGuest {
  id: string
  name: string
  family_members: FamilyMember[] | null
}

interface Allocation {
  id: string
  check_in: string
  check_out: string
  kit_given: boolean
  kit_given_at: string | null
  guests: AllocationGuest | AllocationGuest[] | null
}

export interface Room {
  id: string
  room_number: string
  type: string
  capacity: number
  floor: string | null
  notes: string | null
  room_allocations: Allocation[]
}

interface Guest {
  id: string
  name: string
  side: string
  family_members: FamilyMember[] | null
  arrival_date: string | null
  departure_date: string | null
  rsvp_submitted_at: string | null
}

interface RoomMap {
  id: string
  label: string
  map_data: string
  created_at: string
}

// ─── Constants ───────────────────────────────────────────────────

const ROOM_TYPES = ['standard', 'deluxe', 'suite', 'villa', 'cottage']

const TYPE_COLORS: Record<string, string> = {
  standard: 'bg-stone-100 text-stone-600',
  deluxe:   'bg-blue-50 text-blue-700',
  suite:    'bg-purple-50 text-purple-700',
  villa:    'bg-green-50 text-green-700',
  cottage:  'bg-amber-50 text-amber-700',
}

const TYPE_SHORT: Record<string, string> = {
  standard: 'Std', deluxe: 'Dlx', suite: 'Ste', villa: 'Vil', cottage: 'Cot'
}

// ─── Helpers ─────────────────────────────────────────────────────

function getGuest(alloc: Allocation): AllocationGuest | null {
  if (!alloc.guests) return null
  return Array.isArray(alloc.guests) ? alloc.guests[0] ?? null : alloc.guests
}

function familyCount(g: AllocationGuest | Guest | null): number {
  if (!g) return 0
  return Array.isArray(g.family_members) ? g.family_members.length : 0
}

function shortName(name: string): string {
  const parts = name.trim().split(' ')
  return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0]
}

function fmt(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// ─── Main Component ──────────────────────────────────────────────

export default function RoomsClient({
  weddingId,
  initialRooms,
  allGuests,
  wedding,
  initialMaps,
}: {
  weddingId: string
  initialRooms: Room[]
  allGuests: Guest[]
  wedding: { date_from: string | null; date_to: string | null; wedding_date: string | null } | null
  initialMaps: RoomMap[]
}) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [maps, setMaps] = useState<RoomMap[]>(initialMaps)

  // Guest panel state
  const [search, setSearch] = useState('')
  const [assignedCollapsed, setAssignedCollapsed] = useState(true)
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null)

  // Room panel filters
  const [floorFilter, setFloorFilter] = useState('all')
  const [availableOnly, setAvailableOnly] = useState(false)

  // Bulk add dialog
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkForm, setBulkForm] = useState({
    building: '', floor: '1', type: 'standard',
    capacity: 2, count: 10, startNumber: 101, prefix: '',
  })
  const [bulkLoading, setBulkLoading] = useState(false)

  // Edit room dialog
  const [editRoom, setEditRoom] = useState<Room | null>(null)
  const [editForm, setEditForm] = useState({ room_number: '', type: 'standard', capacity: 2, floor: '', notes: '' })
  const [editLoading, setEditLoading] = useState(false)

  // Delete confirm
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null)

  // Maps panel
  const [mapsOpen, setMapsOpen] = useState(false)
  const [mapLabel, setMapLabel] = useState('')
  const [mapPreview, setMapPreview] = useState<string | null>(null)
  const [mapLoading, setMapLoading] = useState(false)
  const [expandedMap, setExpandedMap] = useState<string | null>(null)
  const mapFileRef = useRef<HTMLInputElement>(null)

  // ─── Derived ─────────────────────────────────────────────────

  const allocatedGuestIds = useMemo(() =>
    new Set(rooms.flatMap(r => r.room_allocations.map(a => getGuest(a)?.id).filter(Boolean) as string[])),
  [rooms])

  const unassigned = allGuests.filter(g => !allocatedGuestIds.has(g.id) &&
    g.name.toLowerCase().includes(search.toLowerCase()))
  const assigned = allGuests.filter(g => allocatedGuestIds.has(g.id) &&
    g.name.toLowerCase().includes(search.toLowerCase()))

  const floors = useMemo(() => {
    const set = new Set(rooms.map(r => r.floor ?? 'Other'))
    return ['all', ...Array.from(set).sort()]
  }, [rooms])

  const filteredRooms = useMemo(() => rooms.filter(r => {
    if (floorFilter !== 'all' && (r.floor ?? 'Other') !== floorFilter) return false
    if (availableOnly && r.room_allocations.length > 0) return false
    return true
  }), [rooms, floorFilter, availableOnly])

  const roomsByFloor = useMemo(() => {
    const map: Record<string, Room[]> = {}
    filteredRooms.forEach(r => {
      const key = r.floor ?? 'Other'
      if (!map[key]) map[key] = []
      map[key].push(r)
    })
    return map
  }, [filteredRooms])

  const stats = useMemo(() => ({
    total: rooms.length,
    assigned: rooms.filter(r => r.room_allocations.length > 0).length,
    available: rooms.filter(r => r.room_allocations.length === 0).length,
    kitsPending: rooms.flatMap(r => r.room_allocations).filter(a => !a.kit_given).length,
  }), [rooms])

  // ─── Bulk add ────────────────────────────────────────────────

  function bulkPreview() {
    const { prefix, startNumber, count } = bulkForm
    const nums = Array.from({ length: Math.min(count, 3) }, (_, i) =>
      `${prefix}${startNumber + i}`)
    const tail = count > 3 ? `, … ${prefix}${startNumber + count - 1}` : ''
    return `${nums.join(', ')}${tail}`
  }

  async function handleBulkCreate(e: React.FormEvent) {
    e.preventDefault()
    setBulkLoading(true)
    const { building, floor, type, capacity, count, startNumber, prefix } = bulkForm
    const roomRows = Array.from({ length: count }, (_, i) => ({
      room_number: `${prefix}${startNumber + i}`,
      type,
      capacity,
      floor: floor || null,
      notes: building || null,
    }))
    const result = await bulkCreateRooms(weddingId, roomRows)
    if (result.error) {
      toast.error(result.error)
    } else {
      // Fetch fresh by reloading — simpler than constructing fake UUIDs
      toast.success(`${count} rooms added`)
      setBulkOpen(false)
      window.location.reload()
    }
    setBulkLoading(false)
  }

  // ─── Edit room ───────────────────────────────────────────────

  function openEdit(room: Room) {
    setEditRoom(room)
    setEditForm({
      room_number: room.room_number,
      type: room.type,
      capacity: room.capacity,
      floor: room.floor ?? '',
      notes: room.notes ?? '',
    })
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editRoom) return
    setEditLoading(true)
    const payload = { ...editForm, capacity: Number(editForm.capacity), floor: editForm.floor || null, notes: editForm.notes || null }
    const result = await updateRoom(weddingId, editRoom.id, payload)
    if (result.error) toast.error(result.error)
    else {
      setRooms(prev => prev.map(r => r.id === editRoom.id ? { ...r, ...payload } : r))
      toast.success('Room updated')
      setEditRoom(null)
    }
    setEditLoading(false)
  }

  async function handleDeleteRoom(roomId: string) {
    const result = await deleteRoom(weddingId, roomId)
    if (result.error) toast.error(result.error)
    else {
      setRooms(prev => prev.filter(r => r.id !== roomId))
      toast.success('Room deleted')
      setDeleteRoomId(null)
    }
  }

  // ─── Quick assign ────────────────────────────────────────────

  async function handleQuickAssign(room: Room) {
    if (!selectedGuest) return
    const checkIn  = selectedGuest.arrival_date   ?? wedding?.date_from ?? ''
    const checkOut = selectedGuest.departure_date  ?? wedding?.date_to   ?? ''
    const result = await allocateGuest(weddingId, room.id, {
      guest_id: selectedGuest.id,
      check_in: checkIn,
      check_out: checkOut,
    })
    if (result.error) { toast.error(result.error); return }
    const newAlloc: Allocation = {
      id: result.id!,
      check_in: checkIn,
      check_out: checkOut,
      kit_given: false,
      kit_given_at: null,
      guests: { id: selectedGuest.id, name: selectedGuest.name, family_members: selectedGuest.family_members },
    }
    setRooms(prev => prev.map(r =>
      r.id === room.id ? { ...r, room_allocations: [...r.room_allocations, newAlloc] } : r
    ))
    toast.success(`${selectedGuest.name} → Room ${room.room_number}`)
    setSelectedGuest(null)
  }

  async function handleRemove(roomId: string, allocationId: string, name: string) {
    const result = await removeAllocation(weddingId, allocationId)
    if (result.error) toast.error(result.error)
    else {
      setRooms(prev => prev.map(r =>
        r.id === roomId
          ? { ...r, room_allocations: r.room_allocations.filter(a => a.id !== allocationId) }
          : r
      ))
      toast.success(`${name} removed`)
    }
  }

  async function handleKitToggle(roomId: string, alloc: Allocation) {
    const newVal = !alloc.kit_given
    const result = await markKitGiven(weddingId, alloc.id, newVal)
    if (result.error) toast.error(result.error)
    else {
      setRooms(prev => prev.map(r =>
        r.id === roomId ? {
          ...r,
          room_allocations: r.room_allocations.map(a =>
            a.id === alloc.id
              ? { ...a, kit_given: newVal, kit_given_at: newVal ? new Date().toISOString() : null }
              : a
          )
        } : r
      ))
    }
  }

  // ─── Floor maps ──────────────────────────────────────────────

  function handleMapFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image too large — please use a compressed image under 2 MB')
      return
    }
    const reader = new FileReader()
    reader.onload = ev => setMapPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleMapSave() {
    if (!mapPreview || !mapLabel.trim()) return
    setMapLoading(true)
    const result = await saveRoomMap(weddingId, mapLabel.trim(), mapPreview)
    if (result.error) toast.error(result.error)
    else {
      setMaps(prev => [...prev, {
        id: result.id!,
        label: mapLabel.trim(),
        map_data: mapPreview,
        created_at: new Date().toISOString(),
      }])
      setMapLabel('')
      setMapPreview(null)
      if (mapFileRef.current) mapFileRef.current.value = ''
      toast.success('Map saved')
    }
    setMapLoading(false)
  }

  async function handleMapDelete(mapId: string) {
    const result = await deleteRoomMap(weddingId, mapId)
    if (result.error) toast.error(result.error)
    else setMaps(prev => prev.filter(m => m.id !== mapId))
  }

  // ─── Render ──────────────────────────────────────────────────

  const assignMode = !!selectedGuest

  return (
    <div className="flex h-full">

      {/* ── LEFT PANEL: Guests ─────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 border-r border-stone-200 bg-white flex flex-col overflow-hidden">

        {/* Panel header */}
        <div className="px-4 py-4 border-b border-stone-100">
          <p className="text-sm font-semibold text-stone-900">Guests</p>
          <p className="text-xs text-stone-400 mt-0.5">
            {unassigned.length} need a room · {assigned.length} assigned
          </p>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-stone-100">
          <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5">
            <Search className="w-3.5 h-3.5 text-stone-400 flex-shrink-0" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search guests…"
              className="flex-1 text-sm bg-transparent outline-none text-stone-800 placeholder-stone-400"
            />
          </div>
        </div>

        {/* Guest list */}
        <div className="flex-1 overflow-y-auto py-2">

          {/* Unassigned */}
          {unassigned.length === 0 && !search && (
            <p className="text-xs text-stone-400 text-center py-6">All guests have a room assigned</p>
          )}
          {unassigned.map(g => {
            const fc = familyCount(g)
            const isSelected = selectedGuest?.id === g.id
            return (
              <div key={g.id}
                onClick={() => setSelectedGuest(isSelected ? null : g)}
                className={`mx-2 mb-1.5 p-3 rounded-xl cursor-pointer border transition-all ${
                  isSelected
                    ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-300'
                    : 'bg-white border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                }`}>
                <div className="flex items-start justify-between gap-1">
                  <p className="text-sm font-medium text-stone-900 leading-snug">{g.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize flex-shrink-0 ${
                    g.side === 'bride' ? 'bg-rose-50 text-rose-700' :
                    g.side === 'groom' ? 'bg-blue-50 text-blue-700' : 'bg-stone-100 text-stone-600'
                  }`}>{g.side}</span>
                </div>

                {fc > 0 && (
                  <p className="text-xs text-stone-400 mt-0.5">
                    {g.family_members!.map(m => m.name).join(' · ')}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-1.5">
                  {g.arrival_date && (
                    <span className="text-[10px] text-stone-400">
                      {fmt(g.arrival_date)}{g.departure_date ? ` – ${fmt(g.departure_date)}` : ''}
                    </span>
                  )}
                </div>

                {isSelected ? (
                  <p className="text-xs font-medium text-rose-600 mt-2">
                    ← Click a vacant room to assign
                  </p>
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); setSelectedGuest(g) }}
                    className="mt-2 text-xs font-medium text-stone-500 hover:text-rose-700 transition-colors">
                    Assign room →
                  </button>
                )}
              </div>
            )
          })}

          {/* Assigned (collapsible) */}
          {assigned.length > 0 && (
            <div className="mt-1">
              <button
                onClick={() => setAssignedCollapsed(!assignedCollapsed)}
                className="flex items-center gap-1.5 text-xs font-medium text-stone-400 uppercase tracking-wider px-5 py-2 w-full hover:text-stone-600 transition-colors">
                {assignedCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                Assigned ({assigned.length})
              </button>

              {!assignedCollapsed && assigned.map(g => {
                const roomForGuest = rooms.find(r => r.room_allocations.some(a => getGuest(a)?.id === g.id))
                const alloc = roomForGuest?.room_allocations.find(a => getGuest(a)?.id === g.id)
                return (
                  <div key={g.id} className="mx-2 mb-1 px-3 py-2 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-stone-700">{g.name}</p>
                      {roomForGuest && (
                        <p className="text-[10px] text-stone-400 mt-0.5">
                          Room {roomForGuest.room_number} · {roomForGuest.type}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {alloc && (
                        <button
                          onClick={() => handleKitToggle(roomForGuest!.id, alloc)}
                          title={alloc.kit_given ? 'Kit given' : 'Mark kit given'}
                          className={`p-1 rounded transition-colors ${alloc.kit_given ? 'text-green-600' : 'text-stone-300 hover:text-stone-500'}`}>
                          <Gift className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {alloc && (
                        <button
                          onClick={() => handleRemove(roomForGuest!.id, alloc.id, g.name)}
                          className="p-1 text-stone-300 hover:text-red-500 rounded transition-colors">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: Rooms ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto bg-stone-50">

        {/* Panel header */}
        <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold text-stone-700 mr-2">
              {stats.total} rooms · {stats.assigned} assigned · {stats.available} vacant · {stats.kitsPending} kits pending
            </p>
            {floors.map(f => (
              <button key={f}
                onClick={() => setFloorFilter(f)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  floorFilter === f
                    ? 'bg-stone-900 text-white'
                    : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}>
                {f === 'all' ? 'All floors' : `Floor ${f}`}
              </button>
            ))}
            <button
              onClick={() => setAvailableOnly(!availableOnly)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                availableOnly
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}>
              Vacant only
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setMapsOpen(!mapsOpen)}>
              <Map className="w-3.5 h-3.5 mr-1" /> Maps
            </Button>
            <Button size="sm" className="bg-rose-700 hover:bg-rose-800" onClick={() => setBulkOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add rooms
            </Button>
          </div>
        </div>

        {/* Assign-mode banner */}
        {assignMode && (
          <div className="mx-6 mt-4 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-rose-800">
                Assigning: {selectedGuest!.name}
                {familyCount(selectedGuest) > 0 && ` (+${familyCount(selectedGuest)} family)`}
              </p>
              <p className="text-xs text-rose-600 mt-0.5">Click any vacant room below to assign</p>
            </div>
            <button onClick={() => setSelectedGuest(null)}
              className="text-rose-400 hover:text-rose-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Floor maps panel */}
        {mapsOpen && (
          <div className="mx-6 mt-4 bg-white border border-stone-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-stone-800 flex items-center gap-2">
                <Map className="w-4 h-4 text-stone-500" /> Floor Maps
              </p>
            </div>

            {/* Existing maps */}
            {maps.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
                {maps.map(m => (
                  <div key={m.id} className="relative group">
                    <button
                      onClick={() => setExpandedMap(expandedMap === m.id ? null : m.id)}
                      className="w-full">
                      <img
                        src={m.map_data}
                        alt={m.label}
                        className="w-full h-28 object-cover rounded-lg border border-stone-200"
                      />
                      <p className="text-xs text-stone-600 font-medium mt-1.5 text-left truncate">{m.label}</p>
                    </button>
                    <button
                      onClick={() => handleMapDelete(m.id)}
                      className="absolute top-1.5 right-1.5 bg-white rounded-full p-0.5 shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50 hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Expanded map view */}
            {expandedMap && (
              <div className="mb-4">
                {maps.filter(m => m.id === expandedMap).map(m => (
                  <img key={m.id} src={m.map_data} alt={m.label}
                    className="w-full max-h-[60vh] object-contain rounded-xl border border-stone-200" />
                ))}
              </div>
            )}

            {/* Upload new */}
            <div className="border-t border-stone-100 pt-3 space-y-2">
              <p className="text-xs font-medium text-stone-500">Upload a floor plan</p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Label (e.g. Block A · Floor 2)"
                  value={mapLabel}
                  onChange={e => setMapLabel(e.target.value)}
                  className="text-sm"
                />
                <label className={`flex items-center justify-center gap-2 border rounded-lg px-3 py-2 text-xs font-medium cursor-pointer transition-colors ${
                  mapPreview ? 'bg-green-50 border-green-200 text-green-700' : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                }`}>
                  <input
                    ref={mapFileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleMapFileChange}
                  />
                  {mapPreview ? (
                    <><ImageIcon className="w-3.5 h-3.5" /> Image ready</>
                  ) : (
                    <><Upload className="w-3.5 h-3.5" /> Choose image (max 2 MB)</>
                  )}
                </label>
              </div>
              {mapPreview && (
                <img src={mapPreview} alt="Preview"
                  className="h-20 w-auto rounded-lg border border-stone-200 object-cover" />
              )}
              <Button
                size="sm"
                disabled={!mapPreview || !mapLabel.trim() || mapLoading}
                onClick={handleMapSave}
                className="bg-rose-700 hover:bg-rose-800">
                {mapLoading ? 'Saving…' : 'Save map'}
              </Button>
            </div>
          </div>
        )}

        {/* Empty state */}
        {rooms.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <BedDouble className="w-10 h-10 text-stone-300 mb-3" />
            <p className="text-stone-500 font-medium">No rooms yet</p>
            <p className="text-stone-400 text-sm mt-1">Add rooms from your hotel block to start allocating guests</p>
            <Button onClick={() => setBulkOpen(true)} variant="outline" className="mt-4">
              <Plus className="w-4 h-4 mr-1.5" /> Add rooms
            </Button>
          </div>
        )}

        {/* Room tiles by floor */}
        <div className="px-6 py-4 space-y-6">
          {Object.keys(roomsByFloor).sort().map(floor => (
            <div key={floor}>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
                {floor === 'Other' ? 'Other' : `Floor ${floor}`} · {roomsByFloor[floor].length} rooms
              </p>
              <div className="flex flex-wrap gap-2">
                {roomsByFloor[floor]
                  .sort((a, b) => a.room_number.localeCompare(b.room_number, undefined, { numeric: true }))
                  .map(room => {
                    const isOccupied = room.room_allocations.length > 0
                    const alloc = room.room_allocations[0]
                    const guest = alloc ? getGuest(alloc) : null
                    const fc = guest ? familyCount(guest) : 0
                    const isClickable = assignMode && !isOccupied
                    const isDimmed = assignMode && isOccupied

                    return (
                      <div key={room.id}
                        onClick={isClickable ? () => handleQuickAssign(room) : undefined}
                        className={`relative w-[80px] flex flex-col rounded-xl border p-2 text-center transition-all ${
                          isClickable
                            ? 'bg-green-50 border-green-300 cursor-pointer hover:bg-green-100 hover:shadow-sm hover:scale-105'
                            : isDimmed
                              ? 'bg-stone-50 border-stone-200 opacity-40 cursor-default'
                              : isOccupied
                                ? 'bg-white border-stone-200 hover:border-stone-300'
                                : 'bg-white border-dashed border-stone-200 hover:border-stone-300'
                        }`}>

                        {/* Room number */}
                        <p className="text-sm font-bold text-stone-900 leading-tight">{room.room_number}</p>

                        {/* Type */}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold mt-1 inline-block ${
                          TYPE_COLORS[room.type] ?? TYPE_COLORS.standard
                        }`}>
                          {TYPE_SHORT[room.type] ?? room.type}
                        </span>

                        {/* Occupant */}
                        <p className={`text-[10px] mt-1.5 leading-tight truncate w-full px-0.5 ${
                          isOccupied ? 'text-stone-700 font-medium' : 'text-stone-300'
                        }`}>
                          {guest ? shortName(guest.name) : (isClickable ? '+ Assign' : 'Vacant')}
                        </p>
                        {fc > 0 && (
                          <p className="text-[9px] text-stone-400">+{fc}</p>
                        )}

                        {/* Kit icon */}
                        {alloc && (
                          <button
                            onClick={e => { e.stopPropagation(); handleKitToggle(room.id, alloc) }}
                            title={alloc.kit_given ? 'Kit given — click to undo' : 'Mark kit given'}
                            className={`mt-1.5 mx-auto transition-colors ${alloc.kit_given ? 'text-green-500' : 'text-stone-200 hover:text-stone-400'}`}>
                            <Gift className="w-3 h-3" />
                          </button>
                        )}

                        {/* Overflow menu */}
                        {!assignMode && (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              onClick={e => e.stopPropagation()}
                              className="absolute top-1 right-1 text-stone-300 hover:text-stone-600 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-0.5 rounded">
                              <MoreVertical className="w-3 h-3" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              <DropdownMenuItem onClick={() => openEdit(room)}>
                                <Pencil className="w-3 h-3 mr-2" /> Edit room
                              </DropdownMenuItem>
                              {alloc && guest && (
                                <DropdownMenuItem onClick={() => handleRemove(room.id, alloc.id, guest.name)}>
                                  <X className="w-3 h-3 mr-2" /> Remove {shortName(guest.name)}
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600" onClick={() => setDeleteRoomId(room.id)}>
                                <Trash2 className="w-3 h-3 mr-2" /> Delete room
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── DIALOGS ─────────────────────────────────────────────── */}

      {/* Bulk add rooms */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add rooms</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBulkCreate} className="space-y-4">

            <div className="space-y-1.5">
              <Label>Building / block (optional)</Label>
              <Input
                placeholder="e.g. Main Block, Heritage Wing, Annexe"
                value={bulkForm.building}
                onChange={e => setBulkForm(f => ({ ...f, building: e.target.value }))}
              />
              <p className="text-xs text-stone-400">Saved as a note on each room for reference</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Floor</Label>
                <Input
                  placeholder="e.g. 1"
                  value={bulkForm.floor}
                  onChange={e => setBulkForm(f => ({ ...f, floor: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Room type</Label>
                <Select
                  value={bulkForm.type}
                  onValueChange={v => setBulkForm(f => ({ ...f, type: v ?? '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Capacity (pax)</Label>
                <Input
                  type="number" min={1} max={10}
                  value={bulkForm.capacity}
                  onChange={e => setBulkForm(f => ({ ...f, capacity: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>How many rooms</Label>
                <Input
                  type="number" min={1} max={200}
                  value={bulkForm.count}
                  onChange={e => setBulkForm(f => ({ ...f, count: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>First number</Label>
                <Input
                  type="number" min={1}
                  value={bulkForm.startNumber}
                  onChange={e => setBulkForm(f => ({ ...f, startNumber: Number(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Prefix (optional)</Label>
              <Input
                placeholder="e.g. A- or H-"
                value={bulkForm.prefix}
                onChange={e => setBulkForm(f => ({ ...f, prefix: e.target.value }))}
              />
            </div>

            {/* Preview */}
            <div className="bg-stone-50 rounded-xl px-4 py-3 text-sm">
              <p className="text-xs font-medium text-stone-500 mb-1">Preview</p>
              <p className="text-stone-700 font-medium">
                {bulkForm.count} × {bulkForm.type} rooms
              </p>
              <p className="text-stone-500 text-xs mt-0.5">
                {bulkPreview()}
                {bulkForm.floor && ` · Floor ${bulkForm.floor}`}
                {bulkForm.building && ` · ${bulkForm.building}`}
                {` · ${bulkForm.capacity} pax each`}
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-rose-700 hover:bg-rose-800" disabled={bulkLoading}>
                {bulkLoading ? 'Adding…' : `Add ${bulkForm.count} rooms`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit room */}
      <Dialog open={!!editRoom} onOpenChange={() => setEditRoom(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit room</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Room number *</Label>
                <Input value={editForm.room_number}
                  onChange={e => setEditForm(f => ({ ...f, room_number: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Floor</Label>
                <Input value={editForm.floor}
                  onChange={e => setEditForm(f => ({ ...f, floor: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={editForm.type} onValueChange={v => setEditForm(f => ({ ...f, type: v ?? '' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Capacity</Label>
                <Input type="number" min={1} value={editForm.capacity}
                  onChange={e => setEditForm(f => ({ ...f, capacity: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="e.g. connecting room, ground floor"
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditRoom(null)}>Cancel</Button>
              <Button type="submit" className="bg-rose-700 hover:bg-rose-800" disabled={editLoading}>
                {editLoading ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete room confirm */}
      <Dialog open={!!deleteRoomId} onOpenChange={() => setDeleteRoomId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete room?</DialogTitle></DialogHeader>
          <p className="text-sm text-stone-500">This removes the room and any guest assignments to it.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteRoomId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteRoomId && handleDeleteRoom(deleteRoomId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
