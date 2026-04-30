'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Trash2, UserCheck, UserX, Star, Car, Shield, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  createGuest, updateGuest, deleteGuest, checkInGuest, bulkImportGuests,
  type GuestRow
} from './actions'

const CATEGORIES = ['Delegate', 'VIP', 'VVIP', 'Speaker', 'Sponsor', 'Media', 'Staff', 'Guest']
const DIETARY = ['Veg', 'Non-Veg', 'Vegan', 'Jain', 'Gluten-Free', 'Other']
const SALUTATIONS = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.', 'Hon.', 'Adv.']

type Form = {
  salutation: string; name: string; designation: string; organisation: string
  email: string; phone: string; category: string; is_vvip: boolean
  requires_escort: boolean; requires_vehicle: boolean; dietary: string; notes: string
}

const EMPTY: Form = {
  salutation: '', name: '', designation: '', organisation: '',
  email: '', phone: '', category: 'Delegate', is_vvip: false,
  requires_escort: false, requires_vehicle: false, dietary: '', notes: ''
}

export default function GuestsClient({ eventId, initialGuests }: {
  eventId: string
  initialGuests: GuestRow[]
}) {
  const [guests, setGuests] = useState(initialGuests)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'vvip' | 'checked_in' | 'not_checked_in'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<GuestRow | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [csvDialog, setCsvDialog] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [isPending, startTransition] = useTransition()

  const filtered = guests.filter(g => {
    const q = search.toLowerCase()
    const matchSearch = !q || g.name.toLowerCase().includes(q) ||
      (g.organisation ?? '').toLowerCase().includes(q) ||
      (g.designation ?? '').toLowerCase().includes(q) ||
      (g.email ?? '').toLowerCase().includes(q)
    const matchFilter =
      filter === 'all' ? true :
      filter === 'vvip' ? g.is_vvip :
      filter === 'checked_in' ? g.checked_in :
      !g.checked_in
    return matchSearch && matchFilter
  })

  const stats = {
    total: guests.length,
    vvip: guests.filter(g => g.is_vvip).length,
    checkedIn: guests.filter(g => g.checked_in).length,
    escort: guests.filter(g => g.requires_escort).length,
    vehicle: guests.filter(g => g.requires_vehicle).length,
  }

  function openAdd() { setEditing(null); setForm(EMPTY); setDialogOpen(true) }
  function openEdit(g: GuestRow) {
    setEditing(g)
    setForm({
      salutation: g.salutation ?? '', name: g.name, designation: g.designation ?? '',
      organisation: g.organisation ?? '', email: g.email ?? '', phone: g.phone ?? '',
      category: g.category ?? 'Delegate', is_vvip: g.is_vvip,
      requires_escort: g.requires_escort, requires_vehicle: g.requires_vehicle,
      dietary: g.dietary ?? '', notes: g.notes ?? ''
    })
    setDialogOpen(true)
  }

  function handleSave() {
    if (!form.name.trim()) { toast.error('Name required'); return }
    startTransition(async () => {
      if (editing) {
        const res = await updateGuest(eventId, editing.id, {
          salutation: form.salutation || undefined,
          name: form.name, designation: form.designation || undefined,
          organisation: form.organisation || undefined, email: form.email || undefined,
          phone: form.phone || undefined, category: form.category || undefined,
          is_vvip: form.is_vvip, requires_escort: form.requires_escort,
          requires_vehicle: form.requires_vehicle, dietary: form.dietary || undefined,
          notes: form.notes || undefined,
        })
        if ('error' in res) { toast.error(res.error); return }
        setGuests(prev => prev.map(g => g.id === editing.id ? { ...g, ...form } : g))
        toast.success('Guest updated')
      } else {
        const res = await createGuest(eventId, {
          salutation: form.salutation || undefined, name: form.name,
          designation: form.designation || undefined, organisation: form.organisation || undefined,
          email: form.email || undefined, phone: form.phone || undefined,
          category: form.category || undefined, is_vvip: form.is_vvip,
          requires_escort: form.requires_escort, requires_vehicle: form.requires_vehicle,
          dietary: form.dietary || undefined, notes: form.notes || undefined,
        })
        if ('error' in res) { toast.error(res.error); return }
        const newG: GuestRow = {
          id: res.id, org_event_id: eventId, checked_in: false, checked_in_at: null,
          created_at: new Date().toISOString(), ...form,
          salutation: form.salutation || null, designation: form.designation || null,
          organisation: form.organisation || null, email: form.email || null,
          phone: form.phone || null, category: form.category || null,
          dietary: form.dietary || null, notes: form.notes || null,
        }
        setGuests(prev => [...prev, newG].sort((a, b) => a.name.localeCompare(b.name)))
        toast.success('Guest added')
      }
      setDialogOpen(false)
    })
  }

  function handleDelete(g: GuestRow) {
    startTransition(async () => {
      const res = await deleteGuest(eventId, g.id)
      if ('error' in res) { toast.error(res.error); return }
      setGuests(prev => prev.filter(x => x.id !== g.id))
      toast.success('Guest removed')
    })
  }

  function handleCheckIn(g: GuestRow) {
    startTransition(async () => {
      const res = await checkInGuest(eventId, g.id, !g.checked_in)
      if ('error' in res) { toast.error(res.error); return }
      setGuests(prev => prev.map(x => x.id === g.id
        ? { ...x, checked_in: !g.checked_in, checked_in_at: !g.checked_in ? new Date().toISOString() : null }
        : x))
    })
  }

  function handleCsvImport() {
    const lines = csvText.trim().split('\n').filter(Boolean)
    if (!lines.length) return
    // Skip header if first line has "name"
    const start = lines[0].toLowerCase().includes('name') ? 1 : 0
    const rows = lines.slice(start).map(line => {
      const [name, designation, organisation, email, phone, category, dietary] = line.split(',').map(s => s.trim())
      return { name, designation, organisation, email, phone, category: category || 'Delegate', dietary }
    }).filter(r => r.name)

    startTransition(async () => {
      const res = await bulkImportGuests(eventId, rows)
      if ('error' in res) { toast.error(res.error); return }
      toast.success(`Imported ${res.created} guests`)
      setCsvDialog(false)
      setCsvText('')
      // Reload from server would require page refresh; show count
    })
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Guests & VIPs</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {stats.checkedIn}/{stats.total} checked in · {stats.vvip} VVIP · {stats.escort} need escort · {stats.vehicle} need vehicle
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCsvDialog(true)}>
            <Upload className="w-4 h-4 mr-1.5" /> Import CSV
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Guest
          </Button>
        </div>
      </div>

      {/* Stats chips */}
      <div className="flex gap-3 flex-wrap">
        {[
          { key: 'all', label: `All (${stats.total})` },
          { key: 'vvip', label: `VVIP (${stats.vvip})` },
          { key: 'checked_in', label: `Checked In (${stats.checkedIn})` },
          { key: 'not_checked_in', label: `Pending (${stats.total - stats.checkedIn})` },
        ].map(f => (
          <button key={f.key}
            onClick={() => setFilter(f.key as typeof filter)}
            className={cn(
              'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
              filter === f.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-stone-600 border-stone-200 hover:border-blue-300'
            )}
          >{f.label}</button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <Input
          placeholder="Search by name, org, email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Guest list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p className="font-medium">No guests found</p>
          <p className="text-sm mt-1">Add guests manually or import via CSV</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 font-medium text-stone-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500 hidden md:table-cell">Organisation</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500 hidden lg:table-cell">Category</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500 hidden lg:table-cell">Flags</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500 hidden xl:table-cell">Contact</th>
                <th className="text-right px-4 py-3 font-medium text-stone-500">Check-in</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(g => (
                <tr key={g.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(g)} className="text-left hover:text-blue-600 transition-colors">
                      <p className="font-medium text-stone-900">{g.salutation ? `${g.salutation} ` : ''}{g.name}</p>
                      {g.designation && <p className="text-xs text-stone-400">{g.designation}</p>}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-stone-600 hidden md:table-cell">{g.organisation ?? '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {g.category && (
                      <Badge variant="outline" className="text-xs">{g.category}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <div className="flex gap-1">
                      {g.is_vvip && <Star className="w-3.5 h-3.5 text-amber-500" />}
                      {g.requires_escort && <Shield className="w-3.5 h-3.5 text-purple-500" />}
                      {g.requires_vehicle && <Car className="w-3.5 h-3.5 text-blue-500" />}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-stone-500 text-xs">
                    {g.phone && <p>{g.phone}</p>}
                    {g.email && <p>{g.email}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleCheckIn(g)}
                      className={cn(
                        'inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors',
                        g.checked_in
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                      )}
                    >
                      {g.checked_in
                        ? <><UserCheck className="w-3.5 h-3.5" /> In</>
                        : <><UserX className="w-3.5 h-3.5" /> —</>
                      }
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(g)} className="text-stone-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Guest' : 'Add Guest'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Salutation</Label>
                <select
                  value={form.salutation}
                  onChange={e => setForm(f => ({ ...f, salutation: e.target.value }))}
                  className="mt-1 w-full border border-stone-200 rounded-md px-2 py-1.5 text-sm"
                >
                  <option value="">—</option>
                  {SALUTATIONS.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <Label>Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Full name"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Designation</Label>
              <Input value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>Organisation</Label>
              <Input value={form.organisation} onChange={e => setForm(f => ({ ...f, organisation: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="mt-1 w-full border border-stone-200 rounded-md px-2 py-1.5 text-sm"
                >
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>Dietary</Label>
                <select
                  value={form.dietary}
                  onChange={e => setForm(f => ({ ...f, dietary: e.target.value }))}
                  className="mt-1 w-full border border-stone-200 rounded-md px-2 py-1.5 text-sm"
                >
                  <option value="">Not specified</option>
                  {DIETARY.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-6">
              {[
                { key: 'is_vvip', label: 'VVIP' },
                { key: 'requires_escort', label: 'Needs Escort' },
                { key: 'requires_vehicle', label: 'Needs Vehicle' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key as keyof Form] as boolean}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                    className="rounded"
                  />
                  {label}
                </label>
              ))}
            </div>
            <div>
              <Label>Notes</Label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="mt-1 w-full border border-stone-200 rounded-md px-3 py-2 text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {editing ? 'Save Changes' : 'Add Guest'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import dialog */}
      <Dialog open={csvDialog} onOpenChange={setCsvDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Guests via CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-stone-500">
              Paste CSV with columns: <code className="bg-stone-100 px-1 rounded text-xs">name, designation, organisation, email, phone, category, dietary</code>
            </p>
            <textarea
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              rows={8}
              placeholder="Name,Designation,Organisation,Email,Phone,Category,Dietary&#10;John Smith,CEO,Acme Corp,john@acme.com,9876543210,VIP,Veg"
              className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm font-mono resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvDialog(false)}>Cancel</Button>
            <Button onClick={handleCsvImport} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
