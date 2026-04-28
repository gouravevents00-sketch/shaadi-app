'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ThumbsUp, ThumbsDown, RefreshCw, Clock, CheckCircle, XCircle, MessageSquare } from 'lucide-react'
import { respondToApproval } from './actions'

interface ApprovalItem {
  id: string; title: string; category: string
  description: string | null; status: string; client_note: string | null
  created_at: string; updated_at: string
}

interface Props {
  weddingId: string
  items: ApprovalItem[]
}

const STATUS_CONFIG = {
  pending:  { label: 'Awaiting your response', color: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Approved',               color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  rejected: { label: 'Rejected',               color: 'bg-red-100 text-red-700', icon: XCircle },
  revision: { label: 'Revision requested',     color: 'bg-blue-100 text-blue-700', icon: RefreshCw },
}

const CAT_COLOR: Record<string, string> = {
  vendor:  'bg-purple-100 text-purple-700',
  decor:   'bg-pink-100 text-pink-700',
  menu:    'bg-orange-100 text-orange-700',
  venue:   'bg-blue-100 text-blue-700',
  other:   'bg-stone-100 text-stone-600',
}

export default function ApprovalsClient({ weddingId, items: initial }: Props) {
  const [items, setItems] = useState<ApprovalItem[]>(initial)
  const [responding, setResponding] = useState<string | null>(null)
  const [noteId, setNoteId] = useState<string | null>(null)
  const [note, setNote] = useState('')

  async function respond(item: ApprovalItem, status: 'approved' | 'rejected' | 'revision') {
    const clientNote = status === 'revision' || status === 'rejected' ? note : undefined
    if ((status === 'revision') && !clientNote?.trim()) {
      setNoteId(item.id)
      return
    }
    setResponding(item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status, client_note: clientNote ?? null } : i))
    const res = await respondToApproval(weddingId, item.id, status, clientNote)
    if ('error' in res) {
      toast.error(res.error)
      setItems(prev => prev.map(i => i.id === item.id ? item : i))
    } else {
      toast.success(status === 'approved' ? 'Approved!' : status === 'rejected' ? 'Response sent' : 'Revision requested')
      setNoteId(null); setNote('')
    }
    setResponding(null)
  }

  const pending  = items.filter(i => i.status === 'pending')
  const resolved = items.filter(i => i.status !== 'pending')

  if (items.length === 0) return (
    <div className="space-y-4">
      <div><h2 className="text-lg font-semibold text-stone-900">Approvals</h2>
        <p className="text-sm text-stone-400 mt-0.5">Your event team will send proposals here for your approval</p>
      </div>
      <div className="text-center py-16 text-stone-400">
        <ThumbsUp className="w-10 h-10 mx-auto mb-3 text-stone-200" />
        <p className="text-sm font-medium">Nothing to approve yet</p>
        <p className="text-xs mt-1">Your coordinator will share vendor proposals, decor options etc. here</p>
      </div>
    </div>
  )

  function ItemCard({ item }: { item: ApprovalItem }) {
    const cfg = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
    const StatusIcon = cfg.icon
    const isPending = item.status === 'pending'
    const isNoting = noteId === item.id

    return (
      <div className={`bg-white border rounded-xl overflow-hidden ${isPending ? 'border-amber-200' : 'border-stone-200'}`}>
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${CAT_COLOR[item.category] ?? CAT_COLOR.other}`}>
                  {item.category}
                </span>
                <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                  <StatusIcon className="w-3 h-3" /> {cfg.label}
                </span>
              </div>
              <p className="text-sm font-semibold text-stone-800">{item.title}</p>
              {item.description && (
                <p className="text-sm text-stone-500 mt-1 leading-relaxed">{item.description}</p>
              )}
              {item.client_note && !isPending && (
                <div className="mt-2 flex items-start gap-1.5 text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2">
                  <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  <span>Your note: {item.client_note}</span>
                </div>
              )}
            </div>
          </div>

          {isPending && !isNoting && (
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-stone-100">
              <button onClick={() => respond(item, 'approved')} disabled={responding === item.id}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium">
                <ThumbsUp className="w-4 h-4" /> Approve
              </button>
              <button onClick={() => { setNoteId(item.id); setNote('') }} disabled={responding === item.id}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-100 text-blue-700 text-sm rounded-lg hover:bg-blue-200 disabled:opacity-50 font-medium">
                <RefreshCw className="w-4 h-4" /> Request changes
              </button>
              <button onClick={() => respond(item, 'rejected')} disabled={responding === item.id}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg hover:bg-red-100 disabled:opacity-50">
                <ThumbsDown className="w-4 h-4" />
              </button>
            </div>
          )}

          {isNoting && (
            <div className="mt-3 space-y-2">
              <textarea
                autoFocus
                placeholder="What changes do you want? Be specific…"
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={() => respond(item, 'revision')}
                  className="flex-1 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 font-medium">
                  Send request
                </button>
                <button onClick={() => { setNoteId(null); setNote('') }}
                  className="px-3 py-2 text-stone-500 text-sm hover:text-stone-700">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-stone-900">Approvals</h2>
        <p className="text-sm text-stone-400 mt-0.5">
          {pending.length > 0
            ? `${pending.length} item${pending.length !== 1 ? 's' : ''} waiting for your response`
            : 'All caught up!'}
        </p>
      </div>

      {pending.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Needs your response</p>
          {pending.map(item => <ItemCard key={item.id} item={item} />)}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Responded</p>
          <div className="opacity-70 space-y-3">
            {resolved.map(item => <ItemCard key={item.id} item={item} />)}
          </div>
        </div>
      )}
    </div>
  )
}
