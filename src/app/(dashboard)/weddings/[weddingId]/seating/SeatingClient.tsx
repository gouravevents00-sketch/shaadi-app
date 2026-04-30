'use client'

import { useState, useMemo } from 'react'
import { Plus, Trash2, Users, Search, Star, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { createTable, updateTable, deleteTable, assignGuest, unassignGuest } from './actions'

interface STable {
  id: string
  name: string
  capacity: number
  event_id: string | null
}

interface Assignment {
  id: string
  table_id: string
  guest_id: string
}

interface Guest {
  id: string
  name: string
  side: string
  is_vip: boolean
  plus_count: number
  family_group: string | null
}

interface Event {
  id: string
  name: string
  date: string
}

const SIDE_COLORS: Record<string, string> = {
  bride: 'bg-pink-50 text-pink-700',
  groom: 'bg-blue-50 text-blue-700',
  both: 'bg-purple-50 text-purple-700',
  shared: 'bg-stone-100 text-stone-500',
  neutral: 'bg-stone-100 text-stone-400',
}

export default function SeatingClient({ weddingId, initialTables, initialAssignments, guests, events }: {
  weddingId: string
  initialTables: STable[]
  initialAssignments: Assignment[]
  guests: Guest[]
  events: Event[]
}) {
  const [tables, setTables] = useState<STable[]>(initialTables)
  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments)
  const [assigningTableId, setAssigningTableId] = useState<string | null>(null)
  const [guestSearch, setGuestSearch] = useState('')
  const [editingTableId, setEditingTableId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCapacity, setEditCapacity] = useState(10)

  // New table form
  const [newName, setNewName] = useState('')
  const [newCapacity, setNewCapacity] = useState('10')
  const [adding, setAdding] = useState(false)

  // Stats
  const assignedGuestIds = new Set(assignments.map(a => a.guest_id))
  const totalPax = guests.reduce((s, g) => s + 1 + (g.plus_count ?? 0), 0)
  const seatedPax = guests
    .filter(g => assignedGuestIds.has(g.id))
    .reduce((s, g) => s + 1 + (g.plus_count ?? 0), 0)

  function getTableGuests(tableId: string) {
    const ids = assignments.filter(a => a.table_id === tableId).map(a => a.guest_id)
    return guests.filter(g => ids.includes(g.id))
  }

  function getTablePax(tableId: string) {
    return getTableGuests(tableId).reduce((s, g) => s + 1 + (g.plus_count ?? 0), 0)
  }

  async function handleAddTable(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    const cap = parseInt(newCapacity) || 10
    const tmp: STable = { id: 'tmp-' + Date.now(), name: newName.trim(), capacity: cap, event_id: null }
    setTables(prev => [...prev, tmp])
    setNewName(''); setNewCapacity('10'); setAdding(false)
    const res = await createTable(weddingId, { name: tmp.name, capacity: cap })
    if ('error' in res) { toast.error(res.error); setTables(prev => prev.filter(t => t.id !== tmp.id)); return }
    setTables(prev => prev.map(t => t.id === tmp.id ? { ...t, id: res.id! } : t))
  }

  async function handleDeleteTable(tableId: string) {
    setTables(prev => prev.filter(t => t.id !== tableId))
    setAssignments(prev => prev.filter(a => a.table_id !== tableId))
    await deleteTable(weddingId, tableId)
  }

  async function handleStartEdit(table: STable) {
    setEditingTableId(table.id)
    setEditName(table.name)
    setEditCapacity(table.capacity)
  }

  async function handleSaveEdit(table: STable) {
    setEditingTableId(null)
    if (editName === table.name && editCapacity === table.capacity) return
    setTables(prev => prev.map(t => t.id === table.id ? { ...t, name: editName, capacity: editCapacity } : t))
    await updateTable(weddingId, table.id, { name: editName, capacity: editCapacity })
  }

  async function handleAssign(tableId: string, guestId: string) {
    const prevAssignment = assignments.find(a => a.guest_id === guestId)
    // Optimistic: remove old, add new
    const newAssignment: Assignment = { id: 'tmp-' + Date.now(), table_id: tableId, guest_id: guestId }
    setAssignments(prev => [
      ...prev.filter(a => a.guest_id !== guestId),
      newAssignment,
    ])
    const res = await assignGuest(weddingId, tableId, guestId)
    if (res.error) {
      toast.error(res.error)
      setAssignments(prev => {
        const filtered = prev.filter(a => a.id !== newAssignment.id)
        return prevAssignment ? [...filtered, prevAssignment] : filtered
      })
    }
  }

  async function handleUnassign(tableId: string, guestId: string) {
    setAssignments(prev => prev.filter(a => !(a.table_id === tableId && a.guest_id === guestId)))
    const res = await unassignGuest(weddingId, tableId, guestId)
    if (res.error) toast.error(res.error)
  }

  // Guests available to assign (not yet seated, or for searching)
  const filteredGuests = useMemo(() => {
    const q = guestSearch.toLowerCase()
    return guests.filter(g =>
      g.name.toLowerCase().includes(q) ||
      (g.family_group ?? '').toLowerCase().includes(q)
    )
  }, [guests, guestSearch])

  const unassignedGuests = filteredGuests.filter(g => !assignedGuestIds.has(g.id))

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Seating</h1>
          <p className="text-stone-500 text-sm mt-1">
            {tables.length} table{tables.length !== 1 ? 's' : ''} · {seatedPax}/{totalPax} pax seated
          </p>
        </div>
        <Button onClick={() => setAdding(true)} className="bg-rose-700 hover:bg-rose-800">
          <Plus className="w-4 h-4 mr-1.5" /> Add table
        </Button>
      </div>

      {/* Progress bar */}
      {totalPax > 0 && (
        <div className="h-1.5 bg-stone-100 rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-rose-500 rounded-full transition-all" style={{ width: `${(seatedPax / totalPax) * 100}%` }} />
        </div>
      )}

      {/* Unseated guests banner */}
      {guests.length > 0 && assignedGuestIds.size < guests.length && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <Users className="w-4 h-4 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            <span className="font-medium">{guests.length - assignedGuestIds.size} guest{guests.length - assignedGuestIds.size !== 1 ? 's' : ''}</span> not yet seated
          </p>
        </div>
      )}

      {/* Add table form */}
      {adding && (
        <form onSubmit={handleAddTable} className="mb-6 bg-white border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row gap-3">
          <Input
            autoFocus
            placeholder="Table name (e.g. Table 1, VIP Table)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="flex-1"
          />
          <Input
            type="number"
            min={1}
            max={50}
            value={newCapacity}
            onChange={e => setNewCapacity(e.target.value)}
            className="w-24"
            placeholder="Capacity"
          />
          <div className="flex gap-2">
            <Button type="submit" className="bg-rose-700 hover:bg-rose-800">Add</Button>
            <Button type="button" variant="outline" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {tables.length === 0 && !adding && (
        <div className="border border-dashed border-stone-200 rounded-xl p-8">
          <div className="text-center mb-6">
            <Users className="w-10 h-10 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-700 font-semibold">Plan your seating arrangement</p>
            <p className="text-stone-400 text-sm mt-1 max-w-xs mx-auto">Create tables, set their capacity, then drag guests from the right panel to assign seats</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-sm mx-auto mb-6 text-center">
            {[
              { step: '1', label: 'Create tables', desc: 'Name them (Table 1, VIP Table…)' },
              { step: '2', label: 'Set capacity', desc: 'How many seats per table' },
              { step: '3', label: 'Assign guests', desc: 'Pick from unassigned guest list' },
            ].map(s => (
              <div key={s.step} className="bg-stone-50 rounded-lg p-3">
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center mx-auto mb-1.5">{s.step}</div>
                <p className="text-xs font-semibold text-stone-700">{s.label}</p>
                <p className="text-xs text-stone-400 mt-0.5">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center">
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Add first table
            </Button>
          </div>
        </div>
      )}

      {/* Tables grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tables.map(table => {
          const tGuests = getTableGuests(table.id)
          const pax = getTablePax(table.id)
          const isFull = pax >= table.capacity
          const isAssigning = assigningTableId === table.id

          return (
            <div key={table.id} className={`bg-white border rounded-xl overflow-hidden transition-shadow ${isAssigning ? 'shadow-lg border-rose-300' : 'border-stone-200'}`}>
              {/* Table header */}
              <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-2">
                {editingTableId === table.id ? (
                  <>
                    <Input
                      autoFocus
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="h-7 text-sm flex-1"
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(table); if (e.key === 'Escape') setEditingTableId(null) }}
                    />
                    <Input
                      type="number"
                      value={editCapacity}
                      onChange={e => setEditCapacity(parseInt(e.target.value) || 10)}
                      className="h-7 text-sm w-16"
                    />
                    <button onClick={() => handleSaveEdit(table)} className="text-green-600 hover:text-green-700 p-1">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setEditingTableId(null)} className="text-stone-400 hover:text-stone-600 p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-stone-900 truncate">{table.name}</p>
                      <p className={`text-xs ${isFull ? 'text-red-500 font-medium' : 'text-stone-400'}`}>
                        {pax}/{table.capacity} pax{isFull ? ' · Full' : ''}
                      </p>
                    </div>
                    <button onClick={() => handleStartEdit(table)} className="p-1 text-stone-300 hover:text-stone-600">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDeleteTable(table.id)} className="p-1 text-stone-300 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              {/* Capacity bar */}
              <div className="h-1 bg-stone-100">
                <div className={`h-full rounded-full transition-all ${isFull ? 'bg-red-400' : 'bg-emerald-400'}`}
                  style={{ width: `${Math.min(100, (pax / table.capacity) * 100)}%` }} />
              </div>

              {/* Seated guests */}
              <div className="px-4 py-3 space-y-1.5 min-h-[60px]">
                {tGuests.length === 0 && (
                  <p className="text-xs text-stone-300 italic">No guests assigned</p>
                )}
                {tGuests.map(g => (
                  <div key={g.id} className="flex items-center gap-2 group">
                    {g.is_vip && <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                    <span className="text-sm text-stone-800 flex-1 truncate">{g.name}</span>
                    {g.plus_count > 0 && <span className="text-xs text-stone-400">+{g.plus_count}</span>}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize hidden sm:block ${SIDE_COLORS[g.side]}`}>{g.side}</span>
                    <button
                      onClick={() => handleUnassign(table.id, g.id)}
                      className="opacity-0 group-hover:opacity-100 text-stone-300 hover:text-red-500 transition-opacity ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Assign button */}
              <div className="px-4 pb-3">
                <button
                  onClick={() => {
                    setAssigningTableId(isAssigning ? null : table.id)
                    setGuestSearch('')
                  }}
                  className={`w-full text-xs py-1.5 rounded-lg border transition-colors ${
                    isAssigning
                      ? 'bg-rose-50 border-rose-300 text-rose-700'
                      : isFull
                      ? 'border-stone-100 text-stone-300 cursor-not-allowed'
                      : 'border-stone-200 text-stone-500 hover:border-rose-300 hover:text-rose-600'
                  }`}
                  disabled={isFull && !isAssigning}>
                  {isAssigning ? 'Done assigning' : isFull ? 'Table full' : '+ Assign guests'}
                </button>
              </div>

              {/* Guest picker (when assigning) */}
              {isAssigning && (
                <div className="border-t border-rose-100 bg-rose-50/50 px-4 py-3 space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                    <Input
                      autoFocus
                      className="pl-8 h-8 text-xs bg-white"
                      placeholder="Search guests…"
                      value={guestSearch}
                      onChange={e => setGuestSearch(e.target.value)}
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {unassignedGuests.length === 0 && (
                      <p className="text-xs text-stone-400 text-center py-2">
                        {guestSearch ? 'No matches' : 'All guests seated!'}
                      </p>
                    )}
                    {unassignedGuests.slice(0, 30).map(g => (
                      <button
                        key={g.id}
                        onClick={() => handleAssign(table.id, g.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white transition-colors text-left">
                        {g.is_vip && <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                        <span className="text-sm text-stone-800 flex-1 truncate">{g.name}</span>
                        {g.plus_count > 0 && <span className="text-xs text-stone-400">+{g.plus_count}</span>}
                        {g.family_group && <span className="text-[10px] text-stone-400 truncate max-w-[80px]">{g.family_group}</span>}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize flex-shrink-0 ${SIDE_COLORS[g.side]}`}>{g.side}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
