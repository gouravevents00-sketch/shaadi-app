'use client'

import { useState, useRef, useEffect } from 'react'
import { Paperclip, Upload, Trash2, FileText, Image, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { uploadDocument, getDocuments, deleteDocument } from '@/app/(dashboard)/weddings/[weddingId]/documents/actions'

interface Doc {
  id: string
  name: string
  storage_path: string
  mime_type: string | null
  size_bytes: number | null
  created_at: string
  url: string | null
}

function fmtSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mime }: { mime: string | null }) {
  if (mime?.startsWith('image/')) return <Image className="w-4 h-4 text-blue-500 flex-shrink-0" />
  return <FileText className="w-4 h-4 text-stone-400 flex-shrink-0" />
}

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export default function DocumentsPanel({
  weddingId,
  entityType,
  entityId,
  label = 'Documents',
}: {
  weddingId: string
  entityType: string
  entityId: string | null
  label?: string
}) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getDocuments(weddingId, entityType, entityId).then(res => {
      if (!res.error) setDocs(res.docs as Doc[])
      setLoading(false)
    })
  }, [weddingId, entityType, entityId])

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)

    for (const file of Array.from(files)) {
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} is too large (max 10 MB)`)
        continue
      }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = e => {
          const result = e.target?.result as string
          resolve(result.split(',')[1]) // strip data:...;base64, prefix
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const res = await uploadDocument(
        weddingId, entityType, entityId,
        file.name, base64, file.type, file.size
      )

      if (res.error) {
        toast.error(`Failed to upload ${file.name}: ${res.error}`)
      } else {
        toast.success(`${file.name} uploaded`)
        // Refresh list
        const refreshed = await getDocuments(weddingId, entityType, entityId)
        if (!refreshed.error) setDocs(refreshed.docs as Doc[])
      }
    }

    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDelete(doc: Doc) {
    const res = await deleteDocument(weddingId, doc.id, doc.storage_path)
    if (res.error) {
      toast.error(res.error)
    } else {
      setDocs(prev => prev.filter(d => d.id !== doc.id))
      toast.success('Deleted')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    handleFiles(e.dataTransfer.files)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-stone-500 flex items-center gap-1.5">
          <Paperclip className="w-3.5 h-3.5" /> {label} {docs.length > 0 && `(${docs.length})`}
        </p>
        <button
          onClick={() => fileRef.current?.click()}
          className="text-xs text-rose-700 hover:text-rose-800 font-medium flex items-center gap-1"
          disabled={uploading}>
          <Upload className="w-3 h-3" /> {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Drop zone (shown when no docs yet) */}
      {!loading && docs.length === 0 && (
        <div
          onDrop={handleDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className="border border-dashed border-stone-200 rounded-lg px-4 py-5 text-center cursor-pointer hover:border-rose-300 hover:bg-rose-50 transition-colors">
          <Upload className="w-5 h-5 text-stone-300 mx-auto mb-1" />
          <p className="text-xs text-stone-400">Drop files here or click to upload</p>
          <p className="text-[10px] text-stone-300 mt-0.5">PDF, Word, Excel, images · max 10 MB each</p>
        </div>
      )}

      {/* File list */}
      {docs.length > 0 && (
        <div className="space-y-1">
          {docs.map(doc => (
            <div key={doc.id} className="group flex items-center gap-2 p-2 rounded-lg hover:bg-stone-50 border border-transparent hover:border-stone-100">
              <FileIcon mime={doc.mime_type} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-stone-800 truncate">{doc.name}</p>
                <p className="text-[10px] text-stone-400">{fmtSize(doc.size_bytes)}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {doc.url && (
                  <a href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="p-1 text-stone-400 hover:text-stone-600 rounded">
                    <Download className="w-3.5 h-3.5" />
                  </a>
                )}
                <button onClick={() => handleDelete(doc)}
                  className="p-1 text-stone-400 hover:text-red-500 rounded">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Add more */}
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-2 py-1.5 text-xs text-stone-400 hover:text-stone-600 cursor-pointer hover:bg-stone-50 rounded-lg transition-colors">
            <Upload className="w-3.5 h-3.5" /> Add more files
          </div>
        </div>
      )}

      {loading && <p className="text-xs text-stone-400 py-2">Loading…</p>}
    </div>
  )
}
