'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Star, CheckCircle2, Eye, EyeOff, ExternalLink, Store } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { createMarketplaceVendor, updateMarketplaceVendor, toggleVendorActive, deleteMarketplaceVendor, type VendorForm } from './actions'

const CATEGORIES = [
  'Photographer', 'Videographer', 'Caterer', 'Decorator', 'Florist',
  'Makeup Artist', 'DJ / Band', 'Venue', 'Pandit', 'Mehendi Artist',
  'Wedding Planner', 'Invitation Designer', 'Transport', 'Accommodation', 'Other',
]

const PRICE_UNITS = ['per event', 'per day', 'per plate', 'per hour', 'per person', 'onwards']

type Vendor = {
  id: string
  name: string
  category: string
  city: string
  price_from: number | null
  is_verified: boolean
  is_featured: boolean
  is_active: boolean
  rating: number
  review_count: number
  created_at: string
}

const EMPTY: VendorForm = {
  name: '', category: 'Photographer', city: '', tagline: '', description: '',
  priceFrom: '', priceUnit: 'per event', phone: '', email: '', website: '', instagram: '',
  tags: '', isVerified: false, isFeatured: false,
}

export default function MarketplaceAdminClient({ initialVendors }: { initialVendors: Vendor[] }) {
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [form, setForm] = useState<VendorForm>(EMPTY)
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState('')

  const filtered = vendors.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.city.toLowerCase().includes(search.toLowerCase()) ||
    v.category.toLowerCase().includes(search.toLowerCase())
  )

  function openAdd() { setEditing(null); setForm(EMPTY); setDialogOpen(true) }

  function openEdit(v: Vendor) {
    setEditing(v)
    // We don't have all fields in the list — use what we have, rest stays from EMPTY
    setForm({ ...EMPTY, name: v.name, category: v.category, city: v.city,
      priceFrom: v.price_from?.toString() || '', isVerified: v.is_verified, isFeatured: v.is_featured })
    setDialogOpen(true)
  }

  function f(k: keyof VendorForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [k]: e.target.value }))
  }

  function handleSave() {
    if (!form.name.trim() || !form.city.trim()) { toast.error('Name and city are required'); return }
    startTransition(async () => {
      if (editing) {
        const res = await updateMarketplaceVendor(editing.id, form)
        if ('error' in res) { toast.error(res.error); return }
        setVendors(prev => prev.map(v => v.id === editing.id
          ? { ...v, name: form.name, category: form.category, city: form.city,
              price_from: form.priceFrom ? parseInt(form.priceFrom) : null,
              is_verified: form.isVerified, is_featured: form.isFeatured }
          : v))
        toast.success('Vendor updated')
      } else {
        const res = await createMarketplaceVendor(form)
        if ('error' in res) { toast.error(res.error); return }
        const newV: Vendor = {
          id: res.id, name: form.name, category: form.category, city: form.city,
          price_from: form.priceFrom ? parseInt(form.priceFrom) : null,
          is_verified: form.isVerified, is_featured: form.isFeatured,
          is_active: true, rating: 0, review_count: 0, created_at: new Date().toISOString(),
        }
        setVendors(prev => [newV, ...prev])
        toast.success('Vendor listed')
      }
      setDialogOpen(false)
    })
  }

  function handleToggleActive(v: Vendor) {
    setVendors(prev => prev.map(x => x.id === v.id ? { ...x, is_active: !v.is_active } : x))
    startTransition(async () => {
      const res = await toggleVendorActive(v.id, !v.is_active)
      if ('error' in res) {
        toast.error(res.error)
        setVendors(prev => prev.map(x => x.id === v.id ? { ...x, is_active: v.is_active } : x))
      } else {
        toast.success(v.is_active ? 'Vendor hidden' : 'Vendor live')
      }
    })
  }

  function handleDelete(v: Vendor) {
    if (!confirm(`Delete "${v.name}"? This cannot be undone.`)) return
    setVendors(prev => prev.filter(x => x.id !== v.id))
    startTransition(async () => {
      const res = await deleteMarketplaceVendor(v.id)
      if ('error' in res) { toast.error(res.error); setVendors(prev => [...prev, v]) }
      else toast.success('Vendor deleted')
    })
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Vendor Marketplace</h1>
          <p className="text-stone-500 text-sm mt-0.5">
            {vendors.length} vendors · {vendors.filter(v => v.is_active).length} live ·{' '}
            <a href="/vendors" target="_blank" rel="noreferrer" className="text-rose-600 hover:underline inline-flex items-center gap-1">
              Preview marketplace <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>
        <Button onClick={openAdd} className="bg-rose-700 hover:bg-rose-800">
          <Plus className="w-4 h-4 mr-1.5" /> Add vendor
        </Button>
      </div>

      {/* Search */}
      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, city or category…"
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-stone-200 rounded-xl">
          <Store className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-600 font-semibold">No vendors yet</p>
          <p className="text-stone-400 text-sm mt-1">Add vendors to show them in the public marketplace</p>
          <Button onClick={openAdd} variant="outline" className="mt-4">
            <Plus className="w-4 h-4 mr-1.5" /> Add first vendor
          </Button>
        </div>
      ) : (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-100 bg-stone-50 text-left">
                <th className="px-4 py-3 font-medium text-stone-500">Vendor</th>
                <th className="px-4 py-3 font-medium text-stone-500 hidden md:table-cell">Category</th>
                <th className="px-4 py-3 font-medium text-stone-500 hidden sm:table-cell">City</th>
                <th className="px-4 py-3 font-medium text-stone-500 hidden lg:table-cell">Price from</th>
                <th className="px-4 py-3 font-medium text-stone-500 hidden lg:table-cell">Rating</th>
                <th className="px-4 py-3 font-medium text-stone-500">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(v => (
                <tr key={v.id} className="border-b border-stone-50 hover:bg-stone-50 transition-colors">
                  <td className="px-4 py-3">
                    <button onClick={() => openEdit(v)} className="font-medium text-stone-900 hover:text-rose-700 transition-colors text-left">
                      {v.name}
                    </button>
                    <div className="flex gap-1 mt-0.5">
                      {v.is_verified && <Badge className="text-xs bg-blue-50 text-blue-600 border-blue-100 py-0"><CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />Verified</Badge>}
                      {v.is_featured && <Badge className="text-xs bg-amber-50 text-amber-600 border-amber-100 py-0"><Star className="w-2.5 h-2.5 mr-0.5" />Featured</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-600 hidden md:table-cell">{v.category}</td>
                  <td className="px-4 py-3 text-stone-600 hidden sm:table-cell">{v.city}</td>
                  <td className="px-4 py-3 text-stone-600 hidden lg:table-cell">
                    {v.price_from ? `₹${v.price_from.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {v.review_count > 0
                      ? <span className="flex items-center gap-1 text-stone-600"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />{v.rating.toFixed(1)} ({v.review_count})</span>
                      : <span className="text-stone-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleToggleActive(v)}
                      className={cn('inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors',
                        v.is_active ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-stone-100 text-stone-500 hover:bg-stone-200')}>
                      {v.is_active ? <><Eye className="w-3 h-3" /> Live</> : <><EyeOff className="w-3 h-3" /> Hidden</>}
                    </button>
                  </td>
                  <td className="px-4 py-3 flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(v)} className="text-stone-300 hover:text-stone-600 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
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

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit vendor' : 'Add vendor to marketplace'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Vendor / Business name *</Label>
                <Input value={form.name} onChange={f('name')} placeholder="Sharma Photography Studio" className="mt-1" autoFocus />
              </div>
              <div>
                <Label>Category *</Label>
                <select value={form.category} onChange={f('category')} className="mt-1 w-full border border-stone-200 rounded-md px-2 py-1.5 text-sm">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <Label>City *</Label>
                <Input value={form.city} onChange={f('city')} placeholder="Jaipur" className="mt-1" />
              </div>
            </div>

            <div>
              <Label>Tagline <span className="text-stone-400 text-xs">(shown on card)</span></Label>
              <Input value={form.tagline} onChange={f('tagline')} placeholder="Capturing your moments beautifully since 2015" className="mt-1" />
            </div>

            <div>
              <Label>Description</Label>
              <textarea value={form.description} onChange={f('description')} rows={3}
                placeholder="Tell couples about your services, experience and style…"
                className="mt-1 w-full border border-stone-200 rounded-md px-3 py-2 text-sm resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Starting price (₹)</Label>
                <Input type="number" value={form.priceFrom} onChange={f('priceFrom')} placeholder="15000" className="mt-1" />
              </div>
              <div>
                <Label>Price unit</Label>
                <select value={form.priceUnit} onChange={f('priceUnit')} className="mt-1 w-full border border-stone-200 rounded-md px-2 py-1.5 text-sm">
                  {PRICE_UNITS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={f('phone')} placeholder="+91 98765 43210" className="mt-1" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={f('email')} placeholder="vendor@email.com" className="mt-1" />
              </div>
              <div>
                <Label>Website</Label>
                <Input value={form.website} onChange={f('website')} placeholder="https://yoursite.com" className="mt-1" />
              </div>
              <div>
                <Label>Instagram</Label>
                <Input value={form.instagram} onChange={f('instagram')} placeholder="@handle" className="mt-1" />
              </div>
            </div>

            <div>
              <Label>Tags <span className="text-stone-400 text-xs">(comma separated)</span></Label>
              <Input value={form.tags} onChange={f('tags')} placeholder="candid, destination, budget-friendly" className="mt-1" />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isVerified}
                  onChange={e => setForm(p => ({ ...p, isVerified: e.target.checked }))}
                  className="w-4 h-4 accent-blue-600" />
                <span className="text-sm text-stone-700">Verified vendor</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isFeatured}
                  onChange={e => setForm(p => ({ ...p, isFeatured: e.target.checked }))}
                  className="w-4 h-4 accent-amber-500" />
                <span className="text-sm text-stone-700">Featured (shown first)</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isPending} className="bg-rose-700 hover:bg-rose-800">
              {editing ? 'Save changes' : 'Add to marketplace'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
