'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Store, Phone, Trash2, ArrowRight, Link as LinkIcon } from 'lucide-react'
import Link from 'next/link'
import { addCelebrationVendor, deleteCelebrationVendor } from '../actions'

const VENDOR_CATS = [
  'Photography', 'Videography', 'Catering', 'Decoration', 'Music & DJ',
  'Makeup & Hair', 'Mehandi Artist', 'Transportation', 'Dhol & Band',
  'Pandit', 'Venue', 'Tent & Furniture', 'Lighting', 'Invitations', 'Other',
]

const VENDOR_STATUS_COLORS: Record<string, string> = {
  enquired: 'bg-stone-100 text-stone-600',
  confirmed: 'bg-blue-100 text-blue-700',
  booked: 'bg-purple-100 text-purple-700',
  paid: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-500',
}

const VENDOR_EMOJI: Record<string, string> = {
  Photography: '📸', Videography: '🎥', Catering: '🍽️', Decoration: '💐',
  'Music & DJ': '🎵', 'Makeup & Hair': '💄', Transportation: '🚗', Pandit: '🪔',
}

type Vendor = {
  id: string
  category: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  total_amount: number
  advance_paid: number
  status: string
  notes: string | null
  payment_due: string | null
}

function fmtAmt(n: number) { return '₹' + n.toLocaleString('en-IN') }

function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:border-rose-300 ${className}`}
      {...props}
    />
  )
}

function ProGate({ onUpgrade, isPending }: { onUpgrade: () => void; isPending: boolean }) {
  return (
    <div className="text-center py-16 px-6">
      <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Store className="w-8 h-8 text-purple-400" />
      </div>
      <h3 className="font-semibold text-stone-800 mb-2">Vendor tracker is Pro</h3>
      <p className="text-sm text-stone-500 mb-6 max-w-xs mx-auto">
        Track all your vendors, payments, and contacts in one place.
      </p>
      <button
        onClick={onUpgrade}
        disabled={isPending}
        className="bg-rose-700 text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-rose-800 disabled:opacity-50 transition-colors"
      >
        {isPending ? 'Upgrading…' : 'Upgrade to Pro'}
      </button>
    </div>
  )
}

type Props = {
  celebrationId: string
  plan: string
  initialVendors: Vendor[]
}

export default function VendorsClient({ celebrationId, plan, initialVendors }: Props) {
  const [isPro, setIsPro] = useState(plan === 'pro')
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors)
  const [vendorCatFilter, setVendorCatFilter] = useState('all')
  const [showAddVendor, setShowAddVendor] = useState(false)
  const [vendorForm, setVendorForm] = useState({
    category: '', name: '', phone: '', contact_name: '',
    total_amount: '', advance_paid: '', status: 'enquired', notes: '',
  })
  const [isPending, startTransition] = useTransition()

  const filteredVendors = vendors.filter(v => vendorCatFilter === 'all' || v.category === vendorCatFilter)
  const vendorCategories = [...new Set(vendors.map(v => v.category))]
  const totalVendorPaid = vendors.reduce((s, v) => s + (v.advance_paid ?? 0), 0)
  const totalVendorAmt = vendors.reduce((s, v) => s + (v.total_amount ?? 0), 0)

  function handleAddVendor() {
    if (!vendorForm.name.trim() || !vendorForm.category) return
    startTransition(async () => {
      const res = await addCelebrationVendor(celebrationId, {
        category: vendorForm.category,
        name: vendorForm.name,
        contact_name: vendorForm.contact_name || undefined,
        phone: vendorForm.phone || undefined,
        total_amount: parseFloat(vendorForm.total_amount) || 0,
        advance_paid: parseFloat(vendorForm.advance_paid) || 0,
        status: vendorForm.status,
        notes: vendorForm.notes || undefined,
      })
      if ('error' in res) { toast.error(res.error); return }
      setVendors(prev => [...prev, {
        id: res.id,
        category: vendorForm.category,
        name: vendorForm.name,
        contact_name: vendorForm.contact_name || null,
        phone: vendorForm.phone || null,
        email: null,
        total_amount: parseFloat(vendorForm.total_amount) || 0,
        advance_paid: parseFloat(vendorForm.advance_paid) || 0,
        status: vendorForm.status,
        notes: vendorForm.notes || null,
        payment_due: null,
      }])
      setVendorForm({ category: '', name: '', phone: '', contact_name: '', total_amount: '', advance_paid: '', status: 'enquired', notes: '' })
      setShowAddVendor(false)
      toast.success(`${vendorForm.name} added`)
    })
  }

  function handleUpgrade() {
    startTransition(async () => {
      const { upgradeToPro } = await import('../actions')
      const res = await upgradeToPro(celebrationId)
      if ('error' in res) { toast.error(res.error); return }
      setIsPro(true)
      toast.success('Pro unlocked!')
    })
  }

  if (!isPro) {
    return <ProGate onUpgrade={handleUpgrade} isPending={isPending} />
  }

  return (
    <div className="space-y-4">
      {/* Payment summary */}
      {vendors.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white border border-stone-100 rounded-xl p-3 text-center">
            <p className="text-base font-bold text-stone-900">{vendors.length}</p>
            <p className="text-[10px] text-stone-400 mt-0.5">Vendors</p>
          </div>
          <div className="bg-white border border-stone-100 rounded-xl p-3 text-center">
            <p className="text-base font-bold text-emerald-600">{fmtAmt(totalVendorPaid)}</p>
            <p className="text-[10px] text-stone-400 mt-0.5">Advance paid</p>
          </div>
          <div className="bg-white border border-stone-100 rounded-xl p-3 text-center">
            <p className="text-base font-bold text-amber-600">{fmtAmt(totalVendorAmt - totalVendorPaid)}</p>
            <p className="text-[10px] text-stone-400 mt-0.5">Balance due</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 items-center">
        {vendorCategories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto flex-1 pb-0.5">
            <button
              onClick={() => setVendorCatFilter('all')}
              className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 font-medium transition-colors ${vendorCatFilter === 'all' ? 'bg-rose-700 text-white' : 'bg-white border border-stone-200 text-stone-600'}`}
            >
              All
            </button>
            {vendorCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setVendorCatFilter(cat)}
                className={`text-xs px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0 font-medium transition-colors ${vendorCatFilter === cat ? 'bg-rose-700 text-white' : 'bg-white border border-stone-200 text-stone-600'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setShowAddVendor(v => !v)}
          className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800 transition-colors flex-shrink-0"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>

      {showAddVendor && (
        <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-stone-800">Add new vendor</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Category *</label>
              <select
                value={vendorForm.category}
                onChange={e => setVendorForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none"
              >
                <option value="">Select…</option>
                {VENDOR_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Status</label>
              <select
                value={vendorForm.status}
                onChange={e => setVendorForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none"
              >
                <option value="enquired">Enquired</option>
                <option value="confirmed">Confirmed</option>
                <option value="booked">Booked ✓</option>
                <option value="paid">Paid ✓✓</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-stone-500 mb-1 block">Name *</label>
              <Input value={vendorForm.name} onChange={e => setVendorForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Moments Studio" autoFocus />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Contact person</label>
              <Input value={vendorForm.contact_name} onChange={e => setVendorForm(f => ({ ...f, contact_name: e.target.value }))} placeholder="Rahul bhai" />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Phone</label>
              <Input value={vendorForm.phone} onChange={e => setVendorForm(f => ({ ...f, phone: e.target.value }))} placeholder="98765 43210" type="tel" />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Total amount (₹)</label>
              <Input type="number" min="0" value={vendorForm.total_amount} onChange={e => setVendorForm(f => ({ ...f, total_amount: e.target.value }))} placeholder="0" />
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Advance paid (₹)</label>
              <Input type="number" min="0" value={vendorForm.advance_paid} onChange={e => setVendorForm(f => ({ ...f, advance_paid: e.target.value }))} placeholder="0" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-stone-500 mb-1 block">Notes</label>
              <Input value={vendorForm.notes} onChange={e => setVendorForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any special notes…" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddVendor(false)} className="text-xs text-stone-500 px-3 py-1.5">Cancel</button>
            <button
              onClick={handleAddVendor}
              disabled={!vendorForm.name.trim() || !vendorForm.category || isPending}
              className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {/* Marketplace link */}
      <Link href="/vendors" className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl hover:bg-purple-100 transition-colors">
        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
          <LinkIcon className="w-4 h-4 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-purple-800">Find vendors on Marketplace</p>
          <p className="text-xs text-purple-500">Browse verified photographers, caterers, decorators & more</p>
        </div>
        <ArrowRight className="w-4 h-4 text-purple-400 flex-shrink-0" />
      </Link>

      {filteredVendors.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
          <Store className="w-10 h-10 mx-auto mb-3 text-stone-200" />
          <p className="text-stone-500 text-sm">No vendors yet</p>
          <button onClick={() => setShowAddVendor(true)} className="text-xs text-rose-600 mt-2">+ Add first vendor</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredVendors.map(v => {
            const balance = v.total_amount - v.advance_paid
            return (
              <div key={v.id} className="bg-white border border-stone-100 rounded-xl p-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 text-base">
                    {VENDOR_EMOJI[v.category] ?? '🏪'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-stone-800">{v.name}</p>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${VENDOR_STATUS_COLORS[v.status] ?? 'bg-stone-100 text-stone-500'}`}>
                        {v.status}
                      </span>
                    </div>
                    {v.contact_name && <p className="text-xs text-stone-400 mt-0.5">{v.contact_name}</p>}
                    <p className="text-xs text-stone-400">{v.category}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {v.phone && (
                      <a
                        href={`tel:${v.phone}`}
                        onClick={e => e.stopPropagation()}
                        className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-green-100 hover:text-green-600 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setVendors(prev => prev.filter(x => x.id !== v.id))
                        startTransition(async () => {
                          const res = await deleteCelebrationVendor(v.id)
                          if ('error' in res) { toast.error(res.error); setVendors(prev => [...prev, v]) }
                        })
                      }}
                      className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-400 hover:bg-red-100 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {v.total_amount > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t border-stone-50 flex items-center justify-between text-xs">
                    <span className="text-stone-500">Total: <span className="font-semibold text-stone-800">{fmtAmt(v.total_amount)}</span></span>
                    <span className="text-emerald-600">Paid: {fmtAmt(v.advance_paid)}</span>
                    <span className={balance > 0 ? 'text-amber-600 font-medium' : 'text-stone-400'}>
                      {balance > 0 ? `Due: ${fmtAmt(balance)}` : 'Fully paid ✓'}
                    </span>
                  </div>
                )}
                {v.notes && <p className="text-xs text-stone-400 mt-1.5 pt-1.5 border-t border-stone-50">{v.notes}</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
