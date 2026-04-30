'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Upload, Download, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { bulkImportDelegates, type DelegateImportRow } from './importActions'

const TEMPLATE_COLUMNS = ['Name', 'Title', 'Organization', 'Phone', 'Email', 'VIP', 'Dietary', 'Dietary Notes', 'Notes']
const SAMPLE_ROWS: (string | number | boolean)[][] = [
  ['Rajiv Mehta', 'CEO', 'Acme Corp', '+91 98765 43210', 'rajiv@acme.com', 'yes', 'veg', '', 'Keynote speaker'],
  ['Dr. Priya Singh', 'Director', 'NITI Aayog', '+91 91234 56789', 'priya@gov.in', 'yes', 'jain', 'No onion garlic', ''],
  ['Anand Kumar', 'Manager', 'Tata Group', '+91 97001 44001', 'anand@tata.com', 'no', 'non_veg', '', ''],
]

function buildWorkbook(dataRows: (string | number | boolean)[][], filename: string) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS, ...dataRows])
  ws['!cols'] = [
    { wch: 25 }, { wch: 20 }, { wch: 25 }, { wch: 18 },
    { wch: 28 }, { wch: 6 }, { wch: 10 }, { wch: 22 }, { wch: 25 }
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Delegates')

  const infoData = [
    ['Column', 'Required', 'Valid Values', 'Example'],
    ['Name', 'YES', 'Any text', 'Rajiv Mehta'],
    ['Title', 'no', 'Any text', 'CEO'],
    ['Organization', 'no', 'Any text', 'Acme Corp'],
    ['Phone', 'no', 'Any', '+91 98765 43210'],
    ['Email', 'no', 'Valid email', 'rajiv@acme.com'],
    ['VIP', 'no', 'yes / no', 'yes'],
    ['Dietary', 'no', 'veg / non_veg / jain / other', 'veg'],
    ['Dietary Notes', 'no', 'Any text', 'No onion garlic'],
    ['Notes', 'no', 'Any text', 'Keynote speaker'],
    [],
    ['IMPORTANT: Do not change column headers.'],
  ]
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData)
  wsInfo['!cols'] = [{ wch: 18 }, { wch: 10 }, { wch: 35 }, { wch: 28 }]
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Instructions')
  XLSX.writeFile(wb, filename)
}

function parseExcel(file: File): Promise<DelegateImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
        const parsed: DelegateImportRow[] = rows.map(row => ({
          name: String(row['Name'] || row['name'] || ''),
          title: String(row['Title'] || row['title'] || ''),
          organization: String(row['Organization'] || row['organization'] || ''),
          phone: String(row['Phone'] || row['phone'] || ''),
          email: String(row['Email'] || row['email'] || ''),
          is_vip: ['yes', 'true', '1', 'y'].includes(String(row['VIP'] || row['vip'] || 'no').toLowerCase()),
          dietary: String(row['Dietary'] || row['dietary'] || 'veg').toLowerCase(),
          dietary_notes: String(row['Dietary Notes'] || row['dietary_notes'] || ''),
          notes: String(row['Notes'] || row['notes'] || ''),
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

export default function DelegateImport({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<DelegateImportRow[]>([])
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
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleImport() {
    setLoading(true)
    const res = await bulkImportDelegates(eventId, preview)
    setResult(res)
    setLoading(false)
    if (res.imported > 0) {
      toast.success(`${res.imported} delegates imported`)
      window.location.reload()
    }
    if (res.errors.length > 0 && res.imported === 0) toast.error('Import failed')
  }

  function handleClose() { setOpen(false); setPreview([]); setFileName(''); setResult(null) }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => buildWorkbook(SAMPLE_ROWS, 'delegate-list-template.xlsx')}>
          <Download className="w-4 h-4 mr-1.5" /> Template
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          <Upload className="w-4 h-4 mr-1.5" /> Import Excel
        </Button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      </div>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Import delegates — {fileName}</DialogTitle>
          </DialogHeader>
          {result ? (
            <div className="py-4 space-y-3">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg px-4 py-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{result.imported} delegates imported successfully</p>
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
              <p className="text-sm text-stone-500">{preview.length} delegates found. Review before importing.</p>
              <div className="overflow-auto flex-1 border border-stone-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-stone-50 border-b border-stone-200">
                    <tr>
                      {['#', 'Name', 'Title', 'Organization', 'Phone', 'VIP', 'Dietary', 'Notes'].map(h => (
                        <th key={h} className="text-left px-3 py-2 font-medium text-stone-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-b border-stone-100 last:border-0 hover:bg-stone-50">
                        <td className="px-3 py-2 text-stone-400">{i + 1}</td>
                        <td className="px-3 py-2 font-medium text-stone-900">
                          {row.name || <span className="text-red-500">MISSING</span>}
                        </td>
                        <td className="px-3 py-2 text-stone-600">{row.title || '—'}</td>
                        <td className="px-3 py-2 text-stone-600">{row.organization || '—'}</td>
                        <td className="px-3 py-2 text-stone-600">{row.phone || '—'}</td>
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
                  className="bg-stone-900 hover:bg-stone-800"
                  onClick={handleImport}
                  disabled={loading || preview.length === 0}
                >
                  {loading ? 'Importing…' : `Import ${preview.length} delegates`}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
