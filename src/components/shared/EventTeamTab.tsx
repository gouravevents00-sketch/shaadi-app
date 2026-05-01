'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { UserPlus, Trash2, Star, Copy, ExternalLink, Users } from 'lucide-react'
import {
  addToEventTeam, removeFromEventTeam, updateEventTeamRole, setProjectHead, inviteFreelancer,
} from '@/app/(dashboard)/shared/eventTeamActions'
import { EVENT_ROLES } from '@/app/(dashboard)/shared/teamConstants'

export type CompanyMember = {
  id: string; userId: string; name: string; email: string
  role: string; avatar_url: string | null
}
export type EventTeamMember = {
  id: string; userId: string; name: string; email: string
  role: string; is_project_head: boolean; is_freelancer: boolean; avatar_url: string | null
}

const ROLE_COLORS: Record<string, string> = {
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

function Initials({ name }: { name: string }) {
  return <>{name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}</>
}

export default function EventTeamTab({
  weddingId, orgEventId, eventDate,
  companyMembers, teamMembers, myRole, companyId, appUrl,
}: {
  weddingId: string | null
  orgEventId: string | null
  eventDate: string | null
  companyMembers: CompanyMember[]
  teamMembers: EventTeamMember[]
  myRole: string
  companyId: string
  appUrl: string
}) {
  const canManage = ['owner', 'admin', 'project_head'].includes(myRole)

  const [showAdd, setShowAdd] = useState(false)
  const [addUserId, setAddUserId] = useState('')
  const [addRole, setAddRole] = useState('coordinator')
  const [addingUser, setAddingUser] = useState(false)

  const [showFreelancer, setShowFreelancer] = useState(false)
  const [flEmail, setFlEmail] = useState('')
  const [flRole, setFlRole] = useState('coordinator')
  const [flExpiry, setFlExpiry] = useState(eventDate ?? '')
  const [flToken, setFlToken] = useState<string | null>(null)
  const [flLoading, setFlLoading] = useState(false)

  const assignedUserIds = teamMembers.map(m => m.userId)
  const unassigned = companyMembers.filter(m => !assignedUserIds.includes(m.userId))

  async function handleAdd() {
    if (!addUserId) return
    setAddingUser(true)
    const res = await addToEventTeam(weddingId, orgEventId, addUserId, addRole, false)
    setAddingUser(false)
    if ('error' in res) { toast.error(res.error); return }
    toast.success('Added to event team')
    setShowAdd(false)
    setAddUserId('')
    setAddRole('coordinator')
  }

  async function handleRemove(teamRowId: string, name: string) {
    if (!confirm(`Remove ${name} from this event?`)) return
    const res = await removeFromEventTeam(teamRowId, weddingId, orgEventId)
    if ('error' in res) toast.error(res.error)
    else toast.success('Removed from event')
  }

  async function handleRoleChange(teamRowId: string, role: string) {
    const res = await updateEventTeamRole(teamRowId, role, weddingId, orgEventId)
    if ('error' in res) toast.error(res.error)
    else toast.success('Role updated')
  }

  async function handleSetProjectHead(teamRowId: string, name: string) {
    const res = await setProjectHead(teamRowId, weddingId, orgEventId, companyId)
    if ('error' in res) toast.error(res.error)
    else toast.success(`${name} is now Project Head`)
  }

  async function handleFreelancerInvite() {
    if (!flEmail.trim()) return
    setFlLoading(true)
    const res = await inviteFreelancer(weddingId, orgEventId, flEmail, flRole, flExpiry || new Date().toISOString())
    setFlLoading(false)
    if ('error' in res) { toast.error(res.error); return }
    setFlToken(res.token ?? null)
  }

  const projectHead = teamMembers.find(m => m.is_project_head)
  const regularTeam = teamMembers.filter(m => !m.is_project_head)

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Event Team</h1>
          <p className="text-stone-500 text-sm mt-0.5">{teamMembers.length} assigned</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowFreelancer(true)}>
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Freelancer
            </Button>
            <Button size="sm" onClick={() => setShowAdd(true)} className="bg-rose-700 hover:bg-rose-800">
              <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Add member
            </Button>
          </div>
        )}
      </div>

      {/* Project Head highlight */}
      {projectHead ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Star className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <Avatar className="w-9 h-9 flex-shrink-0">
            <AvatarFallback className="bg-blue-100 text-blue-700 text-sm"><Initials name={projectHead.name} /></AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-900">{projectHead.name}</p>
            <p className="text-xs text-blue-600">{projectHead.email}</p>
          </div>
          <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Project Head</span>
        </div>
      ) : (
        <div className="border-2 border-dashed border-stone-200 rounded-xl p-4 text-center">
          <Star className="w-5 h-5 text-stone-300 mx-auto mb-1" />
          <p className="text-sm text-stone-400">No project head assigned yet</p>
          {canManage && teamMembers.length > 0 && (
            <p className="text-xs text-stone-400 mt-1">Click ★ next to a member to assign them</p>
          )}
        </div>
      )}

      {/* Team members */}
      {teamMembers.length === 0 ? (
        <div className="text-center py-10 text-stone-400">
          <Users className="w-8 h-8 mx-auto mb-2 text-stone-200" />
          <p className="text-sm">No team members assigned to this event</p>
          {canManage && <p className="text-xs mt-1">Add from your company team</p>}
        </div>
      ) : (
        <div className="space-y-2">
          {[...teamMembers].sort((a, b) => (b.is_project_head ? 1 : 0) - (a.is_project_head ? 1 : 0))
            .filter(m => !m.is_project_head)
            .map(m => (
            <div key={m.id} className="bg-white border border-stone-200 rounded-xl px-4 py-3 flex items-center gap-3">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-stone-100 text-stone-600 text-xs"><Initials name={m.name} /></AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate flex items-center gap-1.5">
                  {m.name}
                  {m.is_freelancer && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 rounded-full">Freelancer</span>}
                </p>
                <p className="text-xs text-stone-400 truncate">{m.email}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {canManage ? (
                  <Select value={m.role} onValueChange={v => v && handleRoleChange(m.id, v)}>
                    <SelectTrigger className={`h-7 text-xs border-0 px-2 font-medium gap-1 ${ROLE_COLORS[m.role] || 'bg-stone-100 text-stone-600'}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_ROLES.map(r => (
                        <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role] || 'bg-stone-100 text-stone-600'}`}>
                    {EVENT_ROLES.find(r => r.value === m.role)?.label ?? m.role}
                  </span>
                )}
                {canManage && (
                  <>
                    <button
                      onClick={() => handleSetProjectHead(m.id, m.name)}
                      title="Set as project head"
                      className="text-stone-300 hover:text-blue-500 transition-colors p-1"
                    >
                      <Star className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRemove(m.id, m.name)}
                      className="text-stone-300 hover:text-red-500 transition-colors p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add from team dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add team member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1">Select member</label>
              <Select value={addUserId} onValueChange={v => v && setAddUserId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose from company team…" />
                </SelectTrigger>
                <SelectContent>
                  {unassigned.length === 0
                    ? <SelectItem value="_none" disabled>All company members already assigned</SelectItem>
                    : unassigned.map(m => (
                      <SelectItem key={m.userId} value={m.userId}>
                        {m.name} <span className="text-stone-400 ml-1 text-xs">({m.email})</span>
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1">Role on this event</label>
              <Select value={addRole} onValueChange={v => v && setAddRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_ROLES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} disabled={!addUserId || addingUser} className="bg-rose-700 hover:bg-rose-800">
              {addingUser ? 'Adding…' : 'Add to event'}
            </Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Freelancer invite dialog */}
      <Dialog open={showFreelancer} onOpenChange={v => { setShowFreelancer(v); if (!v) { setFlToken(null); setFlEmail('') } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite freelancer / external staff</DialogTitle></DialogHeader>
          {flToken ? (
            <div className="space-y-3">
              <p className="text-sm text-stone-600">Share this invite link. Access expires after event date.</p>
              <div className="flex gap-2">
                <Input value={`${appUrl}/invite/accept?token=${flToken}`} readOnly className="text-xs" />
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(`${appUrl}/invite/accept?token=${flToken}`); toast.success('Copied') }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1">Email</label>
                <Input value={flEmail} onChange={e => setFlEmail(e.target.value)} placeholder="freelancer@example.com" />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1">Role</label>
                <Select value={flRole} onValueChange={v => v && setFlRole(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1">Access expires on</label>
                <Input type="date" value={flExpiry} onChange={e => setFlExpiry(e.target.value)} />
                <p className="text-xs text-stone-400 mt-1">They lose access after this date</p>
              </div>
            </div>
          )}
          <DialogFooter>
            {!flToken && (
              <Button onClick={handleFreelancerInvite} disabled={flLoading || !flEmail.trim()} className="bg-rose-700 hover:bg-rose-800">
                {flLoading ? 'Creating…' : 'Create invite'}
              </Button>
            )}
            <Button variant="outline" onClick={() => { setShowFreelancer(false); setFlToken(null); setFlEmail('') }}>
              {flToken ? 'Done' : 'Cancel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
