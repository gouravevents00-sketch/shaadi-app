'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, MapPin, SlidersHorizontal, X } from 'lucide-react'
import { addRoom, deleteRoom, allotRoom, removeFromRoom, bulkCreateRooms } from '../actions'

type Room = {
  id: string
  name: string
  room_type: string
  capacity: number
  floor_block: string | null
  map_url: string | null
  notes: string | null
}

type Guest = {
  id: string
  name: string
  plus_count: number
  room_id: string | null
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
  initialRooms: Room[]
  initialGuests: Guest[]
}

export default function RoomsClient({ celebrationId, initialRooms, initialGuests }: Props) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms)
  const [guests, setGuests] = useState<Guest[]>(initialGuests)
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [showBulkRooms, setShowBulkRooms] = useState(false)
  const [showAvailableOnly, setShowAvailableOnly] = useState(false)
  const [allotting, setAllotting] = useState<string | null>(null)
  const [roomForm, setRoomForm] = useState({ name: '', room_type: 'double', capacity: '2', floor_block: '' })
  const [roomMapUrl, setRoomMapUrl] = useState('')
  const [bulkRoomPrefix, setBulkRoomPrefix] = useState('')
  const [bulkRoomStart, setBulkRoomStart] = useState('101')
  const [bulkRoomEnd, setBulkRoomEnd] = useState('110')
  const [bulkRoomType, setBulkRoomType] = useState('double')
  const [bulkRoomCapacity, setBulkRoomCapacity] = useState('2')
  const [bulkRoomFloor, setBulkRoomFloor] = useState('')
  const [bulkRoomMap, setBulkRoomMap] = useState('')
  const [isPending, startTransition] = useTransition()

  const unallottedGuests = guests.filter(g => !g.room_id)

  function handleAllotGuest(roomId: string, guestId: string) {
    const guest = guests.find(g => g.id === guestId)
    if (!guest) return
    startTransition(async () => {
      const res = await allotRoom({ roomId, guestId, celebrationId })
      if ('error' in res) { toast.error(res.error); return }
      setGuests(prev => prev.map(g => g.id === guestId ? { ...g, room_id: roomId } : g))
      setAllotting(null)
      toast.success(`${guest.name} assigned to room`)
    })
  }

  function handleRemoveFromRoom(guestId: string, roomId: string) {
    const guest = guests.find(g => g.id === guestId)
    startTransition(async () => {
      await removeFromRoom(guestId, roomId)
      setGuests(prev => prev.map(g => g.id === guestId ? { ...g, room_id: null } : g))
      if (guest) toast.success(`${guest.name} removed from room`)
    })
  }

  async function handleBulkRooms() {
    const start = parseInt(bulkRoomStart)
    const end = parseInt(bulkRoomEnd)
    if (isNaN(start) || isNaN(end) || end < start || (end - start) > 50) {
      toast.error('Invalid range — max 50 rooms at once'); return
    }
    const roomsToCreate = Array.from({ length: end - start + 1 }, (_, i) => ({
      name: `${bulkRoomPrefix ? bulkRoomPrefix + ' ' : ''}${start + i}`,
      room_type: bulkRoomType,
      capacity: parseInt(bulkRoomCapacity) || 2,
      floor_block: bulkRoomFloor || undefined,
      map_url: bulkRoomMap || undefined,
    }))
    const res = await bulkCreateRooms(celebrationId, roomsToCreate)
    if ('error' in res) { toast.error(res.error); return }
    const created: Room[] = (res.rooms || []).map((r: { id: string; name: string; room_type: string; capacity: number; floor_block: string | null; map_url: string | null }) => ({
      id: r.id, name: r.name, room_type: r.room_type, capacity: r.capacity,
      floor_block: r.floor_block, map_url: r.map_url, notes: null,
    }))
    setRooms(prev => [...prev, ...created])
    setShowBulkRooms(false)
    setBulkRoomPrefix(''); setBulkRoomStart('101'); setBulkRoomEnd('110')
    setBulkRoomFloor(''); setBulkRoomMap('')
    toast.success(`${created.length} rooms created!`)
  }

  const displayRooms = showAvailableOnly
    ? rooms.filter(r => r.capacity - guests.filter(g => g.room_id === r.id).length > 0)
    : rooms

  const grouped = displayRooms.reduce<Record<string, Room[]>>((acc, r) => {
    const key = r.floor_block || 'No floor/wing specified'
    acc[key] = acc[key] || []
    acc[key].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-800">Room Allotment</p>
          <p className="text-xs text-stone-400">{rooms.length} rooms · {guests.filter(g => g.room_id).length}/{guests.length} guests allotted</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowAvailableOnly(v => !v)}
            className={`flex items-center gap-1 text-xs font-medium px-2.5 py-2 rounded-lg border transition-colors ${showAvailableOnly ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-400'}`}
          >
            <SlidersHorizontal className="w-3 h-3" /> Available
          </button>
          <button
            onClick={() => setShowBulkRooms(v => !v)}
            className="flex items-center gap-1 bg-stone-100 text-stone-700 text-xs font-medium px-2.5 py-2 rounded-lg hover:bg-stone-200 transition-colors"
          >
            <Plus className="w-3 h-3" /> Bulk
          </button>
          <button
            onClick={() => setShowAddRoom(v => !v)}
            className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>

      {showAddRoom && (
        <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-stone-800">Add room</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-stone-500 mb-1 block">Room name *</label>
              <Input value={roomForm.name} onChange={e => setRoomForm(f => ({ ...f, name: e.target.value }))} placeholder="Room 101 / Garden Suite" autoFocus />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Type</label>
              <select
                value={roomForm.room_type}
                onChange={e => setRoomForm(f => ({ ...f, room_type: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none"
              >
                {['single', 'double', 'suite', 'family', 'dormitory', 'other'].map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Capacity</label>
              <Input type="number" min="1" max="20" value={roomForm.capacity} onChange={e => setRoomForm(f => ({ ...f, capacity: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-stone-500 mb-1 block">Floor / Wing (optional)</label>
              <Input value={roomForm.floor_block} onChange={e => setRoomForm(f => ({ ...f, floor_block: e.target.value }))} placeholder="Ground Floor / Wing A" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-stone-500 mb-1 block">Map / location link (optional)</label>
              <Input value={roomMapUrl} onChange={e => setRoomMapUrl(e.target.value)} placeholder="https://maps.google.com/…" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddRoom(false)} className="text-xs text-stone-500 px-3 py-1.5">Cancel</button>
            <button
              onClick={() => {
                if (!roomForm.name.trim()) return
                startTransition(async () => {
                  const res = await addRoom(celebrationId, {
                    name: roomForm.name, room_type: roomForm.room_type,
                    capacity: parseInt(roomForm.capacity) || 2,
                    floor_block: roomForm.floor_block || undefined,
                    map_url: roomMapUrl || undefined,
                  })
                  if ('error' in res) { toast.error(res.error); return }
                  setRooms(prev => [...prev, {
                    id: res.id, name: roomForm.name, room_type: roomForm.room_type,
                    capacity: parseInt(roomForm.capacity) || 2,
                    floor_block: roomForm.floor_block || null,
                    map_url: roomMapUrl || null, notes: null,
                  }])
                  setRoomForm({ name: '', room_type: 'double', capacity: '2', floor_block: '' })
                  setRoomMapUrl('')
                  setShowAddRoom(false)
                  toast.success('Room added')
                })
              }}
              disabled={!roomForm.name.trim() || isPending}
              className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {showBulkRooms && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-stone-800">Bulk create rooms</p>
          <p className="text-xs text-stone-400">Creates rooms with a numbered sequence (e.g. Room 101 to Room 115)</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-stone-500 mb-1 block">Prefix (optional)</label>
              <Input value={bulkRoomPrefix} onChange={e => setBulkRoomPrefix(e.target.value)} placeholder="Room / Suite / Cottage" autoFocus />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Start number</label>
              <Input type="number" value={bulkRoomStart} onChange={e => setBulkRoomStart(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">End number</label>
              <Input type="number" value={bulkRoomEnd} onChange={e => setBulkRoomEnd(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Type</label>
              <select
                value={bulkRoomType}
                onChange={e => setBulkRoomType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none"
              >
                {['single', 'double', 'suite', 'family', 'dormitory', 'other'].map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Capacity each</label>
              <Input type="number" min="1" value={bulkRoomCapacity} onChange={e => setBulkRoomCapacity(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Floor / Wing</label>
              <Input value={bulkRoomFloor} onChange={e => setBulkRoomFloor(e.target.value)} placeholder="Ground Floor" />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Map URL</label>
              <Input value={bulkRoomMap} onChange={e => setBulkRoomMap(e.target.value)} placeholder="Optional map link" />
            </div>
          </div>
          <p className="text-xs text-stone-400">Will create: {Math.max(0, parseInt(bulkRoomEnd) - parseInt(bulkRoomStart) + 1) || 0} rooms</p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowBulkRooms(false)} className="text-xs text-stone-500 px-3 py-1.5">Cancel</button>
            <button
              onClick={handleBulkRooms}
              disabled={isPending}
              className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50"
            >
              Create rooms
            </button>
          </div>
        </div>
      )}

      {unallottedGuests.length > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-700 font-medium">{unallottedGuests.length} guests not yet assigned to a room</p>
        </div>
      )}

      {displayRooms.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
          <MapPin className="w-10 h-10 mx-auto mb-3 text-stone-200" />
          <p className="text-stone-500 text-sm">{showAvailableOnly ? 'No available rooms' : 'No rooms yet'}</p>
          {!showAvailableOnly && <button onClick={() => setShowAddRoom(true)} className="text-xs text-rose-600 mt-2">+ Add first room</button>}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([floor, floorRooms]) => (
            <div key={floor}>
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">{floor}</p>
              <div className="space-y-3">
                {floorRooms.map(room => {
                  const occupants = guests.filter(g => g.room_id === room.id)
                  const vacancy = room.capacity - occupants.length
                  return (
                    <div key={room.id} className="bg-white border border-stone-100 rounded-xl p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-semibold text-stone-800">{room.name}</p>
                          <p className="text-xs text-stone-400">{room.room_type}</p>
                          {room.map_url && (
                            <a
                              href={room.map_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-blue-500 hover:text-blue-700 flex items-center gap-0.5 mt-0.5"
                            >
                              <MapPin className="w-2.5 h-2.5" /> View map
                            </a>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className={`text-xs font-bold px-2 py-0.5 rounded-full ${vacancy === 0 ? 'bg-red-100 text-red-600' : vacancy <= 1 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {occupants.length}/{room.capacity}
                          </div>
                          <p className="text-[10px] text-stone-400 mt-0.5">{vacancy > 0 ? `${vacancy} vacant` : 'Full'}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5 mb-2">
                        {occupants.map(g => (
                          <div key={g.id} className="flex items-center gap-2 bg-stone-50 rounded-lg px-2.5 py-1.5">
                            <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold flex-shrink-0">{g.name[0]}</div>
                            <span className="text-xs text-stone-700 flex-1 truncate">{g.name}</span>
                            {g.plus_count > 0 && <span className="text-[10px] text-stone-400">+{g.plus_count}</span>}
                            <button
                              onClick={() => handleRemoveFromRoom(g.id, room.id)}
                              className="text-stone-300 hover:text-red-400 flex-shrink-0"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      {vacancy > 0 && unallottedGuests.length > 0 && (
                        allotting === room.id ? (
                          <div className="space-y-1">
                            <p className="text-[10px] text-stone-500 mb-1">Select guest:</p>
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {unallottedGuests.map(g => (
                                <button
                                  key={g.id}
                                  onClick={() => handleAllotGuest(room.id, g.id)}
                                  className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium transition-colors"
                                >
                                  {g.name} {g.plus_count > 0 ? `+${g.plus_count}` : ''}
                                </button>
                              ))}
                            </div>
                            <button onClick={() => setAllotting(null)} className="text-[10px] text-stone-400 mt-1">Cancel</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAllotting(room.id)}
                            className="w-full text-xs text-rose-600 border border-dashed border-rose-200 rounded-lg py-1.5 hover:bg-rose-50 transition-colors font-medium"
                          >
                            + Assign guest ({vacancy} spot{vacancy !== 1 ? 's' : ''} available)
                          </button>
                        )
                      )}
                      <button
                        onClick={() => {
                          setRooms(prev => prev.filter(r => r.id !== room.id))
                          startTransition(async () => { await deleteRoom(room.id) })
                        }}
                        className="text-[10px] text-stone-300 hover:text-red-400 mt-2 transition-colors"
                      >
                        Delete room
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
