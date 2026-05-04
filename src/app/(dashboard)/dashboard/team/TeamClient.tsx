'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { UserPlus, Trash2, Copy, Mail, CalendarDays, Shield, ChevronDown } from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { inviteMember, updateMemberRole, removeMember, revokeInvite } from './actions'
import { COMPANY_ROLES } from '@/app/(dashboard)/shared/teamConstants'

type Member = {
  id: string; userId: string; name: string; email: string
  role: string; avatar_url: string | null; created_at: string; eventCount: number
}
type Invite = { id: string; email: string; role: string; token: string; created_at: string; expires_at: string | null }

const ROLE_COLORS: Record<string, string> = {
  owner:        'bg-rose-100 text-rose-700',
  admin:        'bg-purple-100 text-purple-700',
  project_head: 'bg-blue-100 text-blue-700',
  coordinator:  'bg-emerald-100 text-emerald-700',
  accounts:     'bg-amber-100 text-amber-700',
  logistics:    'bg-cyan-100 text-cyan-700',
  hospitality:  'bg-pink-100 text-pink-700',
  fb_team:      'bg-orange-100 text-orange-700',
  decor_team:   'bg-violet-100 text-violet-700',
  creative:     'bg-indigo-100 text-indigo-700',
  photography:  'bg-teal-100 text-teal-700',
  view_only:    'bg-stone-100 text-stone-500',
}

function roleLabel(role: string) {
  return COMPANY_ROLES.find(r => r.value === role)?.label ?? role
}

export default function TeamClient({
  myRole, members, pendingInvites, appUrl,
}: {
  myRole: string
  members: Member[]
  pendingInvites: Invite[]
  appUrl: string
}) {
  const canManage = myRole === 'owner' || myRole === 'admin'
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('coordinator')
  const [inviting, setInviting] = useState(false)
  const [newToken, setNewToken] = useState<string | null>(null)

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    const res = await inviteMember(inviteEmail.trim(), inviteRole)
    setInviting(false)
    if ('error' in res) { toast.error(res.error); return }
    setNewToken(res.token ?? null)
    setInviteEmail('')
  }

  async function handleRoleChange(memberId: string, role: string) {
    const res = await updateMemberRole(memberId, role)
    if ('error' in res) toast.error(res.error)
    else toast.success('Role updated')
  }

  async function handleRemove(memberId: string, name: string) {
    if (!confirm(`Remove ${name} from the team?`)) return
    const res = await removeMember(memberId)
    if ('error' in res) toast.error(res.error)
    else toast.success('Member removed')
  }

  async function handleRevoke(inviteId: string) {
    const res = await revokeInvite(inviteId)
    if ('error' in res) toast.error(res.error)
    else toast.success('Invite revoked')
  }

  const base = (typeof window !== 'undefined' && window.location.origin !== 'null') ? window.location.origin : appUrl
  const inviteLink = newToken ? `${base}/invite/${newToken}` : null

  return (
    <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Team</h1>
          <p className="text-stone-500 text-sm mt-1">{members.length} member{members.length !== 1 ? 's' : ''} · {pendingInvites.length} pending invite{pendingInvites.length !== 1 ? 's' : ''}</p>
        </div>
        {canManage && (
          <Button onClick={() => setShowInvite(true)} className="bg-rose-700 hover:bg-rose-800">
            <UserPlus className="w-4 h-4 mr-2" /> Invite member
          </Button>
        )}
      </div>

      {/* Role legend */}
      <div className="bg-stone-50 rounded-xl p-4">
        <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" /> Role permissions
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {COMPANY_ROLES.map(r => (
            <div key={r.value} className="flex items-start gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_COLORS[r.value]}`}>
                {r.label}
              </span>
              <span className="text-xs text-stone-400 leading-tight pt-0.5">{r.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Members list */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Active members</h2>
        {members.map(m => (
          <div key={m.id} className="bg-white border border-stone-200 rounded-xl px-4 py-3 flex items-center gap-3">
            <Avatar className="w-9 h-9 flex-shrink-0">
              <AvatarFallback className="bg-stone-100 text-stone-600 text-sm">
                {m.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-900 truncate">{m.name}</p>
              <p className="text-xs text-stone-400 truncate">{m.email}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {m.eventCount > 0 && (
                <span className="text-xs text-stone-400 flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> {m.eventCount}
                </span>
              )}
              {canManage && m.role !== 'owner' ? (
                <Select value={m.role} onValueChange={v => v && handleRoleChange(m.id, v)}>
                  <SelectTrigger className={`h-7 text-xs border-0 px-2 font-medium gap-1 ${ROLE_COLORS[m.role] || 'bg-stone-100 text-stone-600'}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_ROLES.filter(r => r.value !== 'owner').map(r => (
                      <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role] || 'bg-stone-100 text-stone-600'}`}>
                  {roleLabel(m.role)}
                </span>
              )}
              {canManage && m.role !== 'owner' && (
                <button
                  onClick={() => handleRemove(m.id, m.name)}
                  className="text-stone-300 hover:text-red-500 transition-colors p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider">Pending invites</h2>
          {pendingInvites.map(inv => (
            <div key={inv.id} className="bg-stone-50 border border-dashed border-stone-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <Mail className="w-4 h-4 text-stone-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-700 truncate">{inv.email}</p>
                <p className="text-xs text-stone-400">Invite sent · {new Date(inv.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${ROLE_COLORS[inv.role] || 'bg-stone-100 text-stone-600'}`}>
                {roleLabel(inv.role)}
              </span>
              {canManage && (
                <DropdownMenu>
                  <DropdownMenuTrigger className="text-stone-400 hover:text-stone-600 p-1">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      const link = `${typeof window !== 'undefined' ? window.location.origin : appUrl}/invite/${inv.token}`
                      navigator.clipboard.writeText(link)
                      toast.success('Link copied')
                    }}>
                      <Copy className="w-3.5 h-3.5 mr-2" /> Copy invite link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRevoke(inv.id)} className="text-red-600">
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Revoke
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={v => { setShowInvite(v); if (!v) { setNewToken(null); setInviteEmail('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite team member</DialogTitle>
          </DialogHeader>
          {newToken ? (
            <div className="space-y-4">
              <p className="text-sm text-stone-600">Invite created. Share this link:</p>
              <div className="flex gap-2">
                <Input value={inviteLink!} readOnly className="text-xs" />
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(inviteLink!); toast.success('Copied') }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-stone-400">Or send the link via WhatsApp / email manually.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1">Email</label>
                <Input
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  onKeyDown={e => e.key === 'Enter' && handleInvite()}
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1">Role</label>
                <Select value={inviteRole} onValueChange={v => v && setInviteRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_ROLES.filter(r => r.value !== 'owner').map(r => (
                      <SelectItem key={r.value} value={r.value}>
                        <span className="font-medium">{r.label}</span>
                        <span className="text-stone-400 ml-2 text-xs">{r.desc}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            {!newToken && (
              <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()} className="bg-rose-700 hover:bg-rose-800">
                {inviting ? 'Sending…' : 'Send invite'}
              </Button>
            )}
            <Button variant="outline" onClick={() => { setShowInvite(false); setNewToken(null); setInviteEmail('') }}>
              {newToken ? 'Done' : 'Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
