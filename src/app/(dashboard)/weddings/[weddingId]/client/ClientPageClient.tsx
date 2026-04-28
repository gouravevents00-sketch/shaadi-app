'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Plus, Trash2, ThumbsUp, ThumbsDown, RefreshCw,
  Clock, CheckCircle, XCircle, Users, Heart, ListTodo, ChevronDown, ChevronUp
} from 'lucide-react'
import { createApproval, deleteApproval } from './actions'

interface ApprovalItem {
  id: string; title: string; category: string; description: string | null
  status: string; client_note: string | null; created_at: string
}
interface Preference { key: string; value: string; category: string }
interface Guest { id: string; name: string; phone: string | null; side: string; dietary: string | null; plus_count: number }
interface Requirement { id: string; title: string; priority: string; status: string }
interface ClientInvite { email: string; accepted_at: string | null }

interface Props {
  weddingId: string
  approvals: ApprovalItem[]
  preferences: Preference[]
  guests: Guest[]
  requirements: Requirement[]
  clientInvites: ClientInvite[]
}

const STATUS_CONFIG = {
  pending:  { label: 'Pending',          color: 'bg-amber-100 text-amber-700',   icon: Clock },
  approved: { label: 'Approved',         color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  rejected: { label: 'Rejected',         color: 'bg-red-100 text-red-700',       icon: XCircle },
  revision: { label: 'Revision needed',  color: 'bg-blue-100 text-blue-700',     icon: RefreshCw },
}

const CATEGORIES = ['vendor', 'decor', 'menu', 'venue', 'other']

const PREF_LABELS: Record<string, string> = {
  'food.type': 'Food type', 'food.cuisine': 'Cuisines', 'food.special': 'Dietary needs', 'food.snacks': 'Snacks',
  'music.style': 'Music style', 'music.dj': 'DJ', 'music.band': 'Live band', 'music.songs': 'Songs/Artists',
  'decor.theme': 'Theme', 'decor.colors': 'Colours', 'decor.flowers': 'Flowers', 'decor.avoid': 'Avoid',
  'photo.style': 'Photo style', 'photo.must_shots': 'Must-capture', 'photo.drone': 'Drone', 'photo.reel': 'Video reel',
  'general.vibe': 'Overall vibe', 'general.kids': 'Kids', 'general.elderly': 'Elderly guests', 'general.other': 'Other notes',
}

const PREF_SECTIONS = [
  { id: 'food', label: '🍽️ Food & Catering' },
  { id: 'music', label: '🎵 Music & Entertainment' },
  { id: 'decor', label: '🌸 Decor & Theme' },
  { id: 'photo', label: '📸 Photography' },
  { id: 'general', label: '✨ General' },
]

export default function ClientPageClient({ weddingId, approvals: initApprovals, preferences, guests, requirements, clientInvites }: Props) {
  const [approvals, setApprovals] = useState<ApprovalItem[]>(initApprovals)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', category: 'vendor', description: '' })
  const [saving, setSaving] = useState(false)
  const [expandedPref, setExpandedPref] = useState<string | null>('food')

  const activeClients = clientInvites.filter(i => i.accepted_at)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    const res = await createApproval(weddingId, { title: form.title, category: form.category, description: form.description })
    if ('error' in res) {
      toast.error(res.error)
    } else {
      const newItem: ApprovalItem = {
        id: res.id, title: form.title.trim(), category: form.category,
        description: form.description || null, status: 'pending',
        client_note: null, created_at: new Date().toISOString(),
      }
      setApprovals(a => [newItem, ...a])
      setForm({ title: '', category: 'vendor', description: '' })
      setShowForm(false)
      toast.success('Sent to client for approval')
    }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    setApprovals(a => a.filter(x => x.id !== id))
    const res = await deleteApproval(weddingId, id)
    if ('error' in res) { toast.error(res.error); }
  }

  // Group preferences by section
  const prefBySection: Record<string, Preference[]> = {}
  for (const p of preferences) {
    const sec = p.key.split('.')[0]
    if (!prefBySection[sec]) prefBySection[sec] = []
    prefBySection[sec].push(p)
  }

  const filledSections = PREF_SECTIONS.filter(s => (prefBySection[s.id] ?? []).length > 0)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Client Portal</h1>
        <p className="text-sm text-stone-400 mt-0.5">
          {activeClients.length > 0
            ? `${activeClients.map(c => c.email).join(', ')} — active`
            : 'No client logged in yet — share invite from Overview'}
        </p>
      </div>

      {/* Activity summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
          <Users className="w-5 h-5 text-rose-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-stone-900">{guests.length}</p>
          <p className="text-xs text-stone-400 mt-0.5">Guests added</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
          <Heart className="w-5 h-5 text-rose-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-stone-900">{preferences.length}</p>
          <p className="text-xs text-stone-400 mt-0.5">Preferences filled</p>
        </div>
        <div className="bg-white border border-stone-200 rounded-xl p-4 text-center">
          <ListTodo className="w-5 h-5 text-rose-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-stone-900">{requirements.length}</p>
          <p className="text-xs text-stone-400 mt-0.5">Requirements</p>
        </div>
      </div>

      {/* ── APPROVALS ──────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-stone-800">Approvals</h2>
            <p className="text-xs text-stone-400 mt-0.5">Send proposals to client for approve / reject</p>
          </div>
          <button onClick={() => setShowForm(s => !s)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-700 text-white text-xs rounded-lg hover:bg-rose-800">
            <Plus className="w-3.5 h-3.5" /> New proposal
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-stone-600 mb-1 block">Proposal title *</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Shri Ram Photography confirmed at ₹2.5L" autoFocus
                  className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200" />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200">
                  {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1 block">Details (optional)</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="More context for client"
                  className="w-full px-3 py-2 text-sm border border-stone-200 bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-stone-500 px-3 py-1.5">Cancel</button>
              <button type="submit" disabled={saving}
                className="text-sm bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50">
                {saving ? 'Sending…' : 'Send to client'}
              </button>
            </div>
          </form>
        )}

        {approvals.length === 0 && !showForm && (
          <div className="text-center py-8 text-stone-400 bg-white border border-stone-200 rounded-xl">
            <p className="text-sm">No proposals yet — click "New proposal" to send something to client</p>
          </div>
        )}

        {approvals.length > 0 && (
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {approvals.map(item => {
              const cfg = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending
              const StatusIcon = cfg.icon
              return (
                <div key={item.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-xs text-stone-400 capitalize bg-stone-100 px-1.5 py-0.5 rounded">{item.category}</span>
                      <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" /> {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-stone-800">{item.title}</p>
                    {item.description && <p className="text-xs text-stone-400 mt-0.5">{item.description}</p>}
                    {item.client_note && (
                      <p className="text-xs text-blue-600 mt-1 bg-blue-50 px-2 py-1 rounded">
                        Client: "{item.client_note}"
                      </p>
                    )}
                  </div>
                  <button onClick={() => handleDelete(item.id)} className="text-stone-300 hover:text-red-400 flex-shrink-0 mt-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── CLIENT PREFERENCES ─────────────────────────────── */}
      <div className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-800">Client Preferences</h2>
          <p className="text-xs text-stone-400 mt-0.5">What bride/groom filled in their portal</p>
        </div>

        {filledSections.length === 0 ? (
          <div className="text-center py-8 text-stone-400 bg-white border border-stone-200 rounded-xl">
            <p className="text-sm">Client hasn't filled preferences yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {PREF_SECTIONS.filter(s => prefBySection[s.id]?.length).map(section => (
              <div key={section.id} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setExpandedPref(expandedPref === section.id ? null : section.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50"
                >
                  <span className="text-sm font-medium text-stone-800">{section.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400">{prefBySection[section.id]?.length} filled</span>
                    {expandedPref === section.id ? <ChevronUp className="w-4 h-4 text-stone-400" /> : <ChevronDown className="w-4 h-4 text-stone-400" />}
                  </div>
                </button>
                {expandedPref === section.id && (
                  <div className="border-t border-stone-100 divide-y divide-stone-50">
                    {(prefBySection[section.id] ?? []).map(p => (
                      <div key={p.key} className="flex gap-3 px-4 py-2.5">
                        <span className="text-xs text-stone-400 w-28 flex-shrink-0 pt-0.5">{PREF_LABELS[p.key] ?? p.key}</span>
                        <span className="text-sm text-stone-700 flex-1">{p.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── GUESTS SUBMITTED ───────────────────────────────── */}
      {guests.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-800">Guests Added by Client</h2>
            <p className="text-xs text-stone-400 mt-0.5">These are already in your main guest list</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {guests.map(g => (
              <div key={g.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-rose-600">{g.name[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-800">
                    {g.name} {g.plus_count > 0 && <span className="text-stone-400 text-xs">+{g.plus_count}</span>}
                  </p>
                  {(g.phone || g.dietary) && (
                    <p className="text-xs text-stone-400">{[g.phone, g.dietary].filter(Boolean).join(' · ')}</p>
                  )}
                </div>
                <span className="text-xs text-stone-400 capitalize">{g.side}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── REQUIREMENTS ───────────────────────────────────── */}
      {requirements.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-800">Client Requirements / Wishlist</h2>
            <p className="text-xs text-stone-400 mt-0.5">Items client wants you to arrange</p>
          </div>
          <div className="bg-white border border-stone-200 rounded-xl divide-y divide-stone-100">
            {requirements.map(r => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
                  r.priority === 'high' ? 'bg-red-100 text-red-700' :
                  r.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-stone-100 text-stone-500'
                }`}>{r.priority}</span>
                <span className={`flex-1 text-sm ${r.status === 'done' ? 'line-through text-stone-400' : 'text-stone-700'}`}>{r.title}</span>
                <span className="text-xs text-stone-400 flex-shrink-0 capitalize">{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
