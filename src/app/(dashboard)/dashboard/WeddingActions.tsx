'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateWedding, deleteWedding } from './actions'

interface Wedding {
  id: string; bride_name: string; groom_name: string; wedding_date: string | null
  date_from: string | null; date_to: string | null
  primary_venue: string | null; primary_city: string | null
  budget_total: number; status: string
}

const STATUSES = ['setup', 'active', 'completed', 'archived']

export default function WeddingActions({ wedding }: { wedding: Wedding }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    bride_name: wedding.bride_name,
    groom_name: wedding.groom_name,
    date_from: wedding.date_from ?? '',
    date_to: wedding.date_to ?? '',
    wedding_date: wedding.wedding_date ?? '',
    primary_venue: wedding.primary_venue ?? '',
    primary_city: wedding.primary_city ?? '',
    budget_total: String(wedding.budget_total || ''),
    status: wedding.status,
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const result = await updateWedding(wedding.id, {
      bride_name: form.bride_name,
      groom_name: form.groom_name,
      date_from: form.date_from || null,
      date_to: form.date_to || null,
      wedding_date: form.wedding_date || form.date_to || form.date_from || null,
      primary_venue: form.primary_venue || null,
      primary_city: form.primary_city || null,
      budget_total: parseFloat(form.budget_total) || 0,
      status: form.status,
    })
    setLoading(false)
    if (result.error) toast.error(result.error)
    else { toast.success('Wedding updated'); setEditOpen(false); router.refresh() }
  }

  async function handleDelete() {
    setLoading(true)
    const result = await deleteWedding(wedding.id)
    setLoading(false)
    if (result.error) toast.error(result.error)
    else { toast.success('Wedding deleted'); router.refresh() }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors">
          <MoreVertical className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <Pencil className="w-3.5 h-3.5 mr-2" /> Edit details
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-red-600" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete wedding
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit wedding</DialogTitle></DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Bride's name *</Label>
                <Input value={form.bride_name} onChange={e => set('bride_name', e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Groom's name *</Label>
                <Input value={form.groom_name} onChange={e => set('groom_name', e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Celebrations start</Label>
                <Input type="date" value={form.date_from} onChange={e => set('date_from', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Celebrations end</Label>
                <Input type="date" value={form.date_to} onChange={e => set('date_to', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Main ceremony</Label>
                <Input type="date" value={form.wedding_date} onChange={e => set('wedding_date', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Main venue</Label>
                <Input placeholder="Venue name" value={form.primary_venue} onChange={e => set('primary_venue', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input placeholder="City" value={form.primary_city} onChange={e => set('primary_city', e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Budget (₹)</Label>
                <Input type="number" value={form.budget_total} onChange={e => set('budget_total', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status ?? ''} onValueChange={v => set('status', v ?? '')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-rose-700 hover:bg-rose-800" disabled={loading}>
                {loading ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete wedding?</DialogTitle></DialogHeader>
          <p className="text-sm text-stone-500">
            This will permanently delete <span className="font-medium text-stone-800">{wedding.bride_name} &amp; {wedding.groom_name}</span> and all associated guests, events, rooms, and checklist items.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting…' : 'Yes, delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
