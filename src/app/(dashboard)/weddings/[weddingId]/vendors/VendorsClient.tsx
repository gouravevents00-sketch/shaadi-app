'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, ChevronDown, ChevronRight, Trash2, Phone, Mail, IndianRupee, CalendarClock, CheckCircle2, Circle, X, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { createVendor, updateVendor, deleteVendor, createPayment, updatePayment, deletePayment } from './actions'
import { usePrivacy } from '@/contexts/PrivacyContext'
import DocumentsPanel from '@/components/shared/DocumentsPanel'
import SmartDatePicker from '@/components/shared/SmartDatePicker'

function isPaymentOverdue(p: { due_date: string; paid_date: string | null }) {
  if (p.paid_date) return false
  return new Date(p.due_date + 'T00:00:00') < new Date(new Date().toDateString())
}

// ─── Types ─────────────────────────────────────────────────────────────────

interface Vendor {
  id: string; wedding_id: string; name: string; category: string
  contact_name: string | null; phone: string | null; email: string | null
  total_amount: number; paid_amount: number
  status: 'enquired' | 'booked' | 'confirmed' | 'paid' | 'cancelled'
  contract_url: string | null; notes: string | null; created_at: string
}

interface Payment {
  id: string; vendor_id: string; amount: number; due_date: string
  paid_date: string | null; mode: string | null; notes: string | null
}

// ─── Status config ─────────────────────────────────────────────────────────

const STATUS_CYCLE: Vendor['status'][] = ['enquired', 'booked', 'confirmed', 'paid', 'cancelled']
const STATUS_STYLE: Record<string, string> = {
  enquired:  'bg-stone-100 text-stone-600',
  booked:    'bg-blue-100 text-blue-700',
  confirmed: 'bg-amber-100 text-amber-700',
  paid:      'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-500',
}

// ─── Default categories ────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  'Photography', 'Videography', 'Catering', 'Decor & Floral', 'Music & Entertainment',
  'Makeup & Hair', 'Venue', 'Mehandi', 'Pandit', 'Clothing', 'Lighting', 'Transport', 'Other'
]

const fmt = (n: number) => n >= 100000
  ? `₹${(n / 100000).toFixed(n % 100000 === 0 ? 0 : 1)}L`
  : n >= 1000
  ? `₹${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
  : `₹${n}`

// ─── Main component ────────────────────────────────────────────────────────

export default function VendorsClient({ weddingId, initialVendors, initialPayments, quickDates = [] }: {
  weddingId: string
  initialVendors: Vendor[]
  initialPayments: Payment[]
  quickDates?: { label: string; value: string }[]
}) {
  const { hidden } = usePrivacy()
  const pmoney = (n: number) => hidden ? '₹ ••••' : fmt(n)

  const [vendors, setVendors] = useState<Vendor[]>(initialVendors)
  const [payments, setPayments] = useState<Payment[]>(initialPayments)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCat, setFilterCat] = useState<string>('all')
  // Quick-add state
  const [addingCat, setAddingCat] = useState<string | null>(null)
  const [addName, setAddName] = useState('')
  const [addTotal, setAddTotal] = useState('')
  const addRef = useRef<HTMLInputElement>(null)

  // Compute totals
  const totalBudget = vendors.reduce((s, v) => s + Number(v.total_amount), 0)
  const totalPaid = vendors.reduce((s, v) => s + Number(v.paid_amount), 0)
  const totalPending = totalBudget - totalPaid

  // Upcoming payments (unpaid, due in future)
  const today = new Date().toISOString().split('T')[0]
  const upcoming = payments
    .filter(p => !p.paid_date && p.due_date >= today)
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 5)

  // Overdue payments
  const overduePayments = payments
    .filter(p => isPaymentOverdue(p))
    .sort((a, b) => a.due_date.localeCompare(b.due_date))

  // Filter vendors
  const filtered = vendors.filter(v =>
    (filterStatus === 'all' || v.status === filterStatus) &&
    (filterCat === 'all' || v.category === filterCat)
  )

  // Group by category
  const cats = [...new Set(filtered.map(v => v.category))]
  const allCats = [...new Set(vendors.map(v => v.category))]

  // ─── Handlers ──────────────────────────────────────────────────────────

  async function handleAdd(cat: string) {
    if (!addName.trim()) return
    const total = parseFloat(addTotal) || 0
    const tmp: Vendor = {
      id: 'tmp-' + Date.now(), wedding_id: weddingId, name: addName, category: cat,
      contact_name: null, phone: null, email: null, total_amount: total, paid_amount: 0,
      status: 'enquired', contract_url: null, notes: null, created_at: new Date().toISOString()
    }
    setVendors(vs => [...vs, tmp])
    setAddName(''); setAddTotal(''); setAddingCat(null)
    const res = await createVendor(weddingId, { name: tmp.name, category: cat, total_amount: total })
    if ('error' in res) { toast.error(res.error); setVendors(vs => vs.filter(v => v.id !== tmp.id)); return }
    setVendors(vs => vs.map(v => v.id === tmp.id ? { ...v, id: res.id! } : v))
    setExpanded(s => { const n = new Set(s); n.add(res.id!); return n })
  }

  async function cycleStatus(vendor: Vendor) {
    const idx = STATUS_CYCLE.indexOf(vendor.status)
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length]
    setVendors(vs => vs.map(v => v.id === vendor.id ? { ...v, status: next } : v))
    const res = await updateVendor(weddingId, vendor.id, { status: next })
    if ('error' in res) {
      toast.error(res.error)
      setVendors(vs => vs.map(v => v.id === vendor.id ? { ...v, status: vendor.status } : v))
    }
  }

  async function handleDeleteVendor(vendorId: string) {
    setVendors(vs => vs.filter(v => v.id !== vendorId))
    setPayments(ps => ps.filter(p => p.vendor_id !== vendorId))
    const res = await deleteVendor(weddingId, vendorId)
    if ('error' in res) { toast.error(res.error) }
  }

  async function handleFieldSave(vendor: Vendor, field: keyof Vendor, value: string | number | null) {
    setVendors(vs => vs.map(v => v.id === vendor.id ? { ...v, [field]: value } : v))
    const res = await updateVendor(weddingId, vendor.id, { [field]: value })
    if ('error' in res) { toast.error(res.error) }
  }

  async function handleAddPayment(vendorId: string, data: { amount: number; due_date: string; mode?: string }) {
    const tmp: Payment = {
      id: 'tmp-' + Date.now(), vendor_id: vendorId, amount: data.amount,
      due_date: data.due_date, paid_date: null, mode: data.mode ?? null, notes: null
    }
    setPayments(ps => [...ps, tmp])
    const res = await createPayment(weddingId, vendorId, data)
    if ('error' in res) { toast.error(res.error); setPayments(ps => ps.filter(p => p.id !== tmp.id)); return }
    setPayments(ps => ps.map(p => p.id === tmp.id ? { ...p, id: res.id! } : p))
  }

  async function togglePaid(p: Payment) {
    const paid_date = p.paid_date ? null : today
    setPayments(ps => ps.map(x => x.id === p.id ? { ...x, paid_date } : x))
    // update paid_amount on vendor optimistically
    const diff = paid_date ? Number(p.amount) : -Number(p.amount)
    setVendors(vs => vs.map(v => v.id === p.vendor_id ? { ...v, paid_amount: Number(v.paid_amount) + diff } : v))
    const res = await updatePayment(weddingId, p.vendor_id, p.id, { paid_date })
    if ('error' in res) {
      toast.error(res.error)
      setPayments(ps => ps.map(x => x.id === p.id ? { ...x, paid_date: p.paid_date } : x))
      setVendors(vs => vs.map(v => v.id === p.vendor_id ? { ...v, paid_amount: Number(v.paid_amount) - diff } : v))
    }
  }

  async function handleDeletePayment(p: Payment) {
    setPayments(ps => ps.filter(x => x.id !== p.id))
    if (p.paid_date) {
      setVendors(vs => vs.map(v => v.id === p.vendor_id ? { ...v, paid_amount: Math.max(0, Number(v.paid_amount) - Number(p.amount)) } : v))
    }
    const res = await deletePayment(weddingId, p.vendor_id, p.id)
    if ('error' in res) toast.error(res.error)
  }

  const toggleExpand = (id: string) =>
    setExpanded(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Vendors</h1>
          <p className="text-sm text-stone-400 mt-0.5">
            {vendors.length} vendor{vendors.length !== 1 ? 's' : ''} &middot; {pmoney(totalBudget)} total &middot; {pmoney(totalPaid)} paid
          </p>
        </div>
        <Button
          size="sm"
          className="bg-rose-700 hover:bg-rose-800"
          onClick={() => {
            const cat = allCats[0] ?? DEFAULT_CATEGORIES[0]
            setAddingCat(cat)
            setTimeout(() => addRef.current?.focus(), 50)
          }}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add vendor
        </Button>
      </div>

      {/* Overdue banner */}
      {overduePayments.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <CalendarClock className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-red-700">{overduePayments.length} overdue payment{overduePayments.length !== 1 ? 's' : ''}</span>
            <span className="text-sm text-red-500">· {pmoney(overduePayments.reduce((s, p) => s + Number(p.amount), 0))} total</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {overduePayments.map(p => {
              const v = vendors.find(x => x.id === p.vendor_id)
              return (
                <span key={p.id} className="text-xs bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-medium">
                  {v?.name} · {pmoney(Number(p.amount))} · due {new Date(p.due_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Summary pills */}
      {vendors.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {totalPending > 0 && (
            <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <span className="font-medium text-amber-700">{pmoney(totalPending)}</span>
              <span className="text-amber-600 ml-1">pending</span>
            </div>
          )}
          {upcoming.map(p => {
            const v = vendors.find(x => x.id === p.vendor_id)
            return (
              <div key={p.id} className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-lg text-sm flex items-center gap-1.5">
                <CalendarClock className="w-3.5 h-3.5 text-rose-500" />
                <span className="text-rose-700 font-medium">{pmoney(p.amount)}</span>
                <span className="text-rose-500">{v?.name} · {new Date(p.due_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Filters */}
      {vendors.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {['all', ...STATUS_CYCLE.filter(s => vendors.some(v => v.status === s))].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors capitalize
                ${filterStatus === s ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
            >
              {s === 'all' ? `All (${vendors.length})` : `${s} (${vendors.filter(v => v.status === s).length})`}
            </button>
          ))}
          {allCats.length > 1 && (
            <>
              <span className="text-stone-300 self-center">|</span>
              {['all', ...allCats].map(c => (
                <button
                  key={c}
                  onClick={() => setFilterCat(c)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors
                    ${filterCat === c ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}
                >
                  {c === 'all' ? 'All cats' : c}
                </button>
              ))}
            </>
          )}
        </div>
      )}

      {/* Empty state */}
      {vendors.length === 0 && (
        <div className="text-center py-20 border-2 border-dashed border-stone-200 rounded-xl">
          <IndianRupee className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 font-medium">No vendors yet</p>
          <p className="text-stone-400 text-sm mt-1 mb-4">Track photographers, caterers, decorators and more</p>
          <Button
            size="sm"
            className="bg-rose-700 hover:bg-rose-800"
            onClick={() => { setAddingCat(DEFAULT_CATEGORIES[0]); setTimeout(() => addRef.current?.focus(), 50) }}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add first vendor
          </Button>
        </div>
      )}

      {/* Vendor list grouped by category */}
      <div className="space-y-4">
        {cats.map(cat => {
          const catVendors = filtered.filter(v => v.category === cat)
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">{cat}</span>
                <div className="flex-1 h-px bg-stone-100" />
                <button
                  className="text-xs text-stone-400 hover:text-stone-700 flex items-center gap-0.5 transition-colors"
                  onClick={() => { setAddingCat(cat); setTimeout(() => addRef.current?.focus(), 50) }}
                >
                  <Plus className="w-3 h-3" /> add
                </button>
              </div>
              <div className="space-y-2">
                {catVendors.map(v => (
                  <VendorRow
                    key={v.id}
                    vendor={v}
                    weddingId={weddingId}
                    payments={payments.filter(p => p.vendor_id === v.id)}
                    expanded={expanded.has(v.id)}
                    onToggle={() => toggleExpand(v.id)}
                    onCycleStatus={() => cycleStatus(v)}
                    onDelete={() => handleDeleteVendor(v.id)}
                    onFieldSave={(field, val) => handleFieldSave(v, field as keyof Vendor, val)}
                    onAddPayment={(data) => handleAddPayment(v.id, data)}
                    onTogglePaid={togglePaid}
                    onDeletePayment={handleDeletePayment}
                    quickDates={quickDates}
                  />
                ))}
                {/* Inline add for this category */}
                {addingCat === cat && (
                  <div className="flex gap-2 items-center bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
                    <Input
                      ref={addRef}
                      placeholder="Vendor name"
                      value={addName}
                      onChange={e => setAddName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAdd(cat); if (e.key === 'Escape') setAddingCat(null) }}
                      className="h-7 text-sm border-0 bg-transparent focus-visible:ring-0 p-0 flex-1"
                    />
                    <Input
                      placeholder="₹ amount"
                      value={addTotal}
                      onChange={e => setAddTotal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAdd(cat); if (e.key === 'Escape') setAddingCat(null) }}
                      className="h-7 text-sm border-0 bg-transparent focus-visible:ring-0 p-0 w-24"
                      type="number"
                    />
                    <button onClick={() => handleAdd(cat)} className="text-xs bg-stone-800 text-white px-2 py-1 rounded-md hover:bg-stone-700">Add</button>
                    <button onClick={() => setAddingCat(null)} className="text-stone-400 hover:text-stone-600"><X className="w-3.5 h-3.5" /></button>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Add vendor in new category */}
        {addingCat && !cats.includes(addingCat) && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">{addingCat}</span>
              <div className="flex-1 h-px bg-stone-100" />
            </div>
            <div className="flex gap-2 items-center bg-stone-50 border border-stone-200 rounded-xl px-3 py-2">
              <Input
                ref={addRef}
                placeholder="Vendor name"
                value={addName}
                onChange={e => setAddName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(addingCat); if (e.key === 'Escape') setAddingCat(null) }}
                className="h-7 text-sm border-0 bg-transparent focus-visible:ring-0 p-0 flex-1"
              />
              <Input
                placeholder="₹ amount"
                value={addTotal}
                onChange={e => setAddTotal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(addingCat); if (e.key === 'Escape') setAddingCat(null) }}
                className="h-7 text-sm border-0 bg-transparent focus-visible:ring-0 p-0 w-24"
                type="number"
              />
              <button onClick={() => handleAdd(addingCat)} className="text-xs bg-stone-800 text-white px-2 py-1 rounded-md hover:bg-stone-700">Add</button>
              <button onClick={() => setAddingCat(null)} className="text-stone-400 hover:text-stone-600"><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        )}

        {/* Add in new category picker */}
        {vendors.length > 0 && !addingCat && (
          <NewCategoryPicker
            existingCats={allCats}
            onSelect={(cat) => { setAddingCat(cat); setTimeout(() => addRef.current?.focus(), 50) }}
          />
        )}
      </div>
    </div>
  )
}

// ─── VendorRow ─────────────────────────────────────────────────────────────

function VendorRow({ vendor, weddingId, payments, expanded, onToggle, onCycleStatus, onDelete, onFieldSave, onAddPayment, onTogglePaid, onDeletePayment, quickDates }: {
  vendor: Vendor
  weddingId: string
  payments: Payment[]
  expanded: boolean
  onToggle: () => void
  onCycleStatus: () => void
  onDelete: () => void
  onFieldSave: (field: string, value: string | number | null) => void
  onAddPayment: (data: { amount: number; due_date: string; mode?: string }) => void
  onTogglePaid: (p: Payment) => void
  onDeletePayment: (p: Payment) => void
  quickDates?: { label: string; value: string }[]
}) {
  const { hidden } = usePrivacy()
  const pmoney = (n: number) => hidden ? '₹ ••••' : fmt(n)
  const paidPct = vendor.total_amount > 0 ? Math.min(100, (Number(vendor.paid_amount) / Number(vendor.total_amount)) * 100) : 0
  const remaining = Number(vendor.total_amount) - Number(vendor.paid_amount)

  return (
    <div className={`bg-white border rounded-xl overflow-hidden transition-shadow ${expanded ? 'shadow-md border-stone-300' : 'border-stone-200 hover:border-stone-300'}`}>
      {/* Row header */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none" onClick={onToggle}>
        {expanded ? <ChevronDown className="w-4 h-4 text-stone-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-stone-400 flex-shrink-0" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-stone-800 truncate">{vendor.name}</span>
            {vendor.contact_name && <span className="text-xs text-stone-400 truncate hidden sm:block">· {vendor.contact_name}</span>}
          </div>
          {vendor.total_amount > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1 bg-stone-100 rounded-full max-w-[120px]">
                <div className="h-1 bg-emerald-400 rounded-full" style={{ width: `${paidPct}%` }} />
              </div>
              <span className="text-xs text-stone-400">
                {pmoney(Number(vendor.paid_amount))} / {pmoney(Number(vendor.total_amount))}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={e => { e.stopPropagation(); onCycleStatus() }}
          className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize transition-colors ${STATUS_STYLE[vendor.status]}`}
        >
          {vendor.status}
        </button>
        <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1 text-stone-300 hover:text-red-500 transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-stone-100 px-4 py-4 space-y-4 bg-stone-50/50">
          {/* Contact + amount row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <EditField label="Contact name" value={vendor.contact_name ?? ''} onSave={v => onFieldSave('contact_name', v || null)} icon={<Pencil className="w-3 h-3" />} />
            <EditField label="Phone" value={vendor.phone ?? ''} onSave={v => onFieldSave('phone', v || null)} icon={<Phone className="w-3 h-3" />} />
            <EditField label="Email" value={vendor.email ?? ''} onSave={v => onFieldSave('email', v || null)} icon={<Mail className="w-3 h-3" />} />
            <EditField label="Total amount (₹)" value={String(vendor.total_amount || '')} onSave={v => onFieldSave('total_amount', parseFloat(v) || 0)} type="number" icon={<IndianRupee className="w-3 h-3" />} />
          </div>

          {/* Notes */}
          <EditField label="Notes" value={vendor.notes ?? ''} onSave={v => onFieldSave('notes', v || null)} multiline />

          {/* Payment schedule */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Payment schedule</span>
              {remaining > 0 && <span className="text-xs text-amber-600 font-medium">{pmoney(remaining)} remaining</span>}
            </div>
            <div className="space-y-1.5">
              {payments.map(p => {
                const overdue = isPaymentOverdue(p)
                return (
                  <div key={p.id} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                    p.paid_date ? 'bg-emerald-50' : overdue ? 'bg-red-50 border border-red-200' : 'bg-white border border-stone-200'
                  }`}>
                    <button onClick={() => onTogglePaid(p)} className="flex-shrink-0">
                      {p.paid_date
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        : <Circle className={`w-4 h-4 ${overdue ? 'text-red-400' : 'text-stone-300'}`} />}
                    </button>
                    <span className={`font-medium ${p.paid_date ? 'text-emerald-700' : overdue ? 'text-red-700' : 'text-stone-700'}`}>{pmoney(Number(p.amount))}</span>
                    <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-stone-400'}`}>
                      {new Date(p.due_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {overdue && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">OVERDUE</span>}
                    {p.mode && <span className="text-stone-400 text-xs">{p.mode}</span>}
                    {p.paid_date && <span className="text-emerald-500 text-xs ml-auto">Paid {new Date(p.paid_date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
                    <button onClick={() => onDeletePayment(p)} className="text-stone-300 hover:text-red-400 ml-auto flex-shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
              <AddPaymentRow vendorId={vendor.id} onAdd={onAddPayment} quickDates={quickDates} />
            </div>
          </div>

          {/* Documents */}
          <div className="border-t border-stone-100 pt-4">
            <DocumentsPanel
              weddingId={weddingId}
              entityType="vendor"
              entityId={vendor.id}
              label="Contracts & documents"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── EditField ─────────────────────────────────────────────────────────────

function EditField({ label, value, onSave, type = 'text', multiline = false, icon }: {
  label: string; value: string; onSave: (v: string) => void
  type?: string; multiline?: boolean; icon?: React.ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  function commit() {
    setEditing(false)
    if (val !== value) onSave(val)
  }

  if (multiline) {
    return (
      <div className={`col-span-2 sm:col-span-4`}>
        <label className="text-xs text-stone-400 block mb-1">{label}</label>
        <textarea
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          rows={2}
          className="w-full text-sm bg-white border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
          placeholder={`Add ${label.toLowerCase()}…`}
        />
      </div>
    )
  }

  return (
    <div>
      <label className="text-xs text-stone-400 flex items-center gap-1 mb-1">{icon}{label}</label>
      {editing ? (
        <input
          autoFocus
          type={type}
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setVal(value); setEditing(false) } }}
          className="w-full text-sm bg-white border border-stone-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          className="w-full text-left text-sm text-stone-700 bg-white border border-stone-200 rounded-lg px-2 py-1 hover:border-stone-300 truncate min-h-[30px]"
        >
          {val || <span className="text-stone-300">—</span>}
        </button>
      )}
    </div>
  )
}

// ─── AddPaymentRow ─────────────────────────────────────────────────────────

function AddPaymentRow({ vendorId, onAdd, quickDates }: {
  vendorId: string
  onAdd: (data: { amount: number; due_date: string; mode?: string }) => void
  quickDates?: { label: string; value: string }[]
}) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [due, setDue] = useState('')
  const [mode, setMode] = useState('')

  function commit() {
    if (!amount || !due) return
    onAdd({ amount: parseFloat(amount), due_date: due, mode: mode || undefined })
    setAmount(''); setDue(''); setMode(''); setOpen(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1 px-1 py-1 transition-colors">
        <Plus className="w-3 h-3" /> Add payment installment
      </button>
    )
  }

  return (
    <div className="flex gap-2 items-center bg-white border border-stone-200 rounded-lg px-3 py-2 flex-wrap">
      <input
        autoFocus
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setOpen(false) }}
        className="text-sm border-0 bg-transparent outline-none w-24"
      />
      <SmartDatePicker
        value={due}
        onChange={setDue}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setOpen(false) }}
        quickDates={quickDates}
        className="text-sm border-0 bg-transparent outline-none w-32"
      />
      <input
        placeholder="Mode (UPI/NEFT…)"
        value={mode}
        onChange={e => setMode(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setOpen(false) }}
        className="text-sm border-0 bg-transparent outline-none flex-1 min-w-[80px]"
      />
      <button onClick={commit} className="text-xs bg-stone-800 text-white px-2 py-0.5 rounded">Add</button>
      <button onClick={() => setOpen(false)} className="text-stone-400"><X className="w-3 h-3" /></button>
    </div>
  )
}

// ─── NewCategoryPicker ─────────────────────────────────────────────────────

function NewCategoryPicker({ existingCats, onSelect }: { existingCats: string[]; onSelect: (cat: string) => void }) {
  const [open, setOpen] = useState(false)
  const remaining = DEFAULT_CATEGORIES.filter(c => !existingCats.includes(c))

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-xs text-stone-400 hover:text-stone-600 flex items-center gap-1 transition-colors">
        <Plus className="w-3 h-3" /> Add in new category
      </button>
    )
  }

  return (
    <div className="flex gap-2 flex-wrap items-center">
      <span className="text-xs text-stone-400">Pick category:</span>
      {remaining.map(c => (
        <button key={c} onClick={() => { onSelect(c); setOpen(false) }}
          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-600 text-xs rounded-full transition-colors">
          {c}
        </button>
      ))}
      <input
        placeholder="Custom…"
        className="text-xs border border-stone-200 rounded-full px-2.5 py-1 outline-none focus:border-stone-400 w-24"
        onKeyDown={e => { if (e.key === 'Enter') { onSelect((e.target as HTMLInputElement).value); setOpen(false) } }}
      />
      <button onClick={() => setOpen(false)} className="text-stone-400"><X className="w-3 h-3" /></button>
    </div>
  )
}
