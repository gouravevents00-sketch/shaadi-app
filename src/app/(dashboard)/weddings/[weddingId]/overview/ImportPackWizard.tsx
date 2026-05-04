'use client'

import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import {
  Download, Upload, CheckCircle2, AlertCircle, FileSpreadsheet,
  Users, ShoppingBag, IndianRupee, X, ArrowRight, Sparkles, RefreshCw,
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { bulkImportPack, getEventCounts, type GuestRow, type VendorRow, type BudgetRow, type ImportPackResult } from './importPackActions'

// ─── Parsers ──────────────────────────────────────────────────────────────────

// Smart detection: new template has headers at row 4 (range:3), old template at row 1 (range:0).
// Try row 4 first; fall back to row 1 if known header columns are missing.
function smartRows(ws: XLSX.WorkSheet, knownHeaders: string[]): Record<string, string | number>[] {
  for (const range of [3, 0]) {
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number>>(ws, { defval: '', range })
    if (rows.length > 0 && knownHeaders.some(h => h in rows[0])) return rows
  }
  return []
}

function parseGuests(ws: XLSX.WorkSheet): GuestRow[] {
  const rows = smartRows(ws, ['Name', 'Name *', 'Phone', 'Side'])
  return (rows as Record<string, string>[]).map(r => ({
    name:          String(r['Name'] || r['Name *'] || ''),
    phone:         String(r['Phone'] || ''),
    email:         String(r['Email'] || ''),
    side:          String(r['Side'] || r['Side *'] || 'Both').toLowerCase().replace('-', '_'),
    is_vip:        ['yes','true','1'].includes(String(r['VIP'] || 'no').toLowerCase()),
    dietary:       String(r['Dietary'] || 'Veg').toLowerCase().replace('-', '_'),
    dietary_notes: String(r['Dietary Notes'] || ''),
    family_group:  String(r['Family Group'] || ''),
    plus_count:    Number(r['Plus Count'] || 0),
    notes:         String(r['Notes'] || ''),
  })).filter(r => r.name.trim())
}

function parseVendors(ws: XLSX.WorkSheet): VendorRow[] {
  const rows = smartRows(ws, ['Category', 'Category *', 'Vendor Name', 'Vendor Name *'])
  return rows.map(r => ({
    category:     String(r['Category'] || r['Category *'] || ''),
    name:         String(r['Vendor Name'] || r['Vendor Name *'] || ''),
    contact_name: String(r['Contact Person'] || ''),
    phone:        String(r['Phone'] || ''),
    email:        String(r['Email'] || ''),
    status:       String(r['Status'] || 'Enquired').toLowerCase(),
    total_amount: Number(r['Total Amount (₹)'] ?? r['Total Amount'] ?? 0),
    paid_amount:  Number(r['Advance Paid (₹)'] ?? r['Advance Paid'] ?? 0),
    notes:        String(r['Notes'] || ''),
  })).filter(r => r.category.trim() && r.name.trim())
}

function parseBudget(ws: XLSX.WorkSheet): BudgetRow[] {
  const rows = smartRows(ws, ['Category', 'Category *', 'Item', 'Item *'])
  return rows.map(r => ({
    category:    String(r['Category'] || r['Category *'] || ''),
    item:        String(r['Item'] || r['Item *'] || ''),
    estimated:   Number(r['Estimated (₹)'] ?? r['Estimated'] ?? 0),
    actual:      Number(r['Vendor Quote (₹)'] ?? r['Actual (₹)'] ?? r['Actual'] ?? 0),
    vendor_name: String(r['Vendor Name'] || ''),
    notes:       String(r['Notes'] || ''),
  })).filter(r => r.category.trim() && r.item.trim())
}

function parseWorkbook(file: File): Promise<{ guests: GuestRow[]; vendors: VendorRow[]; budget: BudgetRow[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })

        // Find sheets by name (emoji-prefixed or plain)
        const guestSheet  = wb.Sheets[wb.SheetNames.find(n => n.includes('Guest') || n.includes('guest')) ?? '']
        const vendorSheet = wb.Sheets[wb.SheetNames.find(n => n.includes('Vendor') || n.includes('vendor')) ?? '']
        const budgetSheet = wb.Sheets[wb.SheetNames.find(n => n.includes('Budget') || n.includes('budget')) ?? '']

        resolve({
          guests:  guestSheet  ? parseGuests(guestSheet)   : [],
          vendors: vendorSheet ? parseVendors(vendorSheet) : [],
          budget:  budgetSheet ? parseBudget(budgetSheet)  : [],
        })
      } catch {
        reject(new Error('Could not read file. Make sure it is a .xlsx file.'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

type Tab = 'guests' | 'vendors' | 'budget'

const TAB_META: Record<Tab, { label: string; icon: React.ElementType; color: string }> = {
  guests:  { label: 'Guests',  icon: Users,        color: 'text-rose-600' },
  vendors: { label: 'Vendors', icon: ShoppingBag,  color: 'text-blue-600' },
  budget:  { label: 'Budget',  icon: IndianRupee,  color: 'text-emerald-600' },
}

function PreviewGuests({ rows }: { rows: GuestRow[] }) {
  if (!rows.length) return <p className="text-sm text-stone-400 py-4 text-center">No guest rows found in file</p>
  return (
    <div className="overflow-auto max-h-72 border border-stone-200 rounded-lg">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-stone-50 border-b border-stone-200">
          <tr>
            {['#','Name','Phone','Side','VIP','Dietary','Family Group'].map(h => (
              <th key={h} className="text-left px-3 py-2 font-medium text-stone-500 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
              <td className="px-3 py-2 text-stone-400">{i+1}</td>
              <td className="px-3 py-2 font-medium text-stone-900">{r.name || <span className="text-red-500">MISSING</span>}</td>
              <td className="px-3 py-2 text-stone-500">{r.phone || '—'}</td>
              <td className="px-3 py-2 capitalize">{r.side}</td>
              <td className="px-3 py-2">{r.is_vip ? '⭐' : '—'}</td>
              <td className="px-3 py-2 capitalize">{r.dietary}</td>
              <td className="px-3 py-2 text-stone-500">{r.family_group || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PreviewVendors({ rows }: { rows: VendorRow[] }) {
  if (!rows.length) return <p className="text-sm text-stone-400 py-4 text-center">No vendor rows found in file</p>
  return (
    <div className="overflow-auto max-h-72 border border-stone-200 rounded-lg">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-stone-50 border-b border-stone-200">
          <tr>
            {['#','Category','Vendor Name','Contact','Status','Total (₹)','Paid (₹)'].map(h => (
              <th key={h} className="text-left px-3 py-2 font-medium text-stone-500 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
              <td className="px-3 py-2 text-stone-400">{i+1}</td>
              <td className="px-3 py-2 text-stone-600">{r.category}</td>
              <td className="px-3 py-2 font-medium text-stone-900">{r.name}</td>
              <td className="px-3 py-2 text-stone-500">{r.contact_name || r.phone || '—'}</td>
              <td className="px-3 py-2 capitalize">{r.status}</td>
              <td className="px-3 py-2 text-stone-700">{r.total_amount ? `₹${r.total_amount.toLocaleString('en-IN')}` : '—'}</td>
              <td className="px-3 py-2 text-emerald-600">{r.paid_amount ? `₹${r.paid_amount.toLocaleString('en-IN')}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function PreviewBudget({ rows }: { rows: BudgetRow[] }) {
  if (!rows.length) return <p className="text-sm text-stone-400 py-4 text-center">No budget rows found in file</p>
  const total = rows.reduce((s, r) => s + (r.estimated || 0), 0)
  return (
    <div className="space-y-2">
      <div className="overflow-auto max-h-64 border border-stone-200 rounded-lg">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-stone-50 border-b border-stone-200">
            <tr>
              {['#','Category','Item','Estimated (₹)','Actual (₹)','Vendor'].map(h => (
                <th key={h} className="text-left px-3 py-2 font-medium text-stone-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                <td className="px-3 py-2 text-stone-400">{i+1}</td>
                <td className="px-3 py-2 text-stone-600">{r.category}</td>
                <td className="px-3 py-2 text-stone-900">{r.item}</td>
                <td className="px-3 py-2 font-medium">₹{(r.estimated||0).toLocaleString('en-IN')}</td>
                <td className="px-3 py-2 text-stone-500">{r.actual ? `₹${r.actual.toLocaleString('en-IN')}` : '—'}</td>
                <td className="px-3 py-2 text-stone-500">{r.vendor_name || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-stone-500 px-1">Total estimated: <span className="font-semibold text-stone-700">₹{total.toLocaleString('en-IN')}</span></p>
    </div>
  )
}

function ResultCard({ label, result, icon: Icon }: {
  label: string
  result: { imported: number; updated?: number; skipped: number; errors: string[] }
  icon: React.ElementType
}) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-stone-500" />
        <span className="text-sm font-semibold text-stone-700">{label}</span>
      </div>
      {result.imported > 0 && (
        <div className="flex items-center gap-2 text-emerald-700 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {result.imported} new
        </div>
      )}
      {(result.updated ?? 0) > 0 && (
        <div className="flex items-center gap-2 text-blue-600 text-xs">
          <RefreshCw className="w-3.5 h-3.5" />
          {result.updated} updated
        </div>
      )}
      {result.skipped > 0 && (
        <div className="flex items-center gap-2 text-amber-600 text-xs">
          <AlertCircle className="w-3.5 h-3.5" />
          {result.skipped} skipped
        </div>
      )}
      {result.errors.slice(0, 2).map((e, i) => (
        <p key={i} className="text-xs text-red-500">{e}</p>
      ))}
      {result.imported === 0 && (result.updated ?? 0) === 0 && result.skipped === 0 && (
        <p className="text-xs text-stone-400">Nothing to import</p>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type Step = 'idle' | 'preview' | 'importing' | 'done'

export default function ImportPackWizard({ weddingId }: { weddingId: string }) {
  const [open, setOpen]         = useState(false)
  const [step, setStep]         = useState<Step>('idle')
  const [tab, setTab]           = useState<Tab>('guests')
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState('')
  const [guests, setGuests]     = useState<GuestRow[]>([])
  const [vendors, setVendors]   = useState<VendorRow[]>([])
  const [budget, setBudget]     = useState<BudgetRow[]>([])
  const [result, setResult]     = useState<ImportPackResult | null>(null)
  const [existing, setExisting] = useState<{ guests: number; vendors: number; budget: number } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep('idle'); setGuests([]); setVendors([]); setBudget([]); setResult(null); setFileName('')
  }

  async function onOpen() {
    setOpen(true); reset()
    const counts = await getEventCounts(weddingId)
    setExisting(counts)
  }

  async function handleFile(file: File) {
    try {
      const parsed = await parseWorkbook(file)
      setGuests(parsed.guests)
      setVendors(parsed.vendors)
      setBudget(parsed.budget)
      setFileName(file.name)
      setStep('preview')
      // Auto-select first non-empty tab
      if (parsed.guests.length)       setTab('guests')
      else if (parsed.vendors.length) setTab('vendors')
      else if (parsed.budget.length)  setTab('budget')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse file')
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.name.endsWith('.xlsx')) handleFile(file)
    else toast.error('Please drop a .xlsx file')
  }, [])

  async function handleImport() {
    setStep('importing')
    const res = await bulkImportPack(weddingId, guests, vendors, budget)
    if ('error' in res) {
      toast.error(res.error)
      setStep('preview')
      return
    }
    setResult(res)
    setStep('done')
    const total = res.guests.imported + res.vendors.imported + res.budget.imported
    if (total > 0) toast.success(`${total} records imported!`)
  }

  const totalRows = guests.length + vendors.length + budget.length

  return (
    <>
      <button
        onClick={onOpen}
        className="flex items-center gap-2 text-xs bg-rose-700 hover:bg-rose-800 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
      >
        <FileSpreadsheet className="w-3.5 h-3.5" />
        Import from Excel
      </button>

      <Dialog open={open} onOpenChange={v => { setOpen(v); if (!v) reset() }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-stone-100 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-rose-600" />
              Event Setup Pack — Import everything at once
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

            {/* ── STEP: IDLE ── */}
            {step === 'idle' && (
              <>
                {/* Existing data banner — show if event already has data */}
                {existing && (existing.guests > 0 || existing.vendors > 0 || existing.budget > 0) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-3">
                    <RefreshCw className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-blue-800">This event already has data</p>
                      <p className="text-xs text-blue-600 mt-0.5">
                        {existing.guests} guests · {existing.vendors} vendors · {existing.budget} budget items — uploading will only add new rows or update existing ones. Nothing gets deleted.
                      </p>
                    </div>
                    <a
                      href={`/api/weddings/${weddingId}/export`}
                      download
                      className="flex-shrink-0 flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg font-semibold"
                    >
                      <Download className="w-3 h-3" /> Export current
                    </a>
                  </div>
                )}

                {/* Download template */}
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                    <Download className="w-5 h-5 text-stone-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-stone-800">1. Download personalized template</p>
                    <p className="text-xs text-stone-500 mt-0.5">Pre-filled with your ceremony vendors. Dropdowns for every choice. Live count formulas.</p>
                  </div>
                  <a
                    href={`/api/weddings/${weddingId}/import/template`}
                    download
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs bg-stone-900 hover:bg-stone-700 text-white font-semibold px-3 py-1.5 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </a>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="w-4 h-4 text-stone-300 rotate-90" />
                </div>

                {/* Upload */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? 'border-rose-400 bg-rose-50' : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'}`}
                >
                  <Upload className="w-8 h-8 text-stone-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-stone-700">2. Upload the filled file</p>
                  <p className="text-xs text-stone-400 mt-1">Drag & drop your .xlsx file here, or click to browse</p>
                  <input ref={fileRef} type="file" accept=".xlsx" className="hidden" onChange={handleInputChange} />
                </div>

                <div className="flex items-start gap-2 text-xs text-stone-400 bg-stone-50 rounded-lg p-3">
                  <FileSpreadsheet className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <p>3 sheets: Guests · Vendors · Budget. Fill only what you have — sample rows are ignored. Safe to re-upload anytime: existing data is updated, nothing is deleted.</p>
                </div>
              </>
            )}

            {/* ── STEP: PREVIEW ── */}
            {step === 'preview' && (
              <>
                <div className="flex items-center gap-2 text-sm text-stone-600">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-medium">{fileName}</span>
                  <span className="text-stone-400">— {totalRows} rows found</span>
                  <button onClick={reset} className="ml-auto text-stone-400 hover:text-stone-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Summary chips */}
                <div className="flex gap-2 flex-wrap">
                  {([['guests', guests.length], ['vendors', vendors.length], ['budget', budget.length]] as [Tab, number][]).map(([t, count]) => {
                    const meta = TAB_META[t]
                    const Icon = meta.icon
                    return (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${tab === t ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'}`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${tab === t ? 'text-white' : meta.color}`} />
                        {meta.label} <span className={tab === t ? 'text-stone-300' : 'text-stone-400'}>({count})</span>
                      </button>
                    )
                  })}
                </div>

                {tab === 'guests'  && <PreviewGuests  rows={guests}  />}
                {tab === 'vendors' && <PreviewVendors rows={vendors} />}
                {tab === 'budget'  && <PreviewBudget  rows={budget}  />}

                {totalRows === 0 && (
                  <div className="flex items-center gap-2 bg-amber-50 text-amber-700 rounded-lg p-3 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    No data found. Make sure you filled the Guests, Vendors, or Budget sheets.
                  </div>
                )}
              </>
            )}

            {/* ── STEP: IMPORTING ── */}
            {step === 'importing' && (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center mx-auto animate-pulse">
                  <Sparkles className="w-6 h-6 text-rose-600" />
                </div>
                <p className="text-sm font-medium text-stone-700">Importing your data…</p>
                <p className="text-xs text-stone-400">This will only take a moment</p>
              </div>
            )}

            {/* ── STEP: DONE ── */}
            {step === 'done' && result && (
              <>
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 rounded-xl px-4 py-3">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-semibold">
                    Done — {result.guests.imported + result.vendors.imported + result.budget.imported} new,{' '}
                    {(result.guests.updated ?? 0) + (result.vendors.updated ?? 0) + (result.budget.updated ?? 0)} updated,{' '}
                    0 deleted
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <ResultCard label="Guests"  result={result.guests}  icon={Users} />
                  <ResultCard label="Vendors" result={result.vendors} icon={ShoppingBag} />
                  <ResultCard label="Budget"  result={result.budget}  icon={IndianRupee} />
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-stone-100 flex-shrink-0 flex justify-between gap-3">
            {step === 'idle' && (
              <Button variant="outline" onClick={() => setOpen(false)} className="ml-auto">Close</Button>
            )}
            {step === 'preview' && (
              <>
                <Button variant="outline" onClick={reset}>← Back</Button>
                <Button
                  onClick={handleImport}
                  disabled={totalRows === 0}
                  className="bg-rose-700 hover:bg-rose-800"
                >
                  Import {totalRows} rows →
                </Button>
              </>
            )}
            {step === 'done' && (
              <Button
                onClick={() => { setOpen(false); window.location.reload() }}
                className="ml-auto bg-stone-900 hover:bg-stone-800"
              >
                Done — View event
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
