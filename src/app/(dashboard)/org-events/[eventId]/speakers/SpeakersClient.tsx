'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Trash2, Mic, Link as LinkIcon, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { createSpeaker, updateSpeaker, deleteSpeaker } from './actions'

type SpeakerStatus = 'invited' | 'confirmed' | 'declined'

interface Speaker {
  id: string
  name: string
  title: string | null
  organization: string | null
  phone: string | null
  email: string | null
  bio: string | null
  linkedin_url: string | null
  fill_token: string
  status: SpeakerStatus
  token_filled_at: string | null
}

const STATUS_COLORS: Record<SpeakerStatus, string> = {
  invited: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  declined: 'bg-red-100 text-red-600',
}

const EMPTY_FORM = {
  name: '', title: '', organization: '', phone: '', email: '', bio: '', linkedin_url: '',
}

export default function SpeakersClient({
  eventId,
  initialSpeakers,
  baseUrl,
}: {
  eventId: string
  initialSpeakers: Speaker[]
  baseUrl: string
}) {
  const [speakers, setSpeakers] = useState<Speaker[]>(initialSpeakers)
  const [open, setOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Speaker | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [linkDialog, setLinkDialog] = useState<Speaker | null>(null)

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }
  function openCreate() { setEditTarget(null); setForm(EMPTY_FORM); setOpen(true) }
  function openEdit(s: Speaker) {
    setEditTarget(s)
    setForm({
      name: s.name, title: s.title ?? '', organization: s.organization ?? '',
      phone: s.phone ?? '', email: s.email ?? '', bio: s.bio ?? '',
      linkedin_url: s.linkedin_url ?? '',
    })
    setOpen(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setLoading(true)
    const payload = {
      name: form.name.trim(),
      title: form.title.trim() || null,
      organization: form.organization.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      bio: form.bio.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
    }
    if (editTarget) {
      const res = await updateSpeaker(eventId, editTarget.id, payload)
      if (res.error) { toast.error(res.error); setLoading(false); return }
      setSpeakers(ss => ss.map(s => s.id === editTarget.id ? { ...s, ...payload } : s))
      toast.success('Speaker updated')
    } else {
      const res = await createSpeaker(eventId, payload)
      if (res.error) { toast.error(res.error); setLoading(false); return }
      setSpeakers(ss => [...ss, {
        ...payload, id: res.id!, fill_token: res.fill_token!,
        status: 'invited', token_filled_at: null,
      }])
      toast.success('Speaker added')
    }
    setLoading(false)
    setOpen(false)
  }

  async function handleDelete(id: string) {
    const res = await deleteSpeaker(eventId, id)
    if (res.error) { toast.error(res.error); return }
    setSpeakers(ss => ss.filter(s => s.id !== id))
    toast.success('Deleted')
  }

  async function handleStatusChange(s: Speaker, status: SpeakerStatus) {
    const res = await updateSpeaker(eventId, s.id, { status })
    if (res.error) { toast.error(res.error); return }
    setSpeakers(ss => ss.map(x => x.id === s.id ? { ...x, status } : x))
  }

  function getSelfFillUrl(token: string) {
    return `${baseUrl}/speaker/${token}`
  }

  function copyLink(token: string) {
    navigator.clipboard.writeText(getSelfFillUrl(token))
    toast.success('Link copied to clipboard')
  }

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Speakers</h1>
          <p className="text-stone-500 text-sm mt-0.5">{speakers.length} speaker{speakers.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate} className="bg-stone-900 hover:bg-stone-800">
          <Plus className="w-4 h-4 mr-1.5" /> Add speaker
        </Button>
      </div>

      {speakers.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-stone-200 rounded-xl">
          <Mic className="w-10 h-10 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 font-medium">No speakers yet</p>
          <p className="text-stone-400 text-sm mt-1">Add speakers and share a self-fill link for their bio and details.</p>
          <Button onClick={openCreate} className="mt-4 bg-stone-900 hover:bg-stone-800">
            <Plus className="w-4 h-4 mr-1.5" /> Add speaker
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {speakers.map(s => (
            <div key={s.id} className="border border-stone-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-stone-600 font-medium text-sm">{s.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-stone-900">{s.name}</p>
                      <Badge className={`${STATUS_COLORS[s.status]} border-0 text-xs capitalize`}>{s.status}</Badge>
                      {s.token_filled_at && (
                        <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Self-filled</span>
                      )}
                    </div>
                    {(s.title || s.organization) && (
                      <p className="text-sm text-stone-500 mt-0.5">
                        {s.title}{s.title && s.organization ? ' · ' : ''}{s.organization}
                      </p>
                    )}
                    {s.bio && <p className="text-sm text-stone-600 mt-1 line-clamp-2">{s.bio}</p>}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-stone-400">
                      {s.phone && <span>{s.phone}</span>}
                      {s.email && <span>{s.email}</span>}
                      {s.linkedin_url && (
                        <a href={s.linkedin_url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-500 hover:text-blue-700"
                          onClick={e => e.stopPropagation()}>
                          <LinkIcon className="w-3 h-3" /> LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Status */}
                  <select
                    value={s.status}
                    onChange={e => handleStatusChange(s, e.target.value as SpeakerStatus)}
                    className="text-xs border border-stone-200 rounded-md px-2 py-1 text-stone-600 bg-white"
                  >
                    <option value="invited">Invited</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="declined">Declined</option>
                  </select>
                  {/* Self-fill link */}
                  <button
                    onClick={() => setLinkDialog(s)}
                    title="Speaker self-fill link"
                    className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => openEdit(s)} className="text-xs text-stone-400 hover:text-stone-700">Edit</button>
                  <button onClick={() => handleDelete(s.id)} className="text-stone-300 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit speaker' : 'Add speaker'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Full name *</Label>
              <Input placeholder="e.g. Dr. Priya Sharma" value={form.name} onChange={e => setF('name', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Title / Designation</Label>
                <Input placeholder="e.g. CEO" value={form.title} onChange={e => setF('title', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Organization</Label>
                <Input placeholder="e.g. Acme Corp" value={form.organization} onChange={e => setF('organization', e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input placeholder="+91 98765 43210" value={form.phone} onChange={e => setF('phone', e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" placeholder="name@org.com" value={form.email} onChange={e => setF('email', e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>LinkedIn URL</Label>
              <Input placeholder="https://linkedin.com/in/…" value={form.linkedin_url} onChange={e => setF('linkedin_url', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Bio</Label>
              <textarea
                placeholder="Short speaker bio…"
                value={form.bio}
                onChange={e => setF('bio', e.target.value)}
                rows={3}
                className="w-full border border-stone-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-stone-400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-stone-900 hover:bg-stone-800" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving…' : editTarget ? 'Update' : 'Add speaker'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Self-fill link dialog */}
      <Dialog open={!!linkDialog} onOpenChange={() => setLinkDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Speaker self-fill link</DialogTitle>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <p className="text-sm text-stone-600">
              Share this link with <strong>{linkDialog?.name}</strong> so they can fill in their own bio, photo, and profile details.
            </p>
            <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg p-3">
              <p className="text-xs text-stone-700 flex-1 break-all font-mono">
                {linkDialog ? getSelfFillUrl(linkDialog.fill_token) : ''}
              </p>
              <button
                onClick={() => linkDialog && copyLink(linkDialog.fill_token)}
                className="text-stone-500 hover:text-stone-900 flex-shrink-0"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            {linkDialog?.token_filled_at && (
              <p className="text-xs text-emerald-600">
                ✓ Speaker filled this form on {new Date(linkDialog.token_filled_at).toLocaleDateString('en-IN')}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => { linkDialog && copyLink(linkDialog.fill_token); setLinkDialog(null) }}>
              <Copy className="w-4 h-4 mr-1.5" /> Copy & close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
