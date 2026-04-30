'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Search, Users, CheckCircle2, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import DelegateImport from './DelegateImport'
import { createDelegate, updateDelegate, deleteDelegate, toggleCheckedIn } from './actions'

type DelegateStatus = 'registered' | 'confirmed' | 'checked_in' | 'cancelled'

interface Delegate {
  id: string
  name: string
  title: string | null
  organization: string | null
  phone: string | null
  email: string | null
  dietary: string
  dietary_notes: string | null
  is_vip: boolean
  badge_printed: boolean
  checked_in: boolean
  checked_in_at: string | null
  status: DelegateStatus
  notes: string | null
}

const STATUS_COLORS: Record<DelegateStatus, string> = {
  registered: 'bg-stone-100 text-stone-600',
  confirmed: 'bg-blue-100 text-blue-700',
  checked_in: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-600',
}

const EMPTY_FORM = {
  name: '', title: '', organization: '', phone: '', email: '',
  dietary: 'veg', dietary_notes: '', is_vip: false, notes: '',
}

export default function DelegatesClient({
  eventId,
  initialDelegates,
}: {
  eventId: string
  initialDelegates: Delegate[]
}) {
  const [delegates, setDelegates] = useState<Delegate[]>(initialDelegates)
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Delegate | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  function setF(k: string, v: string | boolean) { setForm(f => ({ ...f, [k]: v })) }

  function openCreate() { setEditTarget(null); setForm(EMPTY_FORM); setOpen(true) }
  function openEdit(d: Delegate) {
    setEditTarget(d)
    setForm({
      name: d.name, title: d.title ?? '', organization: d.organization ?? '',
      phone: d.phone ?? '', email: d.email ?? '', dietary: d.dietary,
      dietary_notes: d.dietary_notes ?? '', is_vip: d.is_vip, notes: d.notes ?? '',
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setLoading(true)
    const payload = {
      name: form.name.trim(),
      title: form.title.trim() || null,
      organization: form.organization.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      dietary: form.dietary,
      dietary_notes: form.dietary_notes.trim() || null,
      is_vip: form.is_vip,
      notes: form.notes.trim() || null,
    }
    if (editTarget) {
      const res = await updateDelegate(eventId, editTarget.id, payload)
      if (res.error) { toast.error(res.error); setLoading(false); return }
      setDelegates(ds => ds.map(d => d.id === editTarget.id ? { ...d, ...payload } : d))
      toast.success('Delegate updated')
    } else {
      const res = await createDelegate(eventId, payload)
      if (res.error) { toast.error(res.error); setLoading(false); return }
      setDelegates(ds => [...ds, {
        ...payload, id: res.id!, status: 'registered', badge_printed: false,
        checked_in: false, checked_in_at: null,
      }])
      toast.success('Delegate added')
    }
    setLoading(false)
    setOpen(false)
  }

  async function handleDelete(id: string) {
    const res = await deleteDelegate(eventId, id)
    if (res.error) { toast.error(res.error); return }
    setDelegates(ds => ds.filter(d => d.id !== id))
    toast.success('Deleted')
  }

  async function handleCheckIn(d: Delegate) {
    const newVal = !d.checked_in
    const res = await toggleCheckedIn(eventId, d.id, newVal)
    if (res.error) { toast.error(res.error); return }
    setDelegates(ds => ds.map(x => x.id === d.id ? {
      ...x, checked_in: newVal, checked_in_at: newVal ? new Date().toISOString() : null,
      status: newVal ? 'checked_in' : 'confirmed',
    } : x))
    toast.success(newVal ? 'Checked in' : 'Check-in reversed')
  }

  const filtered = delegates.filter(d => {
    const q = search.toLowerCase()
    const matchSearch = !q || d.name.toLowerCase().includes(q) ||
      (d.organization?.toLowerCase().includes(q) ?? false) ||
      (d.email?.toLowerCase().includes(q) ?? false)
    const matchStatus = filterStatus === 'all' || d.status === filterStatus
    return matchSearch && matchStatus
  })

  const checkedIn = delegates.filter(d => d.checked_in).length

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Delegates</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {delegates.length} total · {checkedIn} checked in
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DelegateImport eventId={eventId} />
          <Button onClick={openCreate} className="bg-stone-900 hover:bg-stone-800">
            <Plus className="w-4 h-4 mr-1.5" /> Add delegate
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <Input
            placeholder="Search name, org, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-stone-200 rounded-md px-3 py-2 text-sm text-stone-700 bg-white"
        >
          <option value="all">All statuses</option>
          <option value="registered">Registered</option>
          <option value="confirmed">Confirmed</option>
          <option value="checked_in">Checked In</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-stone-200 rounded-xl">
          <Users className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 font-medium">
            {delegates.length === 0 ? 'No delegates yet' : 'No matches found'}
          </p>
          {delegates.length === 0 && (
            <p className="text-stone-400 text-sm mt-1">Add delegates manually or import from Excel.</p>
          )}
        </div>
      ) : (
        <div className="border border-stone-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 border-b border-stone-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-stone-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500">Organization</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500">Dietary</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500">Check-in</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {d.is_vip && <Star className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                      <div>
                        <p className="font-medium text-stone-900">{d.name}</p>
                        {d.title && <p className="text-xs text-stone-400">{d.title}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{d.organization || '—'}</td>
                  <td className="px-4 py-3">
                    <p className="text-stone-600">{d.phone || '—'}</p>
                    {d.email && <p className="text-xs text-stone-400">{d.email}</p>}
                  </td>
                  <td className="px-4 py-3 capitalize text-stone-600">{d.dietary}</td>
                  <td className="px-4 py-3">
                    <Badge className={`${STATUS_COLORS[d.status]} border-0 capitalize text-xs`}>
                      {d.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleCheckIn(d)}
                      title={d.checked_in ? 'Undo check-in' : 'Check in'}
                      className={`p-1 rounded-full transition-colors ${
                        d.checked_in ? 'text-emerald-600 hover:text-stone-400' : 'text-stone-300 hover:text-emerald-500'
                      }`}
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => openEdit(d)} className="text-xs text-stone-400 hover:text-stone-700">Edit</button>
                      <button onClick={() => handleDelete(d.id)} className="text-stone-300 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit delegate' : 'Add delegate'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input placeholder="Full name" value={form.name} onChange={e => setF('name', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Title / Designation</Label>
                <Input placeholder="e.g. CEO" value={form.title} onChange={e => setF('title', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Organization</Label>
                <Input placeholder="e.g. Acme Corp" value={form.organization} onChange={e => setF('organization', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input placeholder="+91 98765 43210" value={form.phone} onChange={e => setF('phone', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="name@org.com" value={form.email} onChange={e => setF('email', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dietary preference</Label>
                <select
                  value={form.dietary}
                  onChange={e => setF('dietary', e.target.value)}
                  className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm bg-white"
                >
                  <option value="veg">Veg</option>
                  <option value="non_veg">Non-veg</option>
                  <option value="jain">Jain</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Dietary notes</Label>
                <Input placeholder="e.g. No onion garlic" value={form.dietary_notes} onChange={e => setF('dietary_notes', e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="vip"
                checked={form.is_vip as boolean}
                onChange={e => setF('is_vip', e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />
              <label htmlFor="vip" className="text-sm text-stone-700">Mark as VIP</label>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input placeholder="Any special notes" value={form.notes} onChange={e => setF('notes', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-stone-900 hover:bg-stone-800" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving…' : editTarget ? 'Update' : 'Add delegate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
