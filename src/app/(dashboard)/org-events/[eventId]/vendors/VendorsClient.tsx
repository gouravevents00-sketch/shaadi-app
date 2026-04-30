'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, ShoppingBag, ChevronDown, ChevronRight, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createVendor, updateVendor, deleteVendor, addPayment, deletePayment, type VendorRow, type PaymentRow } from './actions'

const VENDOR_CATS = ['AV & Tech', 'Catering', 'Decor', 'Photography', 'Videography', 'Lighting', 'Sound', 'Security', 'Transport', 'Printing', 'Gifting', 'Other']
const PAY_METHODS = ['Cash', 'NEFT/RTGS', 'UPI', 'Cheque', 'Card']

type VForm = { name: string; category: string; contact_name: string; contact_phone: string; contact_email: string; quoted_amount: string; contract_signed: boolean; notes: string }
const VEMPTY: VForm = { name: '', category: 'AV & Tech', contact_name: '', contact_phone: '', contact_email: '', quoted_amount: '', contract_signed: false, notes: '' }

type PForm = { amount: string; paid_on: string; method: string; notes: string }
const PEMPTY: PForm = { amount: '', paid_on: new Date().toISOString().split('T')[0], method: 'UPI', notes: '' }

type VendorWithPayments = VendorRow & { payments: PaymentRow[] }

export default function VendorsClient({ eventId, initialVendors, initialPayments }: {
  eventId: string
  initialVendors: VendorRow[]
  initialPayments: PaymentRow[]
}) {
  const [vendors, setVendors] = useState<VendorWithPayments[]>(
    initialVendors.map(v => ({ ...v, payments: initialPayments.filter(p => p.vendor_id === v.id) }))
  )
  const [expanded, setExpanded] = useState<string | null>(null)
  const [vDialog, setVDialog] = useState(false)
  const [editing, setEditing] = useState<VendorRow | null>(null)
  const [vForm, setVForm] = useState<VForm>(VEMPTY)
  const [pDialog, setPDialog] = useState<string | null>(null) // vendorId
  const [pForm, setPForm] = useState<PForm>(PEMPTY)
  const [isPending, startTransition] = useTransition()

  const totalQuoted = vendors.reduce((s, v) => s + (v.quoted_amount ?? 0), 0)
  const totalPaid = vendors.reduce((s, v) => s + v.payments.reduce((ps, p) => ps + p.amount, 0), 0)

  function openAdd() { setEditing(null); setVForm(VEMPTY); setVDialog(true) }
  function openEdit(v: VendorRow) {
    setEditing(v)
    setVForm({
      name: v.name, category: v.category ?? 'AV & Tech',
      contact_name: v.contact_name ?? '', contact_phone: v.contact_phone ?? '',
      contact_email: v.contact_email ?? '', quoted_amount: v.quoted_amount?.toString() ?? '',
      contract_signed: v.contract_signed, notes: v.notes ?? ''
    })
    setVDialog(true)
  }

  function handleVSave() {
    if (!vForm.name.trim()) { toast.error('Name required'); return }
    startTransition(async () => {
      const payload = {
        name: vForm.name, category: vForm.category || undefined,
        contact_name: vForm.contact_name || undefined, contact_phone: vForm.contact_phone || undefined,
        contact_email: vForm.contact_email || undefined,
        quoted_amount: vForm.quoted_amount ? Number(vForm.quoted_amount) : undefined,
        contract_signed: vForm.contract_signed, notes: vForm.notes || undefined,
      }
      const stateUpdate: Partial<VendorRow> = {
        name: vForm.name, category: vForm.category || null,
        contact_name: vForm.contact_name || null, contact_phone: vForm.contact_phone || null,
        contact_email: vForm.contact_email || null,
        quoted_amount: vForm.quoted_amount ? Number(vForm.quoted_amount) : null,
        contract_signed: vForm.contract_signed, notes: vForm.notes || null,
      }
      if (editing) {
        const res = await updateVendor(eventId, editing.id, payload)
        if ('error' in res) { toast.error(res.error); return }
        setVendors(prev => prev.map(v => v.id === editing.id ? { ...v, ...stateUpdate } : v))
        toast.success('Updated')
      } else {
        const res = await createVendor(eventId, payload)
        if ('error' in res) { toast.error(res.error); return }
        const newV: VendorWithPayments = {
          id: res.id, org_event_id: eventId, created_at: new Date().toISOString(), payments: [],
          name: stateUpdate.name!, category: stateUpdate.category ?? null, contact_name: stateUpdate.contact_name ?? null,
          contact_phone: stateUpdate.contact_phone ?? null, contact_email: stateUpdate.contact_email ?? null,
          quoted_amount: stateUpdate.quoted_amount ?? null, contract_signed: stateUpdate.contract_signed ?? false,
          notes: stateUpdate.notes ?? null,
        }
        setVendors(prev => [...prev, newV])
        toast.success('Vendor added')
      }
      setVDialog(false)
    })
  }

  function handleVDelete(v: VendorWithPayments) {
    startTransition(async () => {
      const res = await deleteVendor(eventId, v.id)
      if ('error' in res) { toast.error(res.error); return }
      setVendors(prev => prev.filter(x => x.id !== v.id))
    })
  }

  function handleAddPayment(vendorId: string) {
    if (!pForm.amount) { toast.error('Amount required'); return }
    startTransition(async () => {
      const res = await addPayment(vendorId, eventId, {
        amount: Number(pForm.amount),
        paid_on: pForm.paid_on || undefined,
        method: pForm.method || undefined,
        notes: pForm.notes || undefined,
      })
      if ('error' in res) { toast.error(res.error); return }
      const newP: PaymentRow = {
        id: res.id, vendor_id: vendorId, amount: Number(pForm.amount),
        paid_on: pForm.paid_on || null, method: pForm.method || null,
        notes: pForm.notes || null, created_at: new Date().toISOString()
      }
      setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, payments: [...v.payments, newP] } : v))
      setPDialog(null)
      setPForm(PEMPTY)
      toast.success('Payment recorded')
    })
  }

  function handleDeletePayment(vendorId: string, paymentId: string) {
    startTransition(async () => {
      const res = await deletePayment(vendorId, paymentId, eventId)
      if ('error' in res) { toast.error(res.error); return }
      setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, payments: v.payments.filter(p => p.id !== paymentId) } : v))
    })
  }

  const vf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setVForm(prev => ({ ...prev, [k]: e.target.value }))
  const pf = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setPForm(prev => ({ ...prev, [k]: e.target.value }))

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Vendors</h1>
          <p className="text-sm text-stone-500 mt-0.5">
            {vendors.length} vendors · ₹{totalQuoted.toLocaleString('en-IN')} quoted · ₹{totalPaid.toLocaleString('en-IN')} paid
          </p>
        </div>
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1.5" /> Add Vendor
        </Button>
      </div>

      {vendors.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <ShoppingBag className="w-8 h-8 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No vendors added yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vendors.map(v => {
            const paid = v.payments.reduce((s, p) => s + p.amount, 0)
            const due = (v.quoted_amount ?? 0) - paid
            const isExpanded = expanded === v.id
            return (
              <div key={v.id} className="bg-white rounded-xl border border-stone-200">
                <div className="flex items-center gap-3 px-4 py-3">
                  <button onClick={() => setExpanded(isExpanded ? null : v.id)} className="text-stone-400 hover:text-stone-600">
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <button onClick={() => openEdit(v)} className="font-semibold text-stone-900 hover:text-blue-600 transition-colors text-left">
                      {v.name}
                    </button>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {v.category && <Badge variant="outline" className="text-xs">{v.category}</Badge>}
                      {v.contract_signed
                        ? <span className="flex items-center gap-1 text-xs text-green-600"><CheckCircle2 className="w-3 h-3" />Contract signed</span>
                        : <span className="flex items-center gap-1 text-xs text-amber-500"><Circle className="w-3 h-3" />No contract</span>
                      }
                    </div>
                  </div>
                  <div className="text-right text-sm flex-shrink-0">
                    <p className="font-medium text-stone-900">₹{(v.quoted_amount ?? 0).toLocaleString('en-IN')}</p>
                    <p className={cn('text-xs', due > 0 ? 'text-red-500' : 'text-green-600')}>
                      {due > 0 ? `₹${due.toLocaleString('en-IN')} due` : 'Fully paid'}
                    </p>
                  </div>
                  <button onClick={() => handleVDelete(v)} className="text-stone-300 hover:text-red-500 transition-colors ml-2">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-stone-100 pt-3 space-y-3">
                    {(v.contact_name || v.contact_phone || v.contact_email) && (
                      <p className="text-sm text-stone-500">
                        {v.contact_name && <span className="font-medium text-stone-700">{v.contact_name} </span>}
                        {v.contact_phone && <span>{v.contact_phone} </span>}
                        {v.contact_email && <span>{v.contact_email}</span>}
                      </p>
                    )}
                    {v.notes && <p className="text-sm text-stone-500">{v.notes}</p>}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide">Payments</p>
                        <Button size="sm" variant="outline" onClick={() => { setPDialog(v.id); setPForm(PEMPTY) }}>
                          <Plus className="w-3 h-3 mr-1" /> Add Payment
                        </Button>
                      </div>
                      {v.payments.length === 0 ? (
                        <p className="text-sm text-stone-400">No payments recorded</p>
                      ) : (
                        v.payments.map(p => (
                          <div key={p.id} className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2">
                            <div className="text-sm">
                              <span className="font-medium text-stone-900">₹{p.amount.toLocaleString('en-IN')}</span>
                              {p.method && <span className="text-stone-400 ml-2">via {p.method}</span>}
                              {p.paid_on && <span className="text-stone-400 ml-2">{new Date(p.paid_on).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                              {p.notes && <span className="text-stone-400 ml-2">· {p.notes}</span>}
                            </div>
                            <button onClick={() => handleDeletePayment(v.id, p.id)} className="text-stone-300 hover:text-red-500">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Vendor dialog */}
      <Dialog open={vDialog} onOpenChange={setVDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? 'Edit Vendor' : 'Add Vendor'}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Vendor Name *</Label>
                <Input value={vForm.name} onChange={vf('name')} className="mt-1" />
              </div>
              <div>
                <Label>Category</Label>
                <select value={vForm.category} onChange={vf('category')} className="mt-1 w-full border border-stone-200 rounded-md px-2 py-1.5 text-sm">
                  {VENDOR_CATS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Contact Person</Label>
                <Input value={vForm.contact_name} onChange={vf('contact_name')} className="mt-1" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={vForm.contact_phone} onChange={vf('contact_phone')} className="mt-1" />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={vForm.contact_email} onChange={vf('contact_email')} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Quoted Amount (₹)</Label>
                <Input type="number" value={vForm.quoted_amount} onChange={vf('quoted_amount')} className="mt-1" />
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input type="checkbox" id="contract" checked={vForm.contract_signed} onChange={e => setVForm(prev => ({ ...prev, contract_signed: e.target.checked }))} className="rounded" />
                <Label htmlFor="contract">Contract signed</Label>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <textarea value={vForm.notes} onChange={vf('notes')} rows={2} className="mt-1 w-full border border-stone-200 rounded-md px-3 py-2 text-sm resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVDialog(false)}>Cancel</Button>
            <Button onClick={handleVSave} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {editing ? 'Save' : 'Add Vendor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment dialog */}
      <Dialog open={!!pDialog} onOpenChange={open => !open && setPDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Payment</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Amount (₹) *</Label>
              <Input type="number" value={pForm.amount} onChange={pf('amount')} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Date</Label>
                <Input type="date" value={pForm.paid_on} onChange={pf('paid_on')} className="mt-1" />
              </div>
              <div>
                <Label>Method</Label>
                <select value={pForm.method} onChange={pf('method')} className="mt-1 w-full border border-stone-200 rounded-md px-2 py-1.5 text-sm">
                  {PAY_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={pForm.notes} onChange={pf('notes')} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPDialog(null)}>Cancel</Button>
            <Button onClick={() => pDialog && handleAddPayment(pDialog)} disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
