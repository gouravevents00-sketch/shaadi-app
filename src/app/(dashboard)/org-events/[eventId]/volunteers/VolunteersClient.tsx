'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Users, UserCheck, UserX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createVolunteer, updateVolunteer, deleteVolunteer, checkInVolunteer, type VolunteerRow } from './actions'

const ROLES = ['Registration Desk', 'Guest Escort', 'Stage Crew', 'AV Tech', 'Hospitality', 'Security Liaison', 'Transport Coordinator', 'Floater', 'Other']
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']

type Form = {
  name: string; phone: string; email: string; role: string; zone: string
  shift_start: string; shift_end: string; t_shirt_size: string; notes: string
}
const EMPTY: Form = { name: '', phone: '', email: '', role: 'Registration Desk', zone: '', shift_start: '', shift_end: '', t_shirt_size: 'M', notes: '' }

export default function VolunteersClient({ eventId, initialVolunteers }: {
  eventId: string
  initialVolunteers: VolunteerRow[]
}) {
  const [volunteers, setVolunteers] = useState(initialVolunteers)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<VolunteerRow | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [isPending, startTransition] = useTransition()

  const checkedIn = volunteers.filter(v => v.checked_in).length

  function openAdd() { setEditing(null); setForm(EMPTY); setDialogOpen(true) }
  function openEdit(v: VolunteerRow) {
    setEditing(v)
    setForm({
      name: v.name, phone: v.phone ?? '', email: v.email ?? '',
      role: v.role ?? 'Registration Desk', zone: v.zone ?? '',
      shift_start: v.shift_start ?? '', shift_end: v.shift_end ?? '',
      t_shirt_size: v.t_shirt_size ?? 'M', notes: v.notes ?? ''
    })
    setDialogOpen(true)
  }

  function handleSave() {
    if (!form.name.trim()) { toast.error('Name required'); return }
    startTransition(async () => {
      const payload = {
        name: form.name, phone: form.phone || undefined, email: form.email || undefined,
        role: form.role || undefined, zone: form.zone || undefined,
        shift_start: form.shift_start || undefined, shift_end: form.shift_end || undefined,
        t_shirt_size: form.t_shirt_size || undefined, notes: form.notes || undefined,
      }
      if (editing) {
        const res = await updateVolunteer(eventId, editing.id, payload)
        if ('error' in res) { toast.error(res.error); return }
        setVolunteers(prev => prev.map(v => v.id === editing.id ? { ...v, name: payload.name, phone: payload.phone ?? null, email: payload.email ?? null, role: payload.role ?? null, zone: payload.zone ?? null, shift_start: payload.shift_start ?? null, shift_end: payload.shift_end ?? null, t_shirt_size: payload.t_shirt_size ?? null, notes: payload.notes ?? null } : v))
        toast.success('Updated')
      } else {
        const res = await createVolunteer(eventId, payload)
        if ('error' in res) { toast.error(res.error); return }
        const newV: VolunteerRow = {
          id: res.id, org_event_id: eventId, checked_in: false, created_at: new Date().toISOString(),
          name: payload.name, phone: payload.phone ?? null, email: payload.email ?? null,
          role: payload.role ?? null, zone: payload.zone ?? null,
          shift_start: payload.shift_start ?? null, shift_end: payload.shift_end ?? null,
          t_shirt_size: payload.t_shirt_size ?? null, notes: payload.notes ?? null,
        }
        setVolunteers(prev => [...prev, newV])
        toast.success('Volunteer added')
      }
      setDialogOpen(false)
    })
  }

  function handleDelete(v: VolunteerRow) {
    startTransition(async () => {
      const res = await deleteVolunteer(eventId, v.id)
      if ('error' in res) { toast.error(res.error); return }
      setVolunteers(prev => prev.filter(x => x.id !== v.id))
    })
  }

  function handleCheckIn(v: VolunteerRow) {
    startTransition(async () => {
      const res = await checkInVolunteer(eventId, v.id, !v.checked_in)
      if ('error' in res) { toast.error(res.error); return }
      setVolunteers(prev => prev.map(x => x.id === v.id ? { ...x, checked_in: !v.checked_in } : x))
    })
  }

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Volunteers</h1>
          <p className="text-sm text-stone-500 mt-0.5">{volunteers.length} total · {checkedIn} checked in</p>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Volunteer
        </Button>
      </div>

      {volunteers.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <Users className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No volunteers added yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50">
                <th className="text-left px-4 py-3 font-medium text-stone-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500">Role</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500 hidden md:table-cell">Zone</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500 hidden lg:table-cell">Shift</th>
                <th className="text-left px-4 py-3 font-medium text-stone-500 hidden lg:table-cell">T-Shirt</th>
                <th className="text-right px-4 py-3 font-medium text-stone-500">Check-in</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {volunteers.map(v => (
                <tr key={v.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(v)} className="font-medium text-stone-900 hover:text-blue-600 transition-colors text-left">
                      {v.name}
                    </button>
                    {v.phone && <p className="text-xs text-stone-400">{v.phone}</p>}
                  </td>
                  <td className="px-4 py-3">
                    {v.role && <Badge variant="outline" className="text-xs">{v.role}</Badge>}
                  </td>
                  <td className="px-4 py-3 text-stone-600 hidden md:table-cell">{v.zone ?? '—'}</td>
                  <td className="px-4 py-3 text-stone-500 text-xs hidden lg:table-cell">
                    {v.shift_start && v.shift_end ? `${v.shift_start} – ${v.shift_end}` : v.shift_start ?? '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {v.t_shirt_size && <Badge className="bg-stone-100 text-stone-600 text-xs">{v.t_shirt_size}</Badge>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleCheckIn(v)}
                      className={cn(
                        'inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors',
                        v.checked_in ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                      )}
                    >
                      {v.checked_in ? <><UserCheck className="w-3.5 h-3.5" /> In</> : <><UserX className="w-3.5 h-3.5" /> —</>}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(v)} className="text-stone-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Volunteer' : 'Add Volunteer'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={f('name')} className="mt-1" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={f('phone')} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={f('email')} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Role</Label>
                <select value={form.role} onChange={f('role')} className="mt-1 w-full border border-stone-200 rounded-md px-2 py-1.5 text-sm">
                  {ROLES.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <Label>Zone / Station</Label>
                <Input value={form.zone} onChange={f('zone')} placeholder="e.g. Gate 1, Hall A" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Shift Start</Label>
                <Input value={form.shift_start} onChange={f('shift_start')} placeholder="08:00 AM" className="mt-1" />
              </div>
              <div>
                <Label>Shift End</Label>
                <Input value={form.shift_end} onChange={f('shift_end')} placeholder="02:00 PM" className="mt-1" />
              </div>
              <div>
                <Label>T-Shirt Size</Label>
                <select value={form.t_shirt_size} onChange={f('t_shirt_size')} className="mt-1 w-full border border-stone-200 rounded-md px-2 py-1.5 text-sm">
                  {SIZES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <textarea value={form.notes} onChange={f('notes')} rows={2} className="mt-1 w-full border border-stone-200 rounded-md px-3 py-2 text-sm resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {editing ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
