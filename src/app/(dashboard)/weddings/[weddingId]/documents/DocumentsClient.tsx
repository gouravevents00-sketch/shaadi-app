'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Upload, FileText, Trash2, Download, FolderOpen, Eye, EyeOff } from 'lucide-react'
import { uploadDocument, deleteDocument, toggleDocumentClientVisibility } from './actions'

type DocRow = {
  id: string
  name: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  entity_type: string
  entity_id: string | null
  created_at: string
  url: string | null
  shared_with_client?: boolean
}

type Props = {
  weddingId: string
  weddingName: string
  initialDocs: DocRow[]
}

const CATEGORIES = [
  { value: 'contract',  label: 'Contracts' },
  { value: 'vendor',    label: 'Vendor Docs' },
  { value: 'venue',     label: 'Venue Docs' },
  { value: 'guest',     label: 'Guest Lists' },
  { value: 'budget',    label: 'Budget Files' },
  { value: 'general',   label: 'General' },
]

function formatBytes(bytes: number | null) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

export default function DocumentsClient({ weddingId, weddingName, initialDocs }: Props) {
  const [docs, setDocs] = useState<DocRow[]>(initialDocs)
  const [uploading, setUploading] = useState(false)
  const [category, setCategory] = useState('general')
  const fileRef = useRef<HTMLInputElement>(null)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const categorised = CATEGORIES.map(c => ({
    ...c,
    docs: docs.filter(d => d.entity_type === c.value),
  })).filter(c => activeCategory ? c.value === activeCategory : true)

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const reader = new FileReader()
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.readAsDataURL(file)
      })
      const r = await uploadDocument(weddingId, category, null, file.name, base64, file.type, file.size)
      if ('error' in r) {
        toast.error(`Failed: ${file.name}`)
      } else {
        // Add to local state (no signed URL immediately — user can refresh for dl link)
        setDocs(prev => [{
          id: r.id,
          name: file.name,
          storage_path: `${weddingId}/${category}/general/${file.name}`,
          mime_type: file.type,
          size_bytes: file.size,
          entity_type: category,
          entity_id: null,
          created_at: new Date().toISOString(),
          url: null,
        }, ...prev])
        toast.success(`Uploaded: ${file.name}`)
      }
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(doc: DocRow) {
    if (!confirm(`Delete "${doc.name}"?`)) return
    const r = await deleteDocument(weddingId, doc.id, doc.storage_path)
    if ('error' in r) { toast.error(r.error); return }
    setDocs(prev => prev.filter(d => d.id !== doc.id))
    toast.success('Deleted')
  }

  async function handleToggleShare(doc: DocRow) {
    const next = !doc.shared_with_client
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, shared_with_client: next } : d))
    const r = await toggleDocumentClientVisibility(weddingId, doc.id, next)
    if ('error' in r) {
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, shared_with_client: doc.shared_with_client } : d))
      toast.error(r.error)
    } else {
      toast.success(next ? 'Shared with client' : 'Hidden from client')
    }
  }

  const totalDocs = docs.length

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Documents</h1>
          <p className="text-sm text-stone-400 mt-0.5">{weddingName} · {totalDocs} file{totalDocs !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={category} onValueChange={v => v && setCategory(v)}>
            <SelectTrigger className="w-36 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading…' : 'Upload'}
          </Button>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={e => handleUpload(e.target.files)}
          />
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory(null)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            !activeCategory ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-200 text-stone-600 hover:bg-stone-50'
          }`}
        >
          All ({docs.length})
        </button>
        {CATEGORIES.map(c => {
          const count = docs.filter(d => d.entity_type === c.value).length
          if (!count) return null
          return (
            <button
              key={c.value}
              onClick={() => setActiveCategory(activeCategory === c.value ? null : c.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                activeCategory === c.value ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-200 text-stone-600 hover:bg-stone-50'
              }`}
            >
              {c.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Files by category */}
      {categorised.map(cat => cat.docs.length > 0 && (
        <div key={cat.value}>
          <div className="flex items-center gap-2 mb-2">
            <FolderOpen className="w-4 h-4 text-stone-400" />
            <p className="text-sm font-medium text-stone-600">{cat.label}</p>
            <Badge variant="secondary" className="text-xs">{cat.docs.length}</Badge>
          </div>
          <Card className="border-stone-200">
            <CardContent className="p-0 divide-y divide-stone-100">
              {cat.docs.map(doc => (
                <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
                  <FileText className="w-4 h-4 text-stone-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{doc.name}</p>
                    <p className="text-xs text-stone-400">
                      {formatBytes(doc.size_bytes)} · {new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleShare(doc)}
                    title={doc.shared_with_client ? 'Visible to client — click to hide' : 'Hidden from client — click to share'}
                    className={`transition-colors ${doc.shared_with_client ? 'text-emerald-500 hover:text-emerald-700' : 'text-stone-300 hover:text-stone-500'}`}
                  >
                    {doc.shared_with_client ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                  {doc.url && (
                    <a href={doc.url} target="_blank" rel="noreferrer" className="text-stone-300 hover:text-stone-600 transition-colors">
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                  <button onClick={() => handleDelete(doc)} className="text-stone-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ))}

      {totalDocs === 0 && (
        <div className="text-center py-16 text-stone-400">
          <Upload className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No documents yet. Upload contracts, vendor quotes, and references.</p>
        </div>
      )}
    </div>
  )
}
