'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Upload, Download, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { bulkImportGuests, type ImportRow } from './importActions'

const SIDE_COLORS: Record<string, string> = {
  bride: 'bg-pink-50 text-pink-700',
  groom: 'bg-blue-50 text-blue-700',
  both: 'bg-purple-50 text-purple-700',
  shared: 'bg-stone-100 text-stone-600',
  neutral: 'bg-stone-100 text-stone-500',
}

// Template download now uses the smart API (exceljs with dropdowns, frozen header, live counts)
// weddingId is passed via prop so the correct API URL is used
function downloadSmartTemplate(weddingId: string) {
  const a = document.createElement('a')
  a.href = `/api/weddings/${weddingId}/import/template`
  a.download = 'event-setup-pack.xlsx'
  a.click()
}

function parseExcel(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames.find(n => n.toLowerCase().includes('guest')) ?? wb.SheetNames[0]]

        // Smart detection: new template has headers at row 4 (range:3); old at row 1 (range:0)
        let rows: Record<string, string>[] = []
        for (const range of [3, 0]) {
          const r = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '', range })
          if (r.length > 0 && ('Name' in r[0] || 'Name *' in r[0] || 'Phone' in r[0])) { rows = r; break }
        }

        const parsed: ImportRow[] = rows.map(row => ({
          name:          String(row['Name'] || row['Name *'] || row['name'] || ''),
          phone:         String(row['Phone'] || row['phone'] || ''),
          email:         String(row['Email'] || row['email'] || ''),
          side:          String(row['Side'] || row['Side *'] || row['side'] || 'both').toLowerCase(),
          is_vip:        ['yes', 'true', '1', 'y'].includes(String(row['VIP'] || row['vip'] || 'no').toLowerCase()),
          dietary:       String(row['Dietary'] || row['dietary'] || 'veg').toLowerCase(),
          dietary_notes: String(row['Dietary Notes'] || row['dietary_notes'] || ''),
          family_group:  String(row['Family Group'] || row['family_group'] || ''),
          plus_count:    Number(row['Plus Count'] || row['plus_count'] || 0),
          notes:         String(row['Notes'] || row['notes'] || ''),
        })).filter(r => r.name.trim())

        resolve(parsed)
      } catch {
        reject(new Error('Could not read file. Make sure it is a valid .xlsx or .csv file.'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsArrayBuffer(file)
  })
}

export default function GuestImport({
  weddingId,
  onImported,
}: {
  weddingId: string
  onImported: (guests: (ImportRow & { id: string; rsvp_token: string })[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<ImportRow[]>([])
  const [fileName, setFileName] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const rows = await parseExcel(file)
      setPreview(rows)
      setFileName(file.name)
      setResult(null)
      setOpen(true)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to parse file')
    }

    // Reset input so same file can be re-uploaded
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleImport() {
    setLoading(true)
    const res = await bulkImportGuests(weddingId, preview)
    setResult(res)
    setLoading(false)

    if (res.imported > 0) {
      toast.success(`${res.imported} guests imported successfully`)
      // Trigger page refresh to show new guests
      window.location.reload()
    }
    if (res.errors.length > 0 && res.imported === 0) {
      toast.error('Import failed')
    }
  }

  function handleClose() {
    setOpen(false)
    setPreview([])
    setFileName('')
    setResult(null)
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => downloadSmartTemplate(weddingId)}>
          <Download className="w-4 h-4 mr-1.5" /> Smart template
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4 mr-1.5" /> Import Excel
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import guests — {fileName}</DialogTitle>
          </DialogHeader>

          {result ? (
            <div className="py-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-4 py-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{result.imported} guests imported successfully</p>
              </div>
              {result.skipped > 0 && (
                <div className="flex items-start gap-2 text-amber-700 bg-amber-50 rounded-lg px-4 py-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">{result.skipped} rows skipped</p>
                    {result.errors.map((e, i) => <p key={i} className="text-amber-600 mt-1">{e}</p>)}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <p className="text-sm text-stone-500">{preview.length} guests found. Review before importing.</p>
              <div className="overflow-auto flex-1 border border-stone-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-stone-50 border-b border-stone-200">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-stone-500">#</th>
                      <th className="text-left px-3 py-2 font-medium text-stone-500">Name</th>
                      <th className="text-left px-3 py-2 font-medium text-stone-500">Phone</th>
                      <th className="text-left px-3 py-2 font-medium text-stone-500">Side</th>
                      <th className="text-left px-3 py-2 font-medium text-stone-500">VIP</th>
                      <th className="text-left px-3 py-2 font-medium text-stone-500">Dietary</th>
                      <th className="text-left px-3 py-2 font-medium text-stone-500">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                        <td className="px-3 py-2 text-stone-400">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-stone-900">{row.name || <span className="text-red-500">MISSING</span>}</td>
                        <td className="px-3 py-2 text-stone-600">{row.phone || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full capitalize ${SIDE_COLORS[row.side] || 'bg-stone-100 text-stone-500'}`}>
                            {row.side}
                          </span>
                        </td>
                        <td className="px-3 py-2">{row.is_vip ? '⭐ Yes' : 'No'}</td>
                        <td className="px-3 py-2 capitalize">{row.dietary}</td>
                        <td className="px-3 py-2 text-stone-500">{row.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <DialogFooter>
            {result ? (
              <Button onClick={handleClose}>Close</Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleClose}>Cancel</Button>
                <Button
                  className="bg-rose-700 hover:bg-rose-800"
                  onClick={handleImport}
                  disabled={loading || preview.length === 0}
                >
                  {loading ? 'Importing…' : `Import ${preview.length} guests`}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
