'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Upload, Download, X, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { bulkImportGuests, type ImportRow } from './importActions'

const TEMPLATE_COLUMNS = [
  'Name', 'Phone', 'Email', 'Side', 'VIP', 'Dietary', 'Dietary Notes', 'Notes'
]
const SAMPLE_ROWS = [
  ['Sharma Ji', '+91 98765 43210', 'sharma@email.com', 'groom', 'no', 'veg', '', 'Family friend'],
  ['Sunita Auntie', '+91 91234 56789', '', 'bride', 'yes', 'jain', 'No onion garlic', 'VIP guest'],
]
const SIDE_NOTE = 'bride / groom / both / shared / neutral'
const DIETARY_NOTE = 'veg / non_veg / jain / other'
const VIP_NOTE = 'yes / no'

const SIDE_COLORS: Record<string, string> = {
  bride: 'bg-pink-50 text-pink-700',
  groom: 'bg-blue-50 text-blue-700',
  both: 'bg-purple-50 text-purple-700',
  shared: 'bg-stone-100 text-stone-600',
  neutral: 'bg-stone-100 text-stone-500',
}

function buildWorkbook(dataRows: (string | number | boolean)[][], filename: string) {
  const wb = XLSX.utils.book_new()

  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS, ...dataRows])
  ws['!cols'] = [
    { wch: 25 }, { wch: 18 }, { wch: 28 },
    { wch: 12 }, { wch: 6 }, { wch: 10 }, { wch: 22 }, { wch: 25 }
  ]
  XLSX.utils.book_append_sheet(wb, ws, 'Guests')

  const infoData = [
    ['Column', 'Required', 'Valid Values', 'Example'],
    ['Name', 'YES', 'Any text', 'Sharma Ji'],
    ['Phone', 'no', 'Any', '+91 98765 43210'],
    ['Email', 'no', 'Valid email', 'sharma@email.com'],
    ['Side', 'no', SIDE_NOTE, 'bride'],
    ['VIP', 'no', VIP_NOTE, 'yes'],
    ['Dietary', 'no', DIETARY_NOTE, 'veg'],
    ['Dietary Notes', 'no', 'Any text', 'No onion garlic'],
    ['Notes', 'no', 'Any text', 'Family friend'],
    [],
    ['IMPORTANT: Do not change column headers.'],
  ]
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData)
  wsInfo['!cols'] = [{ wch: 16 }, { wch: 10 }, { wch: 35 }, { wch: 25 }]
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Instructions')

  XLSX.writeFile(wb, filename)
}

function downloadTemplate() {
  buildWorkbook(SAMPLE_ROWS, 'guest-list-template.xlsx')
}

function downloadSampleList() {
  const sampleGuests: (string | number | boolean)[][] = [
    // Name, Phone, Email, Side, VIP, Dietary, Dietary Notes, Notes
    ['Ramesh Maheshwari', '+91 98100 11001', 'ramesh.m@gmail.com', 'groom', 'yes', 'veg', '', 'Groom\'s father'],
    ['Sunita Maheshwari', '+91 98100 11002', '', 'groom', 'yes', 'veg', '', 'Groom\'s mother'],
    ['Vikram Maheshwari', '+91 98765 43210', 'vikram.m@gmail.com', 'groom', 'no', 'non_veg', '', 'Groom\'s brother'],
    ['Priya Maheshwari', '+91 98765 43211', '', 'groom', 'no', 'veg', '', 'Groom\'s sister'],
    ['Anil Sharma', '+91 99001 22001', 'anil.s@gmail.com', 'groom', 'no', 'veg', '', 'Family friend'],
    ['Kavita Sharma', '+91 99001 22002', '', 'groom', 'no', 'jain', 'No onion garlic', 'Anil ji\'s wife'],
    ['Deepak Gupta', '+91 98001 33001', '', 'groom', 'no', 'veg', '', 'College friend'],
    ['Manish Joshi', '+91 97001 44001', 'manish.j@gmail.com', 'groom', 'no', 'non_veg', '', 'Office colleague'],
    ['Suresh Vijayvargia', '+91 98200 55001', 'suresh.v@gmail.com', 'bride', 'yes', 'veg', '', 'Bride\'s father'],
    ['Meena Vijayvargia', '+91 98200 55002', '', 'bride', 'yes', 'veg', '', 'Bride\'s mother'],
    ['Rahul Vijayvargia', '+91 98200 55003', 'rahul.v@gmail.com', 'bride', 'no', 'veg', '', 'Bride\'s brother'],
    ['Neha Vijayvargia', '+91 98200 55004', '', 'bride', 'no', 'veg', '', 'Bride\'s sister'],
    ['Pooja Agarwal', '+91 96001 66001', 'pooja.a@gmail.com', 'bride', 'no', 'jain', 'No root vegetables', 'Bride\'s best friend'],
    ['Rohit Agarwal', '+91 96001 66002', '', 'bride', 'no', 'veg', '', 'Pooja\'s husband'],
    ['Anjali Singh', '+91 95001 77001', '', 'bride', 'no', 'veg', '', 'School friend'],
    ['Amit Bansal', '+91 94001 88001', 'amit.b@gmail.com', 'both', 'no', 'non_veg', '', 'Common friend'],
    ['Ritu Bansal', '+91 94001 88002', '', 'both', 'no', 'veg', '', 'Amit\'s wife'],
    ['Dr. Kamal Verma', '+91 93001 99001', 'dr.kamal@gmail.com', 'both', 'yes', 'veg', '', 'Family doctor'],
    ['Shyam Lal Khatri', '+91 92001 10001', '', 'groom', 'no', 'veg', '', 'Chacha ji'],
    ['Kamla Khatri', '+91 92001 10002', '', 'groom', 'no', 'veg', 'Diabetic - no sugar', 'Chachi ji'],
  ]
  buildWorkbook(sampleGuests, 'sample-guest-list.xlsx')
}

function parseExcel(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })

        const parsed: ImportRow[] = rows.map(row => ({
          name: String(row['Name'] || row['name'] || ''),
          phone: String(row['Phone'] || row['phone'] || ''),
          email: String(row['Email'] || row['email'] || ''),
          side: String(row['Side'] || row['side'] || 'both').toLowerCase(),
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

export default function GuestImport({
  weddingId,
  onImported,
}: {
  weddingId: string
  onImported: (guests: ImportRow & { id: string; rsvp_token: string }[]) => void
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
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-1.5" /> Template
        </Button>
        <Button variant="outline" size="sm" onClick={downloadSampleList}>
          <Download className="w-4 h-4 mr-1.5" /> Sample list
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
