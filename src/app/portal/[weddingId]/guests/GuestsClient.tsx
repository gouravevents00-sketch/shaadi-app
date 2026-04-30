'use client'

import { useState, useRef, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Users, Upload, Download, Check, X, Loader2, FileText } from 'lucide-react'
import { addPortalGuest, deletePortalGuest, bulkImportPortalGuests } from './actions'

interface Guest {
  id: string; name: string; phone: string | null; email: string | null
  dietary: string | null; plus_count: number; notes: string | null; side: string
}

interface CsvRow { name: string; phone: string; email: string; dietary: string; plus_count: string }

const DIETARY = ['', 'Vegetarian', 'Jain', 'Vegan', 'Non-Vegetarian', 'Gluten Free']

// ─── CSV helpers ─────────────────────────────────────────────────────

function parseCSV(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []
  const header = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''))
  const idx = (key: string) => header.findIndex(h => h.includes(key))
  const ni = idx('name'), pi = idx('phone'), ei = idx('email'), di = idx('diet'), ci = idx('plus')

  return lines.slice(1).map(line => {
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
    return {
      name:       cols[ni]  ?? '',
      phone:      cols[pi]  ?? '',
      email:      cols[ei]  ?? '',
      dietary:    cols[di]  ?? '',
      plus_count: cols[ci]  ?? '0',
    }
  }).filter(r => r.name.trim())
}

function downloadTemplate() {
  const csv = 'Name,Phone,Email,Dietary,Plus Count\nRamesh Sharma,+91 98765 43210,ramesh@email.com,Vegetarian,1\nSunita Verma,+91 91234 56789,,Jain,0'
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'guest_list_template.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ─── Component ───────────────────────────────────────────────────────

export default function GuestsClient({ weddingId, initialGuests, clientSide }: {
  weddingId: string; initialGuests: Guest[]; clientSide: string
}) {
  const [guests, setGuests] = useState<Guest[]>(initialGuests)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', dietary: '', plus_count: '0', notes: '' })

  // CSV state
  const [csvRows, setCsvRows] = useState<CsvRow[] | null>(null)
  const [showCsvPreview, setShowCsvPreview] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [isPending, startTransition] = useTransition()

  const sideLabel = clientSide === 'bride' ? "Bride's side" : clientSide === 'groom' ? "Groom's side" : 'Your side'

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  // ── Manual add ──
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return
    const optimistic: Guest = {
      id: `opt-${Date.now()}`, name: form.name.trim(), phone: form.phone || null,
      email: form.email || null, dietary: form.dietary || null,
      plus_count: parseInt(form.plus_count) || 0, notes: form.notes || null, side: clientSide,
    }
    setGuests(g => [optimistic, ...g])
    setForm({ name: '', phone: '', email: '', dietary: '', plus_count: '0', notes: '' })
    setShowForm(false)
    const res = await addPortalGuest(weddingId, {
      name: optimistic.name, phone: optimistic.phone ?? undefined,
      email: optimistic.email ?? undefined, dietary: optimistic.dietary ?? undefined,
      plus_count: optimistic.plus_count,
    })
    if ('error' in res) {
      toast.error(res.error)
      setGuests(g => g.filter(x => x.id !== optimistic.id))
    } else {
      setGuests(g => g.map(x => x.id === optimistic.id ? { ...x, id: res.id } : x))
    }
  }

  // ── Delete ──
  async function handleDelete(guest: Guest) {
    setGuests(g => g.filter(x => x.id !== guest.id))
    const res = await deletePortalGuest(weddingId, guest.id)
    if ('error' in res) { toast.error(res.error); setGuests(g => [...g, guest]) }
  }

  // ── CSV parse ──
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const rows = parseCSV(ev.target?.result as string)
      if (rows.length === 0) { toast.error('No valid rows found. Check CSV format.'); return }
      setCsvRows(rows)
      setShowCsvPreview(true)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── CSV import ──
  function handleImport() {
    if (!csvRows?.length) return
    startTransition(async () => {
      const res = await bulkImportPortalGuests(weddingId, csvRows.map(r => ({
        name: r.name, phone: r.phone || undefined, email: r.email || undefined,
        dietary: r.dietary || undefined, plus_count: parseInt(r.plus_count) || 0,
      })))
      if ('error' in res) { toast.error(res.error); return }
      toast.success(`${res.count} guests imported!`)
      setShowCsvPreview(false)
      setCsvRows(null)
      // Reload page to show new guests
      window.location.reload()
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-stone-900">Guest List</h2>
          <p className="text-sm text-stone-400 mt-0.5">
            <span className="font-medium text-stone-600">{sideLabel}</span> · {guests.length} added
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 text-stone-600 text-xs rounded-lg hover:bg-stone-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Template
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 border border-stone-200 text-stone-600 text-xs rounded-lg hover:bg-stone-50 transition-colors">
            <Upload className="w-3.5 h-3.5" /> Upload CSV
          </button>
          <button onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-700 text-white text-xs rounded-lg hover:bg-rose-800 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
      </div>

      {/* CSV format hint */}
      <div className="flex items-start gap-2 bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs text-stone-500">
        <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-stone-400" />
        <span>
          Download the <button onClick={downloadTemplate} className="text-rose-600 underline">CSV template</button>, fill it in Excel/Sheets, then upload. Columns: <span className="font-mono bg-stone-100 px-1 rounded">Name, Phone, Email, Dietary, Plus Count</span>
        </span>
      </div>

      {/* CSV Preview */}
      {showCsvPreview && csvRows && (
        <div className="bg-white border border-emerald-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-emerald-50 px-4 py-3 flex items-center justify-between border-b border-emerald-100">
            <div>
              <p className="text-sm font-semibold text-emerald-800">{csvRows.length} guests ready to import</p>
              <p className="text-xs text-emerald-600 mt-0.5">Review below and confirm</p>
            </div>
            <button onClick={() => { setShowCsvPreview(false); setCsvRows(null) }}>
              <X className="w-4 h-4 text-stone-400" />
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-stone-50">
            {csvRows.map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center text-xs font-medium text-stone-500 flex-shrink-0">{i + 1}</div>
                <span className="font-medium text-stone-800 flex-1">{r.name}</span>
                {r.phone && <span className="text-xs text-stone-400">{r.phone}</span>}
                {r.dietary && <span className="text-xs bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded">{r.dietary}</span>}
                {parseInt(r.plus_count) > 0 && <span className="text-xs text-stone-400">+{r.plus_count}</span>}
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-stone-50 border-t border-stone-100 flex gap-2 justify-end">
            <button onClick={() => { setShowCsvPreview(false); setCsvRows(null) }}
              className="text-sm text-stone-500 px-3 py-1.5 rounded-lg hover:bg-stone-100">Cancel</button>
            <button onClick={handleImport} disabled={isPending}
              className="flex items-center gap-1.5 text-sm bg-emerald-600 text-white px-4 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
              {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Import {csvRows.length} guests
            </button>
          </div>
        </div>
      )}

      {/* Manual add form */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Name *</label>
              <input required value={form.name} onChange={e => setF('name', e.target.value)}
                placeholder="Full name" autoFocus
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Phone</label>
              <input value={form.phone} onChange={e => setF('phone', e.target.value)}
                placeholder="+91 98765 43210" type="tel"
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Email</label>
              <input value={form.email} onChange={e => setF('email', e.target.value)} placeholder="optional"
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200" />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Dietary preference</label>
              <select value={form.dietary} onChange={e => setF('dietary', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none">
                {DIETARY.map(d => <option key={d} value={d}>{d || 'No preference'}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Plus ones</label>
              <input type="number" min="0" max="10" value={form.plus_count} onChange={e => setF('plus_count', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 mb-1 block">Notes</label>
              <input value={form.notes} onChange={e => setF('notes', e.target.value)}
                placeholder="e.g. Mama ji, wheelchair needed"
                className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="text-sm text-stone-500 px-3 py-1.5 hover:text-stone-700">Cancel</button>
            <button type="submit" className="text-sm bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800">Add guest</button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {guests.length === 0 && !showForm && !showCsvPreview && (
        <div className="text-center py-12 border border-dashed border-stone-200 rounded-xl">
          <Users className="w-10 h-10 mx-auto mb-3 text-stone-200" />
          <p className="text-sm font-semibold text-stone-600">No guests added yet</p>
          <p className="text-xs text-stone-400 mt-1 mb-4">Upload a CSV or add guests one by one</p>
          <div className="flex gap-2 justify-center">
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-xs px-3 py-2 border border-stone-200 rounded-lg text-stone-600 hover:bg-stone-50">
              <Download className="w-3.5 h-3.5" /> Download template
            </button>
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs px-3 py-2 bg-rose-700 text-white rounded-lg hover:bg-rose-800">
              <Upload className="w-3.5 h-3.5" /> Upload CSV
            </button>
          </div>
        </div>
      )}

      {/* Guest list */}
      {guests.length > 0 && (
        <div className="bg-white border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100">
          {guests.map(g => (
            <div key={g.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-semibold text-rose-600">{g.name[0]?.toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-800">
                  {g.name}{g.plus_count > 0 && <span className="text-xs text-stone-400 ml-1">+{g.plus_count}</span>}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {g.phone && <span className="text-xs text-stone-400">{g.phone}</span>}
                  {g.dietary && <span className="text-xs bg-stone-100 text-stone-400 px-1.5 py-0.5 rounded">{g.dietary}</span>}
                  {g.notes && <span className="text-xs text-stone-300 truncate max-w-28">{g.notes}</span>}
                </div>
              </div>
              <button onClick={() => handleDelete(g)} className="text-stone-200 hover:text-red-400 transition-colors flex-shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
