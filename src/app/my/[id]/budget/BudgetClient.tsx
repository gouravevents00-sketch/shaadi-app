'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Wallet, Bell, Trash2 } from 'lucide-react'
import { addBudgetItem, updateBudgetActual, deleteBudgetItem, updateBudgetPaymentDue } from '../actions'

const BUDGET_CATS = [
  'Venue', 'Catering', 'Decoration', 'Photography & Video', 'Music & Entertainment',
  'Mehandi', 'Makeup & Hair', 'Clothes & Jewellery', 'Invitations', 'Transport', 'Accommodation', 'Other',
]

const BUDGET_PRESETS: Record<string, string[]> = {
  'Venue': ['Venue booking advance', 'Remaining venue payment', 'Lawn/garden rental'],
  'Catering': ['Per plate catering cost', 'Starters & snacks', 'Beverages & bar setup', 'Serving staff'],
  'Decoration': ['Stage & mandap decor', 'Floral arrangements', 'Entrance decor', 'Table centerpieces'],
  'Photography & Video': ['Photography package', 'Videography package', 'Pre-wedding shoot', 'Photo album/prints'],
  'Music & Entertainment': ['DJ setup', 'Dhol & band for baraat', 'Sangeet music', 'Sound system', 'Emcee/anchor'],
  'Mehandi': ['Bridal mehandi', 'Bridesmaids mehandi'],
  'Makeup & Hair': ['Bridal makeup', 'Pre-wedding trial', 'Bridesmaid makeup'],
  'Clothes & Jewellery': ['Bridal lehenga/saree', 'Groom sherwani/suit', 'Jewellery', 'Accessories'],
  'Invitations': ['Printing cost', 'Digital invite design', 'Postage/courier'],
  'Transport': ['Baraat vehicles', 'Guest airport/station pickup', 'Wedding car decoration'],
  'Accommodation': ['Bride family rooms', 'Groom family rooms', 'Outstation guest rooms'],
  'Other': ['Wedding favors/gifts', 'Miscellaneous expenses'],
}

type BudgetItem = {
  id: string
  category: string
  description: string
  estimated: number
  actual: number | null
  status: string
  payment_due: string | null
  advance_paid?: number
  vendor_name?: string | null
}

function fmtAmt(n: number) { return '₹' + n.toLocaleString('en-IN') }
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function isOverdue(due: string | null) { return due ? new Date(due) < new Date() : false }

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
      <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
        <Wallet className="w-8 h-8 text-rose-400" />
      </div>
      <h3 className="font-semibold text-stone-800 mb-2">Budget tracker is Pro</h3>
      <p className="text-sm text-stone-500 mb-6 max-w-xs mx-auto">
        Track estimated vs actual, monitor payment due dates, and stay on top of your wedding spend.
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
  totalBudget: number
  initialBudget: BudgetItem[]
}

export default function BudgetClient({ celebrationId, plan, totalBudget: _totalBudget, initialBudget }: Props) {
  const [isPro, setIsPro] = useState(plan === 'pro')
  const [budget, setBudget] = useState<BudgetItem[]>(initialBudget)
  const [showAddBudget, setShowAddBudget] = useState(false)
  const [budgetForm, setBudgetForm] = useState({ category: '', description: '', estimated: '' })
  const [budgetPresetCat, setBudgetPresetCat] = useState('')
  const [editingPaymentDue, setEditingPaymentDue] = useState<string | null>(null)
  const [paymentDueInput, setPaymentDueInput] = useState('')
  const [isPending, startTransition] = useTransition()

  const totalEstimated = budget.reduce((s, b) => s + (b.actual ?? b.estimated), 0)
  const totalPaid = budget.filter(b => b.status === 'paid').reduce((s, b) => s + (b.actual ?? b.estimated), 0)
  const totalRemaining = budget.filter(b => b.status !== 'paid').reduce((s, b) => s + (b.actual ?? b.estimated), 0)

  function handleAddBudget() {
    if (!budgetForm.description.trim() || !budgetForm.category) return
    startTransition(async () => {
      const res = await addBudgetItem(celebrationId, {
        category: budgetForm.category,
        description: budgetForm.description,
        estimated: parseFloat(budgetForm.estimated) || 0,
      })
      if ('error' in res) { toast.error(res.error); return }
      setBudget(prev => [...prev, {
        id: res.id,
        category: budgetForm.category,
        description: budgetForm.description,
        estimated: parseFloat(budgetForm.estimated) || 0,
        actual: null,
        status: 'planned',
        payment_due: null,
        vendor_name: null,
      }])
      setBudgetForm({ category: '', description: '', estimated: '' })
      setBudgetPresetCat('')
      setShowAddBudget(false)
      toast.success('Budget item added')
    })
  }

  function handleSavePaymentDue(itemId: string) {
    setBudget(prev => prev.map(b => b.id === itemId ? { ...b, payment_due: paymentDueInput || null } : b))
    setEditingPaymentDue(null)
    startTransition(async () => { await updateBudgetPaymentDue(itemId, paymentDueInput || null) })
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
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white border border-stone-100 rounded-xl p-3 text-center">
          <p className="text-base font-bold text-stone-900">{fmtAmt(totalEstimated)}</p>
          <p className="text-[10px] text-stone-400 mt-0.5">Total estimated</p>
        </div>
        <div className="bg-white border border-stone-100 rounded-xl p-3 text-center">
          <p className="text-base font-bold text-emerald-600">{fmtAmt(totalPaid)}</p>
          <p className="text-[10px] text-stone-400 mt-0.5">Paid</p>
        </div>
        <div className="bg-white border border-stone-100 rounded-xl p-3 text-center">
          <p className="text-base font-bold text-amber-600">{fmtAmt(totalRemaining)}</p>
          <p className="text-[10px] text-stone-400 mt-0.5">Remaining</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <p className="text-sm font-semibold text-stone-700">{budget.length} items</p>
        <button
          onClick={() => setShowAddBudget(v => !v)}
          className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add item
        </button>
      </div>

      {showAddBudget && (
        <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Category *</label>
              <select
                value={budgetForm.category}
                onChange={e => { setBudgetForm(f => ({ ...f, category: e.target.value })); setBudgetPresetCat(e.target.value) }}
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none"
              >
                <option value="">Select…</option>
                {BUDGET_CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-stone-500 mb-1 block">Estimated (₹)</label>
              <Input
                type="number"
                min="0"
                value={budgetForm.estimated}
                onChange={e => setBudgetForm(f => ({ ...f, estimated: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-stone-500 mb-1 block">Item *</label>
              <Input
                value={budgetForm.description}
                onChange={e => setBudgetForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g. Mandap decoration"
                autoFocus
              />
            </div>
          </div>
          {budgetPresetCat && BUDGET_PRESETS[budgetPresetCat] && (
            <div>
              <p className="text-[11px] text-stone-400 mb-1.5">Quick add:</p>
              <div className="flex flex-wrap gap-1.5">
                {BUDGET_PRESETS[budgetPresetCat].map(p => (
                  <button
                    key={p}
                    onClick={() => setBudgetForm(f => ({ ...f, description: p }))}
                    className="text-[11px] px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-100 rounded-full hover:bg-rose-100 transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowAddBudget(false); setBudgetPresetCat('') }}
              className="text-xs text-stone-500 px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={handleAddBudget}
              disabled={!budgetForm.description.trim() || !budgetForm.category || isPending}
              className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {budget.length === 0 && !showAddBudget ? (
        <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
          <Wallet className="w-10 h-10 mx-auto mb-3 text-stone-200" />
          <p className="text-stone-500 text-sm">No items yet</p>
          <button onClick={() => setShowAddBudget(true)} className="text-xs text-rose-600 mt-2">
            + Add first item
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {budget.map(item => (
            <div key={item.id} className="bg-white border border-stone-100 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800 truncate">{item.description}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{item.category}</p>
                  {editingPaymentDue === item.id ? (
                    <div className="flex items-center gap-1.5 mt-1">
                      <Input
                        type="date"
                        value={paymentDueInput}
                        onChange={e => setPaymentDueInput(e.target.value)}
                        className="text-xs h-6 py-0 px-1.5 w-32"
                      />
                      <button onClick={() => handleSavePaymentDue(item.id)} className="text-xs text-emerald-600 font-medium">Save</button>
                      <button onClick={() => setEditingPaymentDue(null)} className="text-xs text-stone-400">×</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingPaymentDue(item.id); setPaymentDueInput(item.payment_due || '') }}
                      className={`text-[11px] mt-1 flex items-center gap-1 ${item.payment_due
                        ? (isOverdue(item.payment_due) && item.status !== 'paid' ? 'text-red-500 font-medium' : 'text-stone-400')
                        : 'text-stone-300 hover:text-stone-500'}`}
                    >
                      <Bell className="w-3 h-3" />
                      {item.payment_due ? fmtDate(item.payment_due) : 'Set due date'}
                    </button>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-stone-900">{fmtAmt(item.actual ?? item.estimated)}</p>
                  <select
                    value={item.status}
                    onChange={e => {
                      setBudget(prev => prev.map(b => b.id === item.id ? { ...b, status: e.target.value } : b))
                      startTransition(async () => { await updateBudgetActual(item.id, item.actual ?? item.estimated, e.target.value) })
                    }}
                    onClick={e => e.stopPropagation()}
                    className={`text-[10px] px-1.5 py-0.5 rounded font-medium border-0 focus:outline-none cursor-pointer ${
                      item.status === 'paid' ? 'bg-emerald-100 text-emerald-700'
                      : item.status === 'booked' ? 'bg-blue-100 text-blue-700'
                      : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    <option value="planned">Planned</option>
                    <option value="booked">Booked</option>
                    <option value="paid">Paid ✓</option>
                  </select>
                </div>
                <button
                  onClick={() => {
                    setBudget(prev => prev.filter(b => b.id !== item.id))
                    startTransition(async () => {
                      const res = await deleteBudgetItem(item.id)
                      if ('error' in res) { toast.error(res.error); setBudget(prev => [...prev, item]) }
                    })
                  }}
                  className="text-stone-200 hover:text-red-400 transition-colors ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
