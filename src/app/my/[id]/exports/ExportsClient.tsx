'use client'

import { toast } from 'sonner'
import { Users, Wallet, Store, CalendarDays, ArrowRight } from 'lucide-react'

type Guest = { id: string; name: string; phone: string | null; rsvp_status: string; room_id: string | null; dietary: string | null }
type BudgetItem = { id: string; category: string; description: string; estimated: number; actual: number | null; status: string }
type Vendor = { id: string; name: string; phone: string | null; category: string; contact_name: string | null; total_amount: number; advance_paid: number; status: string }
type CelebFunction = { id: string; name: string; date: string; start_time: string | null; end_time: string | null; venue_space: string | null; expected_count: number | null }

type Props = {
  guests: Guest[]
  budget: BudgetItem[]
  vendors: Vendor[]
  functions: CelebFunction[]
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export default function ExportsClient({ guests, budget, vendors, functions }: Props) {
  function exportGuests() {
    const csv = 'Name,Phone,RSVP,Room Assigned,Dietary\n' +
      guests.map(g => [g.name, g.phone || '', g.rsvp_status, g.room_id ? 'Yes' : 'No', g.dietary || ''].join(',')).join('\n')
    downloadCSV(csv, 'guests.csv')
    toast.success('Downloading guests.csv…')
  }

  function exportBudget() {
    const csv = 'Category,Item,Estimated,Actual,Status\n' +
      budget.map(b => [b.category, b.description, b.estimated, b.actual || '', b.status].join(',')).join('\n')
    downloadCSV(csv, 'budget.csv')
    toast.success('Downloading budget.csv…')
  }

  function exportVendors() {
    const csv = 'Category,Name,Contact,Phone,Total Amount,Advance Paid,Balance,Status\n' +
      vendors.map(v => [
        v.category, v.name, v.contact_name || '', v.phone || '',
        v.total_amount, v.advance_paid, v.total_amount - v.advance_paid, v.status,
      ].join(',')).join('\n')
    downloadCSV(csv, 'vendors.csv')
    toast.success('Downloading vendors.csv…')
  }

  function exportFunctions() {
    if (functions.length === 0) { toast.error('No functions added yet'); return }
    const csv = 'Function,Date,Start Time,End Time,Venue Space,Expected Guests\n' +
      functions.map(f => [f.name, f.date, f.start_time || '', f.end_time || '', f.venue_space || '', f.expected_count || ''].join(',')).join('\n')
    downloadCSV(csv, 'functions.csv')
    toast.success('Downloading functions.csv…')
  }

  const items = [
    { label: 'Guest List', desc: `${guests.length} guests — name, phone, RSVP, room, dietary`, icon: Users, color: 'text-blue-500 bg-blue-50', action: exportGuests },
    { label: 'Budget Sheet', desc: `${budget.length} items — category, estimated, actual, status`, icon: Wallet, color: 'text-emerald-500 bg-emerald-50', action: exportBudget },
    { label: 'Vendor List', desc: `${vendors.length} vendors — contact, amount, balance, status`, icon: Store, color: 'text-purple-500 bg-purple-50', action: exportVendors },
    { label: 'Functions Timeline', desc: `${functions.length} functions — date, time, venue space`, icon: CalendarDays, color: 'text-rose-500 bg-rose-50', action: exportFunctions },
  ]

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-stone-800">Export & Downloads</p>
        <p className="text-xs text-stone-400">Export your data as CSV</p>
      </div>
      <div className="space-y-3">
        {items.map(item => (
          <button
            key={item.label}
            onClick={item.action}
            className="w-full flex items-center gap-4 p-4 bg-white border border-stone-100 rounded-xl hover:border-rose-200 hover:shadow-sm transition-all group"
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="font-semibold text-stone-800 text-sm">{item.label}</p>
              <p className="text-xs text-stone-400 mt-0.5 truncate">{item.desc}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-stone-200 group-hover:text-rose-400 flex-shrink-0 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  )
}
