'use client'

import { Download, Users, Wallet, CheckSquare, ShoppingBag, TrendingUp } from 'lucide-react'

interface Guest {
  id: string; name: string; phone: string | null; email: string | null
  side: string; is_vip: boolean; dietary: string; dietary_notes: string | null
  plus_count: number; rsvp_submitted_at: string | null; needs_pickup: boolean
  arrival_mode: string | null; notes: string | null
}
interface GuestEvent { guest_id: string; event_id: string; rsvp_status: string }
interface Event { id: string; name: string; date: string; start_time: string | null; type: string }
interface Vendor { name: string; category: string; status: string; total_amount: number; paid_amount: number; phone: string | null; notes: string | null }
interface BudgetItem { description: string; estimated: number; quoted: number; paid: number; due_date: string | null; category: string }
interface CheckItem { title: string; category: string; side: string; status: string; due_date: string | null }

function escCsv(v: string | number | null | boolean | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
  return s
}

type CsvCell = string | number | null | boolean | undefined
function toCsv(rows: CsvCell[][]): string {
  return rows.map(r => r.map(escCsv).join(',')).join('\n')
}

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

function fmtINR(n: number) {
  return n.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
}

interface Props {
  weddingId: string
  weddingTitle: string
  weddingDate: string | null
  budgetTotal: number
  guests: Guest[]
  guestEvents: GuestEvent[]
  events: Event[]
  vendors: Vendor[]
  budgetItems: BudgetItem[]
  checklist: CheckItem[]
}

export default function ReportsClient({
  weddingTitle, guests, guestEvents, events, vendors, budgetItems, checklist, budgetTotal
}: Props) {
  // Stats
  const totalPax = guests.reduce((s, g) => s + 1 + (g.plus_count ?? 0), 0)
  const rsvped = guests.filter(g => g.rsvp_submitted_at).length
  const totalBudget = budgetItems.reduce((s, i) => s + (i.estimated ?? 0), 0)
  const totalPaid = budgetItems.reduce((s, i) => s + (i.paid ?? 0), 0)
  const totalOutstanding = budgetItems.reduce((s, i) => s + Math.max(0, (i.quoted ?? i.estimated ?? 0) - (i.paid ?? 0)), 0)
  const checkDone = checklist.filter(c => c.status === 'done').length

  // ── Guest CSV ────────────────────────────────────────────────────
  function downloadGuestList() {
    const eventMap = Object.fromEntries(events.map(e => [e.id, e.name]))
    const geByGuest: Record<string, GuestEvent[]> = {}
    for (const ge of guestEvents) {
      if (!geByGuest[ge.guest_id]) geByGuest[ge.guest_id] = []
      geByGuest[ge.guest_id].push(ge)
    }
    const header: CsvCell[] = ['Name', 'Side', 'Phone', 'Email', 'VIP', 'Dietary', 'Dietary Notes', '+Plus', 'RSVP', 'Pickup Needed', 'Arrival Mode', 'Notes', ...events.map(e => `${e.name} RSVP`)]
    const rows: CsvCell[][] = guests.map(g => [
      g.name, g.side, g.phone ?? '', g.email ?? '',
      g.is_vip ? 'Yes' : 'No',
      g.dietary, g.dietary_notes ?? '',
      g.plus_count ?? 0,
      g.rsvp_submitted_at ? 'Confirmed' : 'Pending',
      g.needs_pickup ? 'Yes' : 'No',
      g.arrival_mode ?? '',
      g.notes ?? '',
      ...events.map(e => {
        const ge = (geByGuest[g.id] ?? []).find(x => x.event_id === e.id)
        return ge ? ge.rsvp_status : 'not invited'
      }),
    ])
    download(`${weddingTitle} - Guest List.csv`, toCsv([header, ...rows]))
  }

  // ── Budget CSV ────────────────────────────────────────────────────
  function downloadBudget() {
    const header: CsvCell[] = ['Category', 'Description', 'Estimated (₹)', 'Quoted (₹)', 'Paid (₹)', 'Outstanding (₹)', 'Due Date']
    const rows: CsvCell[][] = budgetItems.map(i => [
      i.category, i.description,
      i.estimated, i.quoted,
      i.paid,
      Math.max(0, (i.quoted || i.estimated || 0) - (i.paid || 0)),
      i.due_date ?? '',
    ])
    const summary = ['', 'TOTAL', totalBudget, '', totalPaid, totalOutstanding, '']
    download(`${weddingTitle} - Budget.csv`, toCsv([header, ...rows, summary]))
  }

  // ── Vendor CSV ────────────────────────────────────────────────────
  function downloadVendors() {
    const header: CsvCell[] = ['Name', 'Category', 'Status', 'Total Amount (₹)', 'Paid (₹)', 'Balance (₹)', 'Phone', 'Notes']
    const rows: CsvCell[][] = vendors.map(v => [
      v.name, v.category, v.status,
      v.total_amount, v.paid_amount,
      Math.max(0, v.total_amount - v.paid_amount),
      v.phone ?? '', v.notes ?? '',
    ])
    download(`${weddingTitle} - Vendors.csv`, toCsv([header, ...rows]))
  }

  // ── Checklist CSV ─────────────────────────────────────────────────
  function downloadChecklist() {
    const header: CsvCell[] = ['Category', 'Task', 'Side', 'Status', 'Due Date']
    const rows: CsvCell[][] = checklist.map(c => [c.category, c.title, c.side, c.status, c.due_date ?? ''])
    download(`${weddingTitle} - Checklist.csv`, toCsv([header, ...rows]))
  }

  const exports = [
    {
      icon: Users,
      label: 'Guest List',
      desc: `${guests.length} guests · ${totalPax} pax · ${rsvped} RSVP'd`,
      action: downloadGuestList,
      color: 'text-rose-600 bg-rose-50',
    },
    {
      icon: Wallet,
      label: 'Budget',
      desc: `${budgetItems.length} items · ${fmtINR(totalPaid)} paid · ${fmtINR(totalOutstanding)} outstanding`,
      action: downloadBudget,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      icon: ShoppingBag,
      label: 'Vendors',
      desc: `${vendors.length} vendors · ${vendors.filter(v => v.status === 'confirmed' || v.status === 'booked').length} confirmed`,
      action: downloadVendors,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      icon: CheckSquare,
      label: 'Checklist',
      desc: `${checklist.length} tasks · ${checkDone} done`,
      action: downloadChecklist,
      color: 'text-amber-600 bg-amber-50',
    },
  ]

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Reports & Export</h1>
        <p className="text-sm text-stone-400 mt-0.5">Download your wedding data as CSV files</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-stone-400 font-medium mb-1">Total guests</p>
          <p className="text-2xl font-bold text-stone-900">{totalPax}<span className="text-base font-normal text-stone-400"> pax</span></p>
          <p className="text-xs text-stone-400 mt-1">{guests.length} bookings · {rsvped} RSVP'd</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4">
          <p className="text-xs text-stone-400 font-medium mb-1">Budget used</p>
          <p className="text-2xl font-bold text-stone-900">{fmtINR(totalPaid)}</p>
          <p className="text-xs text-stone-400 mt-1">{fmtINR(totalOutstanding)} outstanding</p>
        </div>
      </div>

      {/* Breakdowns */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Breakdown</p>

        {/* RSVP by side */}
        {guests.length > 0 && (() => {
          const brideTotal = guests.filter(g => g.side === 'bride').reduce((s, g) => s + 1 + (g.plus_count ?? 0), 0)
          const groomTotal = guests.filter(g => g.side === 'groom').reduce((s, g) => s + 1 + (g.plus_count ?? 0), 0)
          const total = brideTotal + groomTotal || 1
          return (
            <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium text-stone-600">Guests by side</p>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                <div className="bg-rose-400 rounded-l-full" style={{ width: `${(brideTotal / total) * 100}%` }} />
                <div className="bg-blue-400 rounded-r-full flex-1" />
              </div>
              <div className="flex justify-between text-xs text-stone-500">
                <span><span className="inline-block w-2 h-2 rounded-full bg-rose-400 mr-1" />Bride side: {brideTotal} pax</span>
                <span><span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-1" />Groom side: {groomTotal} pax</span>
              </div>
            </div>
          )
        })()}

        {/* Vendor status */}
        {vendors.length > 0 && (() => {
          const groups = [
            { label: 'Paid', color: 'bg-emerald-400', count: vendors.filter(v => v.status === 'paid').length },
            { label: 'Confirmed', color: 'bg-amber-400', count: vendors.filter(v => v.status === 'confirmed').length },
            { label: 'Booked', color: 'bg-blue-400', count: vendors.filter(v => v.status === 'booked').length },
            { label: 'Enquired', color: 'bg-stone-300', count: vendors.filter(v => v.status === 'enquired').length },
          ].filter(g => g.count > 0)
          return (
            <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium text-stone-600">Vendor status</p>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden">
                {groups.map((g, i) => (
                  <div key={g.label} className={`${g.color} ${i === 0 ? 'rounded-l-full' : ''} ${i === groups.length - 1 ? 'rounded-r-full' : ''}`}
                    style={{ width: `${(g.count / vendors.length) * 100}%` }} />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {groups.map(g => (
                  <span key={g.label} className="text-xs text-stone-500">
                    <span className={`inline-block w-2 h-2 rounded-full ${g.color} mr-1`} />{g.label}: {g.count}
                  </span>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Checklist progress by category */}
        {checklist.length > 0 && (() => {
          const cats = [...new Set(checklist.map(c => c.category))].slice(0, 6)
          return (
            <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium text-stone-600">Checklist by category</p>
              <div className="space-y-1.5">
                {cats.map(cat => {
                  const items = checklist.filter(c => c.category === cat)
                  const done = items.filter(c => c.status === 'done').length
                  const pct = Math.round((done / items.length) * 100)
                  return (
                    <div key={cat} className="flex items-center gap-2">
                      <p className="text-xs text-stone-500 w-32 truncate flex-shrink-0">{cat}</p>
                      <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs text-stone-400 w-10 text-right flex-shrink-0">{done}/{items.length}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}
      </div>

      {/* Export cards */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Download</p>
        <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
          {exports.map(({ icon: Icon, label, desc, action, color }) => (
            <div key={label} className="flex items-center gap-4 px-4 py-3.5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800">{label}</p>
                <p className="text-xs text-stone-400">{desc}</p>
              </div>
              <button onClick={action}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-stone-600 border border-stone-200 rounded-lg hover:bg-stone-50 flex-shrink-0">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-stone-400 text-center pb-2">
        Files are generated fresh from live data each time you download
      </p>
    </div>
  )
}
