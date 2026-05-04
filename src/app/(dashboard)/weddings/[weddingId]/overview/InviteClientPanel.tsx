'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Link2, Mail, Copy, Check, ChevronDown, ChevronUp, Users2 } from 'lucide-react'
import { generateClientInvite } from './actions'

interface Requirement {
  id: string
  title: string
  priority: string
  status: string
  side: string
  created_at: string
}

interface Props {
  weddingId: string
  requirements: Requirement[]
  existingInvites: { email: string; accepted_at: string | null; token: string }[]
  clientInviteToken?: string | null
}

const PRIORITY_COLOR: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-stone-100 text-stone-500',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Open',
  in_progress: 'In Progress',
  done: 'Done',
}

export default function InviteClientPanel({ weddingId, requirements, existingInvites, clientInviteToken }: Props) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showReqs, setShowReqs] = useState(false)
  const [masterCopied, setMasterCopied] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const masterLink = clientInviteToken ? `${baseUrl}/client-onboard/${clientInviteToken}` : null

  const accepted = existingInvites.filter(i => i.accepted_at)
  const pending  = existingInvites.filter(i => !i.accepted_at)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    const res = await generateClientInvite(weddingId, email)
    if ('error' in res) {
      toast.error(res.error)
    } else {
      const link = `${baseUrl}/invite/${res.token}`
      setGeneratedLink(link)
      setEmail('')
    }
    setLoading(false)
  }

  async function copyLink(link: string) {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success('Link copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const openReqs = requirements.filter(r => r.status !== 'done')
  const doneReqs = requirements.filter(r => r.status === 'done')

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <Users2 className="w-4 h-4 text-rose-500" />
          <span className="text-sm font-semibold text-stone-800">Client Portal</span>
          {accepted.length > 0 && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              {accepted.length} active
            </span>
          )}
          {pending.length > 0 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
              {pending.length} invite pending
            </span>
          )}
        </div>
        <button onClick={() => setOpen(o => !o)} className="text-stone-400 hover:text-stone-600">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsed summary */}
      {!open && requirements.length > 0 && (
        <div className="px-4 py-2.5 text-sm text-stone-500">
          {openReqs.length > 0
            ? <><span className="font-medium text-stone-700">{openReqs.length}</span> open client requirement{openReqs.length !== 1 ? 's' : ''}</>
            : 'All client requirements addressed'}
          {accepted.length === 0 && (
            <span className="ml-3 text-rose-500 font-medium">· No client logged in yet</span>
          )}
        </div>
      )}
      {!open && requirements.length === 0 && (
        <div className="px-4 py-2.5 text-sm text-stone-400">
          Share portal link with bride/groom to collect their preferences
        </div>
      )}

      {/* Expanded */}
      {open && (
        <div className="p-4 space-y-4">
          {/* Master form invite link — NEW */}
          {masterLink && (
            <div className="bg-purple-50 border border-purple-100 rounded-xl p-3.5">
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-1.5">Client Onboarding Link (New)</p>
              <p className="text-xs text-purple-600 mb-2.5">Client yeh link khol ke apni details bharta hai → uska personal dashboard + aapke saath connected</p>
              <div className="flex items-center gap-2 bg-white border border-purple-200 rounded-lg px-3 py-2">
                <code className="text-xs text-stone-600 flex-1 truncate">{masterLink}</code>
                <button onClick={async () => {
                  await navigator.clipboard.writeText(masterLink)
                  setMasterCopied(true)
                  toast.success('Link copied!')
                  setTimeout(() => setMasterCopied(false), 2000)
                }} className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 flex-shrink-0 font-medium">
                  {masterCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {masterCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
          {/* Accepted clients */}
          {accepted.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Logged in</p>
              {accepted.map(inv => (
                <div key={inv.token} className="flex items-center gap-2 text-sm text-stone-700">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  {inv.email}
                </div>
              ))}
            </div>
          )}

          {/* Pending invites */}
          {pending.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Invite sent, not accepted</p>
              {pending.map(inv => (
                <div key={inv.token} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 text-stone-500">{inv.email}</span>
                  <button
                    onClick={() => copyLink(`${baseUrl}/invite/${inv.token}`)}
                    className="flex items-center gap-1 text-xs text-stone-400 hover:text-stone-700"
                  >
                    <Link2 className="w-3 h-3" /> Copy link
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Generate new invite */}
          <div>
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2">Invite client</p>
            <form onSubmit={handleGenerate} className="flex gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-stone-400" />
                <input
                  type="email"
                  placeholder="client@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full pl-8 pr-3 py-2 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-200"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-3 py-2 text-sm bg-rose-700 text-white rounded-lg hover:bg-rose-800 disabled:opacity-50"
              >
                {loading ? '…' : 'Generate'}
              </button>
            </form>

            {generatedLink && (
              <div className="mt-2 flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2">
                <span className="flex-1 text-xs text-stone-500 truncate">{generatedLink}</span>
                <button
                  onClick={() => copyLink(generatedLink)}
                  className="flex items-center gap-1 text-xs text-stone-600 hover:text-stone-900 flex-shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            )}
          </div>

          {/* Requirements */}
          {requirements.length > 0 && (
            <div>
              <button
                onClick={() => setShowReqs(s => !s)}
                className="flex items-center gap-1.5 text-xs font-semibold text-stone-400 uppercase tracking-wider mb-2 hover:text-stone-600"
              >
                Client requirements ({requirements.length})
                {showReqs ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showReqs && (
                <div className="space-y-1.5">
                  {[...openReqs, ...doneReqs].map(req => (
                    <div key={req.id} className="flex items-start gap-2 text-sm py-1">
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${PRIORITY_COLOR[req.priority]}`}>
                        {req.priority}
                      </span>
                      <span className={`flex-1 ${req.status === 'done' ? 'line-through text-stone-400' : 'text-stone-700'}`}>
                        {req.title}
                      </span>
                      <span className="text-xs text-stone-400 flex-shrink-0">{STATUS_LABEL[req.status]}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {requirements.length === 0 && accepted.length > 0 && (
            <p className="text-sm text-stone-400">Client hasn't submitted any requirements yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
