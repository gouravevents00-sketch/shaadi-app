'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Music, Phone, Mail, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { createArtist, updateArtist, deleteArtist, type ArtistRow } from './actions'

const ACT_TYPES = ['Singer', 'Band', 'DJ', 'Comedian', 'Anchor/MC', 'Dancer', 'Magician', 'Speaker', 'Orchestra', 'Other']

type Form = {
  name: string; act_type: string; contact_name: string; contact_phone: string
  contact_email: string; performance_slot: string; duration_mins: string
  fee: string; fee_paid: string; tech_rider: string; hospitality_rider: string
  arrival_time: string; soundcheck_time: string; notes: string
}

const EMPTY: Form = {
  name: '', act_type: 'Singer', contact_name: '', contact_phone: '',
  contact_email: '', performance_slot: '', duration_mins: '',
  fee: '', fee_paid: '', tech_rider: '', hospitality_rider: '',
  arrival_time: '', soundcheck_time: '', notes: ''
}

export default function ArtistsClient({ eventId, initialArtists }: {
  eventId: string
  initialArtists: ArtistRow[]
}) {
  const [artists, setArtists] = useState(initialArtists)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ArtistRow | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [isPending, startTransition] = useTransition()

  function openAdd() { setEditing(null); setForm(EMPTY); setDialogOpen(true) }
  function openEdit(a: ArtistRow) {
    setEditing(a)
    setForm({
      name: a.name, act_type: a.act_type ?? 'Singer',
      contact_name: a.contact_name ?? '', contact_phone: a.contact_phone ?? '',
      contact_email: a.contact_email ?? '', performance_slot: a.performance_slot ?? '',
      duration_mins: a.duration_mins?.toString() ?? '', fee: a.fee?.toString() ?? '',
      fee_paid: a.fee_paid?.toString() ?? '', tech_rider: a.tech_rider ?? '',
      hospitality_rider: a.hospitality_rider ?? '', arrival_time: a.arrival_time ?? '',
      soundcheck_time: a.soundcheck_time ?? '', notes: a.notes ?? ''
    })
    setDialogOpen(true)
  }

  function handleSave() {
    if (!form.name.trim()) { toast.error('Name required'); return }
    startTransition(async () => {
      const payload = {
        name: form.name, act_type: form.act_type || undefined,
        contact_name: form.contact_name || undefined, contact_phone: form.contact_phone || undefined,
        contact_email: form.contact_email || undefined, performance_slot: form.performance_slot || undefined,
        duration_mins: form.duration_mins ? Number(form.duration_mins) : undefined,
        fee: form.fee ? Number(form.fee) : undefined,
        fee_paid: form.fee_paid ? Number(form.fee_paid) : undefined,
        tech_rider: form.tech_rider || undefined, hospitality_rider: form.hospitality_rider || undefined,
        arrival_time: form.arrival_time || undefined, soundcheck_time: form.soundcheck_time || undefined,
        notes: form.notes || undefined,
      }
      if (editing) {
        const res = await updateArtist(eventId, editing.id, payload)
        if ('error' in res) { toast.error(res.error); return }
        setArtists(prev => prev.map(a => a.id === editing.id ? { ...a, ...payload } : a) as ArtistRow[])
        toast.success('Artist updated')
      } else {
        const res = await createArtist(eventId, payload)
        if ('error' in res) { toast.error(res.error); return }
        const newA = {
          id: res.id, org_event_id: eventId, created_at: new Date().toISOString(),
          act_type: payload.act_type ?? null, contact_name: payload.contact_name ?? null,
          contact_phone: payload.contact_phone ?? null, contact_email: payload.contact_email ?? null,
          performance_slot: payload.performance_slot ?? null, duration_mins: payload.duration_mins ?? null,
          fee: payload.fee ?? null, fee_paid: payload.fee_paid ?? null,
          tech_rider: payload.tech_rider ?? null, hospitality_rider: payload.hospitality_rider ?? null,
          arrival_time: payload.arrival_time ?? null, soundcheck_time: payload.soundcheck_time ?? null,
          notes: payload.notes ?? null, name: payload.name,
        } as ArtistRow
        setArtists(prev => [...prev, newA])
        toast.success('Artist added')
      }
      setDialogOpen(false)
    })
  }

  function handleDelete(a: ArtistRow) {
    startTransition(async () => {
      const res = await deleteArtist(eventId, a.id)
      if ('error' in res) { toast.error(res.error); return }
      setArtists(prev => prev.filter(x => x.id !== a.id))
      toast.success('Artist removed')
    })
  }

  const f = (v: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(prev => ({ ...prev, [v]: e.target.value }))

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Artists & Performers</h1>
          <p className="text-sm text-stone-500 mt-0.5">{artists.length} artist{artists.length !== 1 ? 's' : ''} · ₹{artists.reduce((s, a) => s + (a.fee ?? 0), 0).toLocaleString('en-IN')} total fees</p>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Artist
        </Button>
      </div>

      {artists.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <Music className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No artists added yet</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {artists.map(a => {
            const remaining = (a.fee ?? 0) - (a.fee_paid ?? 0)
            return (
              <div key={a.id} className="bg-white rounded-xl border border-stone-200 p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <button onClick={() => openEdit(a)} className="font-semibold text-stone-900 hover:text-blue-600 transition-colors text-left">
                      {a.name}
                    </button>
                    {a.act_type && <Badge variant="outline" className="ml-2 text-xs">{a.act_type}</Badge>}
                    {a.performance_slot && <p className="text-sm text-stone-500 mt-0.5">{a.performance_slot}</p>}
                  </div>
                  <button onClick={() => handleDelete(a)} className="text-stone-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex gap-4 text-sm text-stone-500 flex-wrap">
                  {a.contact_name && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{a.contact_name} {a.contact_phone && `· ${a.contact_phone}`}</span>}
                  {a.contact_email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{a.contact_email}</span>}
                  {a.duration_mins && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.duration_mins} min</span>}
                </div>
                {a.fee != null && (
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-stone-600">Fee: <strong>₹{a.fee.toLocaleString('en-IN')}</strong></span>
                    <span className="text-green-600">Paid: ₹{(a.fee_paid ?? 0).toLocaleString('en-IN')}</span>
                    {remaining > 0 && <span className="text-red-500">Due: ₹{remaining.toLocaleString('en-IN')}</span>}
                  </div>
                )}
                {(a.tech_rider || a.hospitality_rider) && (
                  <div className="text-xs text-stone-400 space-y-0.5">
                    {a.tech_rider && <p><span className="font-medium text-stone-500">Tech:</span> {a.tech_rider}</p>}
                    {a.hospitality_rider && <p><span className="font-medium text-stone-500">Hospitality:</span> {a.hospitality_rider}</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? 'Edit Artist' : 'Add Artist'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name *</Label>
                <Input value={form.name} onChange={f('name')} className="mt-1" />
              </div>
              <div>
                <Label>Act Type</Label>
                <select value={form.act_type} onChange={f('act_type')} className="mt-1 w-full border border-stone-200 rounded-md px-2 py-1.5 text-sm">
                  {ACT_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Contact Person</Label>
                <Input value={form.contact_name} onChange={f('contact_name')} className="mt-1" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.contact_phone} onChange={f('contact_phone')} className="mt-1" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={form.contact_email} onChange={f('contact_email')} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Performance Slot</Label>
                <Input value={form.performance_slot} onChange={f('performance_slot')} placeholder="e.g. 8:00 PM" className="mt-1" />
              </div>
              <div>
                <Label>Duration (mins)</Label>
                <Input type="number" value={form.duration_mins} onChange={f('duration_mins')} className="mt-1" />
              </div>
              <div>
                <Label>Soundcheck Time</Label>
                <Input value={form.soundcheck_time} onChange={f('soundcheck_time')} placeholder="e.g. 5:00 PM" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Total Fee (₹)</Label>
                <Input type="number" value={form.fee} onChange={f('fee')} className="mt-1" />
              </div>
              <div>
                <Label>Amount Paid (₹)</Label>
                <Input type="number" value={form.fee_paid} onChange={f('fee_paid')} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Tech Rider</Label>
              <textarea value={form.tech_rider} onChange={f('tech_rider')} rows={2} className="mt-1 w-full border border-stone-200 rounded-md px-3 py-2 text-sm resize-none" />
            </div>
            <div>
              <Label>Hospitality Rider</Label>
              <textarea value={form.hospitality_rider} onChange={f('hospitality_rider')} rows={2} className="mt-1 w-full border border-stone-200 rounded-md px-3 py-2 text-sm resize-none" />
            </div>
            <div>
              <Label>Notes</Label>
              <textarea value={form.notes} onChange={f('notes')} rows={2} className="mt-1 w-full border border-stone-200 rounded-md px-3 py-2 text-sm resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {editing ? 'Save' : 'Add Artist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
