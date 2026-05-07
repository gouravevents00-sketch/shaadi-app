'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, MessageCircle, Phone, X } from 'lucide-react'
import { addRemark, deleteRemark } from '../actions'

type Guest = {
  id: string
  name: string
  phone: string | null
  rsvp_status: string
}

type Vendor = {
  id: string
  name: string
  phone: string | null
  category: string
}

type Remark = {
  id: string
  body: string
  category: string
  is_for_agency: boolean
  resolved: boolean
  created_at: string
}

type Props = {
  celebrationId: string
  initialGuests: Guest[]
  initialVendors: Vendor[]
  initialRemarks: Remark[]
}

export default function CommsClient({ celebrationId, initialGuests, initialVendors, initialRemarks }: Props) {
  const [guests] = useState<Guest[]>(initialGuests)
  const [vendors] = useState<Vendor[]>(initialVendors)
  const [remarks, setRemarks] = useState<Remark[]>(initialRemarks)
  const [showAddRemark, setShowAddRemark] = useState(false)
  const [remarkForm, setRemarkForm] = useState({ body: '', category: 'general', is_for_agency: false })
  const [showRsvpBlast, setShowRsvpBlast] = useState(false)
  const [blastSelected, setBlastSelected] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const confirmedWithPhone = guests.filter(g => g.rsvp_status === 'confirmed' && g.phone)
  const pendingGuests = guests.filter(g => g.rsvp_status === 'pending')
  const vendorsWithPhone = vendors.filter(v => v.phone)

  function handleAddRemark() {
    if (!remarkForm.body.trim()) return
    startTransition(async () => {
      const res = await addRemark(celebrationId, remarkForm)
      if ('error' in res) { toast.error(res.error); return }
      const newR: Remark = {
        id: res.id, body: remarkForm.body, category: remarkForm.category,
        is_for_agency: remarkForm.is_for_agency, resolved: false, created_at: new Date().toISOString(),
      }
      setRemarks(prev => [newR, ...prev])
      setRemarkForm({ body: '', category: 'general', is_for_agency: false })
      setShowAddRemark(false)
      toast.success('Note added')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-stone-800">Communications</p>
          <p className="text-xs text-stone-400">Messages for guests, vendors & family</p>
        </div>
        <button
          onClick={() => setShowAddRemark(v => !v)}
          className="flex items-center gap-1 bg-rose-700 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-rose-800 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Note
        </button>
      </div>

      {/* Quick actions */}
      <div className="bg-white border border-stone-100 rounded-xl p-4 space-y-3">
        <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Quick actions</p>
        <div className="space-y-2">
          <button
            onClick={() => {
              if (confirmedWithPhone.length === 0) { toast.error('No confirmed guests with phone numbers'); return }
              const nums = confirmedWithPhone.map(g => g.phone!.replace(/\D/g, '')).join('\n')
              navigator.clipboard.writeText(nums)
              toast.success(`${confirmedWithPhone.length} confirmed guest numbers copied`)
            }}
            className="w-full text-left flex items-center gap-3 p-3 bg-stone-50 rounded-xl hover:bg-green-50 transition-colors group"
          >
            <MessageCircle className="w-5 h-5 text-stone-400 group-hover:text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-stone-700">Copy confirmed guest numbers</p>
              <p className="text-xs text-stone-400">{confirmedWithPhone.length} numbers</p>
            </div>
          </button>
          <button
            onClick={() => {
              if (pendingGuests.filter(g => g.phone).length === 0) { toast.error('No pending guests with phone numbers'); return }
              setBlastSelected(new Set(pendingGuests.map(g => g.id)))
              setShowRsvpBlast(true)
            }}
            className="w-full text-left flex items-center gap-3 p-3 bg-stone-50 rounded-xl hover:bg-green-50 transition-colors group"
          >
            <MessageCircle className="w-5 h-5 text-stone-400 group-hover:text-green-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-stone-700">RSVP reminder blast</p>
              <p className="text-xs text-stone-400">{pendingGuests.length} pending guests</p>
            </div>
          </button>
          <button
            onClick={() => {
              if (vendorsWithPhone.length === 0) { toast.error('No vendors with phone numbers'); return }
              const nums = vendorsWithPhone.map(v => v.phone!.replace(/\D/g, '')).join('\n')
              navigator.clipboard.writeText(nums)
              toast.success(`${vendorsWithPhone.length} vendor numbers copied`)
            }}
            className="w-full text-left flex items-center gap-3 p-3 bg-stone-50 rounded-xl hover:bg-purple-50 transition-colors group"
          >
            <Phone className="w-5 h-5 text-stone-400 group-hover:text-purple-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-stone-700">Copy all vendor contacts</p>
              <p className="text-xs text-stone-400">{vendorsWithPhone.length} vendors</p>
            </div>
          </button>
        </div>
      </div>

      {/* Add note form */}
      {showAddRemark && (
        <div className="bg-white border border-rose-200 rounded-xl p-4 space-y-3">
          <textarea
            value={remarkForm.body}
            onChange={e => setRemarkForm(f => ({ ...f, body: e.target.value }))}
            placeholder="Write an important note… e.g. Seat bride's family in Hall A"
            className="w-full text-sm border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-rose-400 resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex gap-2 items-center flex-wrap">
            <select
              value={remarkForm.category}
              onChange={e => setRemarkForm(f => ({ ...f, category: e.target.value }))}
              className="text-xs px-2.5 py-1.5 border border-stone-200 bg-white rounded-lg focus:outline-none"
            >
              {['general', 'decor', 'catering', 'music', 'rituals', 'logistics', 'other'].map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs text-stone-600">
              <input
                type="checkbox"
                checked={remarkForm.is_for_agency}
                onChange={e => setRemarkForm(f => ({ ...f, is_for_agency: e.target.checked }))}
                className="rounded"
              />
              For agency
            </label>
            <div className="flex gap-2 ml-auto">
              <button onClick={() => setShowAddRemark(false)} className="text-xs text-stone-500 px-3 py-1.5">Cancel</button>
              <button
                onClick={handleAddRemark}
                disabled={!remarkForm.body.trim() || isPending}
                className="text-xs bg-rose-700 text-white px-4 py-1.5 rounded-lg hover:bg-rose-800 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {remarks.length === 0 && !showAddRemark && (
        <div className="text-center py-10 border border-dashed border-stone-200 rounded-xl">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 text-stone-200" />
          <p className="text-stone-500 text-sm">No notes yet</p>
          <button onClick={() => setShowAddRemark(true)} className="text-xs text-rose-600 mt-2">+ Add first note</button>
        </div>
      )}

      {remarks.map(r => (
        <div key={r.id} className={`bg-white border rounded-xl p-3.5 ${r.is_for_agency ? 'border-purple-100 bg-purple-50' : 'border-stone-100'}`}>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded font-medium">{r.category}</span>
                {r.is_for_agency && <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-medium">Agency</span>}
              </div>
              <p className="text-sm text-stone-700 leading-relaxed">{r.body}</p>
            </div>
            <button
              onClick={() => {
                setRemarks(prev => prev.filter(x => x.id !== r.id))
                startTransition(async () => { await deleteRemark(r.id) })
              }}
              className="text-stone-300 hover:text-red-400 flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {/* RSVP Blast modal */}
      {showRsvpBlast && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowRsvpBlast(false)} />
          <div className="relative bg-white rounded-t-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-stone-200 rounded-full" />
            </div>
            <div className="px-5 pb-3 flex items-center justify-between border-b border-stone-100 flex-shrink-0">
              <p className="font-semibold text-stone-800">RSVP Reminder Blast</p>
              <button onClick={() => setShowRsvpBlast(false)} className="text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
              {pendingGuests.filter(g => g.phone).map(g => (
                <label key={g.id} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={blastSelected.has(g.id)}
                    onChange={e => setBlastSelected(prev => {
                      const next = new Set(prev)
                      e.target.checked ? next.add(g.id) : next.delete(g.id)
                      return next
                    })}
                    className="rounded"
                  />
                  <span className="text-sm text-stone-700">{g.name}</span>
                  <span className="text-xs text-stone-400 ml-auto">{g.phone}</span>
                </label>
              ))}
            </div>
            <div className="px-5 py-4 border-t border-stone-100 flex-shrink-0">
              <button
                onClick={() => {
                  const selected = pendingGuests.filter(g => g.phone && blastSelected.has(g.id))
                  if (selected.length === 0) { toast.error('Select at least one guest'); return }
                  const nums = selected.map(g => g.phone!.replace(/\D/g, '')).join('\n')
                  navigator.clipboard.writeText(nums)
                  toast.success(`${selected.length} numbers copied — paste in WhatsApp`)
                  setShowRsvpBlast(false)
                }}
                className="w-full bg-green-600 text-white text-sm font-medium py-3 rounded-xl hover:bg-green-700 transition-colors"
              >
                Copy {blastSelected.size} numbers
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
