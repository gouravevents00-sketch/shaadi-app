'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import {
  Users, Plus, Upload, FileDown, MessageCircle, Star,
  X, Phone, Plane, Train, Car, MapPin, Loader2,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  addCelebrationGuest, deleteCelebrationGuest, updateCelebrationGuest,
  updateGuestCount, bulkImportCelebrationGuests, updateGuestFunctions, upgradeToPro,
} from '../actions'
import { useRouter } from 'next/navigation'

type CelebGuest = {
  id: string; celebration_id: string; name: string; phone: string | null
  email: string | null; dietary: string | null; plus_count: number; side: string
  family_group: string | null; relation: string | null; is_vip: boolean | null
  rsvp_status: string | null; rsvp_token: string | null; notes: string | null
  arrival_mode: string | null; arrival_time: string | null; flight_no: string | null
  needs_pickup: boolean | null; room_id: string | null; attending_function_ids: string[] | null
}
type CelebFunction = { id: string; name: string; date: string; start_time: string | null }

const DIETARY = ['', 'Veg', 'Non-Veg', 'Jain', 'Vegan', 'Gluten Free']
const SIDES = [{ v: 'both', l: 'Both sides' }, { v: 'bride', l: 'Bride side' }, { v: 'groom', l: 'Groom side' }]
const RSVP_COLORS: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-600',
  pending: 'bg-amber-100 text-amber-700',
}
const RSVP_LABELS: Record<string, string> = { confirmed: 'Attending ✓', declined: 'Declined', pending: 'Pending' }

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function GuestsClient({
  celebrationId, plan, guestCount: initialGuestCount,
  initialGuests, functions,
}: {
  celebrationId: string
  plan: string
  guestCount: number
  initialGuests: CelebGuest[]
  functions: CelebFunction[]
}) {
  const router = useRouter()
  const isPro = plan === 'pro'
  const [isPending, startTransition] = useTransition()
  const [guests, setGuests] = useState<CelebGuest[]>(initialGuests)
  const [guestCount, setGuestCount] = useState(initialGuestCount)
  const [editingCount, setEditingCount] = useState(false)
  const [countInput, setCountInput] = useState(String(initialGuestCount))
  const [guestSearch, setGuestSearch] = useState('')
  const [rsvpFilter, setRsvpFilter] = useState('all')
  const [sideFilter, setSideFilter] = useState('all')
  const [showAddGuest, setShowAddGuest] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importRows, setImportRows] = useState<Array<Record<string, string>>>([])
  const [importLoading, setImportLoading] = useState(false)
  const [guestDrawer, setGuestDrawer] = useState<CelebGuest | null>(null)
  const [drawerTab, setDrawerTab] = useState<'profile' | 'edit' | 'travel' | 'functions'>('profile')
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', dietary: '', side: 'both', family_group: '', relation: '', is_vip: false, notes: '' })
  const [guestForm, setGuestForm] = useState({ name: '', phone: '', email: '', dietary: '', plus_count: '0', side: 'both', family_group: '', relation: '', is_vip: false })

  const filteredGuests = guests.filter(g => {
    const matchSearch = !guestSearch || g.name.toLowerCase().includes(guestSearch.toLowerCase()) || g.phone?.includes(guestSearch) || false
    const matchRsvp = rsvpFilter === 'all' || g.rsvp_status === rsvpFilter
    const matchSide = sideFilter === 'all' || g.side === sideFilter
    return matchSearch && matchRsvp && matchSide
  })

  const totalPax = guests.reduce((s, g) => s + 1 + g.plus_count, 0)
  const confirmedPax = guests.filter(g => g.rsvp_status === 'confirmed').reduce((s, g) => s + 1 + g.plus_count, 0)

  function copyRsvpLink(token: string | null) {
    if (!token) { toast.error('RSVP link not ready'); return }
    navigator.clipboard.writeText(`${window.location.origin}/rsvp/${token}`)
    toast.success('RSVP link copied!')
  }

  function waLink(phone: string | null, name: string) {
    if (!phone) { toast.error('No phone number'); return }
    const clean = phone.replace(/\D/g, '')
    const msg = encodeURIComponent(`Hi ${name}! You're invited. Please confirm your RSVP.`)
    window.open(`https://wa.me/${clean.startsWith('91') ? clean : '91' + clean}?text=${msg}`, '_blank')
  }

  function handleAddGuest() {
    if (!guestForm.name.trim()) return
    startTransition(async () => {
      const res = await addCelebrationGuest(celebrationId, {
        name: guestForm.name, phone: guestForm.phone || undefined,
        dietary: guestForm.dietary || undefined,
        plus_count: parseInt(guestForm.plus_count) || 0, side: guestForm.side,
      })
      if ('error' in res) { toast.error(res.error); return }
      const newG: CelebGuest = {
        id: res.id, celebration_id: celebrationId, name: guestForm.name,
        phone: guestForm.phone || null, email: guestForm.email || null,
        dietary: guestForm.dietary || null, plus_count: parseInt(guestForm.plus_count) || 0,
        side: guestForm.side, family_group: guestForm.family_group || null,
        relation: guestForm.relation || null,
        is_vip: guestForm.is_vip, rsvp_status: 'pending', rsvp_token: null, notes: null,
        arrival_mode: null, arrival_time: null, flight_no: null, needs_pickup: null,
        room_id: null, attending_function_ids: null,
      }
      setGuests(prev => [...prev, newG])
      setGuestForm({ name: '', phone: '', email: '', dietary: '', plus_count: '0', side: 'both', family_group: '', relation: '', is_vip: false })
      setShowAddGuest(false); toast.success(`${guestForm.name} added`)
    })
  }

  function handleUpdateRsvp(guestId: string, status: string) {
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, rsvp_status: status } : g))
    startTransition(async () => { await updateCelebrationGuest(guestId, { rsvp_status: status }) })
  }

  function handleSaveEdit(guestId: string, data: Partial<CelebGuest>) {
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, ...data } : g))
    setGuestDrawer(prev => prev ? { ...prev, ...data } : null)
    startTransition(async () => {
      const res = await updateCelebrationGuest(guestId, data as Parameters<typeof updateCelebrationGuest>[1])
      if ('error' in res) toast.error(res.error)
      else toast.success('Saved')
    })
  }

  function handleDeleteGuest(guestId: string) {
    setGuests(prev => prev.filter(g => g.id !== guestId))
    setGuestDrawer(null)
    startTransition(async () => {
      const res = await deleteCelebrationGuest(guestId)
      if ('error' in res) toast.error(res.error)
      else toast.success('Removed')
    })
  }

  function handleFunctionsChange(guestId: string, functionIds: string[]) {
    setGuests(prev => prev.map(g => g.id === guestId ? { ...g, attending_function_ids: functionIds } : g))
    setGuestDrawer(prev => prev ? { ...prev, attending_function_ids: functionIds } : null)
    startTransition(async () => { await updateGuestFunctions(guestId, functionIds) })
  }

  function downloadGuestTemplate() {
    const csv = 'Name,Phone,Email,Side,Family Group,VIP,Dietary,Plus Count,Notes\nRamesh Sharma,9876543210,ramesh@email.com,bride,Sharma Family,false,Veg,1,\n'
    const blob = new Blob([csv], { type: 'text/csv' }); const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'guest_template.csv'; a.click(); URL.revokeObjectURL(url)
  }

  function handleCSVFile(file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(l => l.trim())
      if (lines.length < 2) { toast.error('CSV must have at least one data row'); return }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
      const rows = lines.slice(1).map(line => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
        const row: Record<string, string> = {}
        headers.forEach((h, i) => { row[h] = cols[i] || '' })
        return row
      }).filter(r => r['name'])
      setImportRows(rows); toast.success(`${rows.length} guests ready to import`)
    }
    reader.readAsText(file)
  }

  async function handleBulkImport() {
    if (!importRows.length) return
    setImportLoading(true)
    const rows = importRows.map(r => ({
      name: r.name || '', phone: r.phone || undefined, email: r.email || undefined,
      side: (r.side || 'both').toLowerCase(),
      family_group: r.family_group || undefined,
      is_vip: (r.vip || '').toLowerCase() === 'true',
      dietary: r.dietary || undefined,
      plus_count: parseInt(r.plus_count || '0') || 0,
      notes: r.notes || undefined,
    })).filter(r => r.name)
    const res = await bulkImportCelebrationGuests(celebrationId, rows)
    setImportLoading(false)
    if ('error' in res) { toast.error(res.error); return }
    toast.success(`${res.count} guests imported!`)
    setShowImport(false); setImportRows([])
    const newGuests = rows.map((r, i) => ({
      id: `import-${Date.now()}-${i}`, celebration_id: celebrationId,
      name: r.name, phone: r.phone || null, email: r.email || null,
      dietary: r.dietary || null, plus_count: r.plus_count, side: r.side,
      family_group: r.family_group || null, relation: null, is_vip: r.is_vip,
      rsvp_status: 'pending', rsvp_token: null, notes: r.notes || null,
      arrival_mode: null, arrival_time: null,
      flight_no: null, needs_pickup: null, room_id: null, attending_function_ids: null,
    }))
    setGuests(prev => [...prev, ...newGuests])
  }

  if (!isPro) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-8 space-y-6">
        <h1 className="text-xl font-bold text-stone-900">Guests</h1>
        <div className="bg-white border border-stone-200 rounded-2xl p-8 text-center space-y-4">
          <p className="text-4xl">👥</p>
          <p className="text-lg font-semibold text-stone-800">Unlock guest management</p>
          <p className="text-sm text-stone-500">Track RSVP, dietary preferences, send WhatsApp — all organized.</p>

          {/* Free guest count */}
          <div className="bg-stone-50 rounded-xl p-4 space-y-2">
            <p className="text-xs text-stone-500">Estimated guest count</p>
            {editingCount ? (
              <input type="number" min="0" value={countInput} autoFocus
                onChange={e => setCountInput(e.target.value)}
                onBlur={() => {
                  const n = parseInt(countInput) || 0
                  setGuestCount(n); setEditingCount(false)
                  startTransition(async () => { await updateGuestCount(celebrationId, n) })
                }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                className="text-3xl font-bold text-center w-24 border-b-2 border-rose-400 bg-transparent focus:outline-none" />
            ) : (
              <button onClick={() => { setEditingCount(true); setCountInput(String(guestCount)) }}
                className="text-3xl font-bold text-stone-900 hover:text-rose-600">~{guestCount}</button>
            )}
          </div>

          <button
            onClick={() => startTransition(async () => {
              const res = await upgradeToPro(celebrationId)
              if ('error' in res) { toast.error(res.error); return }
              toast.success('Unlocked! 🎉'); router.refresh()
            })}
            disabled={isPending}
            className="w-full bg-rose-700 text-white py-3 rounded-xl font-semibold hover:bg-rose-800 disabled:opacity-50">
            {isPending ? 'Unlocking…' : 'Unlock Full Guest Management — Free'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl md:max-w-4xl mx-auto px-4 pt-5 pb-8 space-y-4">

      {/* Header + stats */}
      <div>
        <h1 className="text-xl font-bold text-stone-900">Guests</h1>
        <p className="text-sm text-stone-400 mt-0.5">{totalPax} pax total · {confirmedPax} confirmed</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Total', value: totalPax, color: 'text-stone-800' },
          { label: 'Confirmed', value: confirmedPax, color: 'text-emerald-600' },
          { label: 'Pending', value: guests.filter(g => g.rsvp_status === 'pending').length, color: 'text-amber-600' },
          { label: 'Declined', value: guests.filter(g => g.rsvp_status === 'declined').length, color: 'text-red-500' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-stone-100 rounded-xl py-3 text-center">
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
            <p className="text-[10px] text-stone-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search + filters + actions */}
      <div className="flex gap-2 flex-wrap">
        <Input value={guestSearch} onChange={e => setGuestSearch(e.target.value)}
          placeholder="Search name or phone…" className="flex-1 min-w-40 text-sm" />
        <button onClick={() => setShowImport(v => !v)} title="Import CSV"
          className="flex items-center gap-1 bg-stone-100 text-stone-700 text-xs font-medium px-3 py-2 rounded-lg hover:bg-stone-200">
          <Upload className="w-3.5 h-3.5" /><span className="hidden sm:inline ml-1">Import</span>
        </button>
        <button onClick={() => setShowAddGuest(v => !v)}
          className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex gap-1">
          {[['all', 'All RSVPs'], ['pending', 'Pending'], ['confirmed', 'Confirmed'], ['declined', 'Declined']].map(([v, l]) => (
            <button key={v} onClick={() => setRsvpFilter(v)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${rsvpFilter === v ? 'bg-rose-700 text-white border-rose-700' : 'bg-white border-stone-200 text-stone-600'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {[['all', 'Both sides'], ['bride', 'Bride'], ['groom', 'Groom']].map(([v, l]) => (
            <button key={v} onClick={() => setSideFilter(v)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${sideFilter === v ? 'bg-stone-800 text-white border-stone-800' : 'bg-white border-stone-200 text-stone-600'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* CSV import panel */}
      {showImport && (
        <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-stone-800">Bulk import guests</p>
            <button onClick={downloadGuestTemplate} className="flex items-center gap-1 text-xs text-rose-600">
              <FileDown className="w-3.5 h-3.5" /> Template
            </button>
          </div>
          <label className="flex flex-col items-center gap-2 border-2 border-dashed border-stone-200 rounded-xl p-4 cursor-pointer hover:border-rose-300 hover:bg-rose-50">
            <Upload className="w-6 h-6 text-stone-300" />
            <span className="text-xs text-stone-500">Click to select CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVFile(f) }} />
          </label>
          {importRows.length > 0 && (
            <>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {importRows.slice(0, 8).map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-stone-50 rounded-lg px-2.5 py-1.5">
                    <span className="font-medium flex-1 truncate">{r.name}</span>
                    <span className="text-stone-400">{r.phone || '—'}</span>
                  </div>
                ))}
                {importRows.length > 8 && <p className="text-xs text-stone-400 text-center">+{importRows.length - 8} more</p>}
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => { setImportRows([]); setShowImport(false) }} className="text-xs text-stone-500 px-3 py-1.5">Cancel</button>
                <button onClick={handleBulkImport} disabled={importLoading}
                  className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50 flex items-center gap-1">
                  {importLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  Import {importRows.length}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Add guest form */}
      {showAddGuest && (
        <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-stone-800">Add guest</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-stone-500 mb-1 block">Name *</label>
              <Input value={guestForm.name} onChange={e => setGuestForm(f => ({ ...f, name: e.target.value }))} placeholder="Ramesh Sharma" autoFocus />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Phone</label>
              <Input value={guestForm.phone} onChange={e => setGuestForm(f => ({ ...f, phone: e.target.value }))} placeholder="98765 43210" type="tel" />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Plus ones</label>
              <Input type="number" min="0" max="10" value={guestForm.plus_count} onChange={e => setGuestForm(f => ({ ...f, plus_count: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Dietary</label>
              <select value={guestForm.dietary} onChange={e => setGuestForm(f => ({ ...f, dietary: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                {DIETARY.map(d => <option key={d} value={d}>{d || 'No preference'}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Side</label>
              <select value={guestForm.side} onChange={e => setGuestForm(f => ({ ...f, side: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                {SIDES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Family group</label>
              <Input value={guestForm.family_group} onChange={e => setGuestForm(f => ({ ...f, family_group: e.target.value }))} placeholder="e.g. Sharma Family" />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Relation</label>
              <Input value={guestForm.relation} onChange={e => setGuestForm(f => ({ ...f, relation: e.target.value }))} placeholder="e.g. Maama ji" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="vip" checked={guestForm.is_vip} onChange={e => setGuestForm(f => ({ ...f, is_vip: e.target.checked }))} className="rounded border-stone-300 text-rose-700" />
              <label htmlFor="vip" className="text-xs text-stone-600 flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /> VIP guest</label>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddGuest(false)} className="text-xs text-stone-500 px-3 py-1.5">Cancel</button>
            <button onClick={handleAddGuest} disabled={!guestForm.name.trim() || isPending}
              className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">Add</button>
          </div>
        </div>
      )}

      {/* Guest list */}
      {filteredGuests.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
          <Users className="w-10 h-10 mx-auto mb-3 text-stone-200" />
          <p className="text-stone-500 text-sm">{guestSearch || rsvpFilter !== 'all' ? 'No guests found' : 'No guests yet'}</p>
          {!guestSearch && rsvpFilter === 'all' && (
            <button onClick={() => setShowAddGuest(true)} className="text-xs text-rose-600 mt-2">+ Add first guest</button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredGuests.map(g => (
            <div key={g.id} onClick={() => { setGuestDrawer(g); setDrawerTab('profile'); setEditForm({ name: g.name, phone: g.phone || '', email: g.email || '', dietary: g.dietary || '', side: g.side, family_group: g.family_group || '', relation: g.relation || '', is_vip: g.is_vip || false, notes: g.notes || '' }) }}
              className="bg-white border border-stone-100 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-stone-300 transition-colors">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm ${g.is_vip ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                {g.name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-stone-800 truncate">{g.name}</p>
                  {g.is_vip && <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
                  {g.plus_count > 0 && <span className="text-xs text-stone-400 flex-shrink-0">+{g.plus_count}</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {g.family_group && <span className="text-[10px] text-stone-400">{g.family_group}</span>}
                  {g.dietary && <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 rounded">{g.dietary}</span>}
                  {g.side !== 'both' && <span className="text-[10px] text-stone-400">{g.side === 'bride' ? '🌸 Bride' : '🤵 Groom'}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${RSVP_COLORS[g.rsvp_status || 'pending'] || 'bg-stone-100 text-stone-500'}`}>
                  {RSVP_LABELS[g.rsvp_status || 'pending'] || 'Pending'}
                </span>
                {g.phone && (
                  <button onClick={e => { e.stopPropagation(); waLink(g.phone, g.name) }}
                    className="text-stone-300 hover:text-green-500 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Guest drawer */}
      {guestDrawer && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end sm:items-center sm:justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setGuestDrawer(null)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-10 h-1 bg-stone-200 rounded-full" /></div>
            <div className="px-5 py-3.5 border-b border-stone-100 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${guestDrawer.is_vip ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                  {guestDrawer.name[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900">{guestDrawer.name}</p>
                  {guestDrawer.phone && <p className="text-xs text-stone-400">{guestDrawer.phone}</p>}
                </div>
              </div>
              <button onClick={() => setGuestDrawer(null)}><X className="w-5 h-5 text-stone-400" /></button>
            </div>

            {/* RSVP quick update */}
            <div className="px-5 py-3 border-b border-stone-100 flex gap-2 flex-shrink-0">
              {(['pending', 'confirmed', 'declined'] as const).map(s => (
                <button key={s} onClick={() => handleUpdateRsvp(guestDrawer.id, s)}
                  className={`flex-1 text-xs py-1.5 rounded-lg font-medium border transition-colors ${guestDrawer.rsvp_status === s ? RSVP_COLORS[s] + ' border-transparent' : 'border-stone-200 text-stone-500'}`}>
                  {s === 'pending' ? 'Pending' : s === 'confirmed' ? 'Attending ✓' : 'Declined'}
                </button>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-stone-100 px-5 flex-shrink-0">
              {[{ key: 'profile', label: 'Profile' }, { key: 'edit', label: 'Edit' }, { key: 'travel', label: 'Travel' }, { key: 'functions', label: 'Functions' }].map(t => (
                <button key={t.key} onClick={() => setDrawerTab(t.key as typeof drawerTab)}
                  className={`text-xs font-medium py-2.5 mr-4 border-b-2 transition-colors whitespace-nowrap ${drawerTab === t.key ? 'border-rose-700 text-rose-700' : 'border-transparent text-stone-400'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            <div className="overflow-y-auto flex-1 px-5 py-4">
              {drawerTab === 'profile' && (
                <div className="space-y-3">
                  {[
                    { label: 'Side', value: guestDrawer.side === 'bride' ? '🌸 Bride side' : guestDrawer.side === 'groom' ? '🤵 Groom side' : 'Both sides' },
                    { label: 'Relation', value: guestDrawer.relation || '—' },
                    { label: 'Dietary', value: guestDrawer.dietary || 'Not specified' },
                    { label: 'Plus ones', value: String(guestDrawer.plus_count) },
                    { label: 'Family group', value: guestDrawer.family_group || '—' },
                    { label: 'Email', value: guestDrawer.email || '—' },
                    { label: 'Notes', value: guestDrawer.notes || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm">
                      <span className="text-stone-400">{label}</span>
                      <span className="font-medium text-stone-800">{value}</span>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-stone-100">
                    {guestDrawer.phone && (
                      <button onClick={() => waLink(guestDrawer.phone, guestDrawer.name)}
                        className="flex items-center gap-1.5 flex-1 justify-center py-2 bg-green-50 text-green-700 text-xs font-medium rounded-xl border border-green-100">
                        <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                      </button>
                    )}
                    <button onClick={() => copyRsvpLink(guestDrawer.rsvp_token)}
                      className="flex items-center gap-1.5 flex-1 justify-center py-2 bg-stone-50 text-stone-700 text-xs font-medium rounded-xl border border-stone-200">
                      <Phone className="w-3.5 h-3.5" /> RSVP Link
                    </button>
                  </div>
                </div>
              )}

              {drawerTab === 'edit' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Name</label>
                    <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Phone</label>
                    <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} type="tel" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Email</label>
                    <Input value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} type="email" />
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Relation</label>
                    <Input value={editForm.relation} onChange={e => setEditForm(f => ({ ...f, relation: e.target.value }))} placeholder="e.g. Maama ji" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-stone-500 mb-1 block">Dietary</label>
                      <select value={editForm.dietary} onChange={e => setEditForm(f => ({ ...f, dietary: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                        {DIETARY.map(d => <option key={d} value={d}>{d || 'No preference'}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 mb-1 block">Side</label>
                      <select value={editForm.side} onChange={e => setEditForm(f => ({ ...f, side: e.target.value }))}
                        className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                        {SIDES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-stone-500 mb-1 block">Notes</label>
                    <textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none resize-none" rows={2} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="vip2" checked={editForm.is_vip} onChange={e => setEditForm(f => ({ ...f, is_vip: e.target.checked }))} className="rounded border-stone-300 text-rose-700" />
                    <label htmlFor="vip2" className="text-xs text-stone-600">VIP guest</label>
                  </div>
                  <button onClick={() => handleSaveEdit(guestDrawer.id, { name: editForm.name.trim(), phone: editForm.phone || null, email: editForm.email || null, dietary: editForm.dietary || null, side: editForm.side, family_group: editForm.family_group || null, relation: editForm.relation || null, is_vip: editForm.is_vip, notes: editForm.notes || null })}
                    disabled={!editForm.name.trim() || isPending}
                    className="w-full bg-rose-700 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-800 disabled:opacity-50">
                    Save changes
                  </button>
                </div>
              )}

              {drawerTab === 'travel' && (
                <div className="space-y-3">
                  {guestDrawer.arrival_mode ? (
                    <>
                      <div className="flex items-center gap-2">
                        {guestDrawer.arrival_mode === 'flight' ? <Plane className="w-4 h-4 text-blue-500" /> : guestDrawer.arrival_mode === 'train' ? <Train className="w-4 h-4 text-green-500" /> : <Car className="w-4 h-4 text-stone-500" />}
                        <p className="text-sm font-medium capitalize">{guestDrawer.arrival_mode}</p>
                      </div>
                      {guestDrawer.flight_no && <p className="text-sm text-stone-600">Flight/Train: {guestDrawer.flight_no}</p>}
                      {guestDrawer.arrival_time && <p className="text-sm text-stone-600">Arrival: {new Date(guestDrawer.arrival_time).toLocaleString('en-IN')}</p>}
                      {guestDrawer.needs_pickup && <p className="text-sm text-amber-600 font-medium">⚠ Needs pickup</p>}
                    </>
                  ) : (
                    <div className="text-center py-6">
                      <MapPin className="w-8 h-8 mx-auto mb-2 text-stone-200" />
                      <p className="text-sm text-stone-400">No travel details yet</p>
                    </div>
                  )}
                </div>
              )}

              {drawerTab === 'functions' && (
                <div className="space-y-2">
                  <p className="text-xs text-stone-400 mb-3">Which functions is this guest attending?</p>
                  {functions.length === 0 ? (
                    <p className="text-sm text-stone-400">No functions added yet</p>
                  ) : functions.map(fn => {
                    const attending = (guestDrawer.attending_function_ids || []).includes(fn.id)
                    return (
                      <label key={fn.id} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border transition-colors ${attending ? 'bg-rose-50 border-rose-200' : 'bg-stone-50 border-stone-100'}`}>
                        <input type="checkbox" checked={attending}
                          onChange={() => {
                            const curr = guestDrawer.attending_function_ids || []
                            const next = attending ? curr.filter(x => x !== fn.id) : [...curr, fn.id]
                            handleFunctionsChange(guestDrawer.id, next)
                          }}
                          className="rounded border-stone-300 text-rose-700" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-stone-800">{fn.name}</p>
                          <p className="text-xs text-stone-400">{fmtDate(fn.date)}{fn.start_time && ` · ${fn.start_time.slice(0, 5)}`}</p>
                        </div>
                        {attending && <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-full font-medium">Attending</span>}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-stone-100 flex-shrink-0">
              <button onClick={() => handleDeleteGuest(guestDrawer.id)} disabled={isPending}
                className="w-full text-xs text-red-400 hover:text-red-600 py-2 hover:bg-red-50 rounded-lg transition-colors">
                Remove from guest list
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
