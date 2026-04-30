'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Copy, Trash2, UserPlus, Mail } from 'lucide-react'
import {
  updateProfile, updateCompany, inviteTeamMember,
  updateMemberRole, removeMember, revokeInvite,
} from './actions'
import type { MemberRow } from './page'

type Props = {
  profile: { id: string; name: string; email: string; phone: string | null } | null
  company: { id: string; name: string; slug: string; plan: string } | null
  myRole: string
  members: MemberRow[]
  pendingInvites: { id: string; email: string; role: string; token: string; created_at: string; expires_at: string }[]
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner', admin: 'Admin', coordinator: 'Coordinator', viewer: 'Viewer',
}

const PLAN_LABELS: Record<string, string> = {
  trial: 'Trial', starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise',
}

export default function SettingsClient({ profile, company, myRole, members, pendingInvites }: Props) {
  const canManage = myRole === 'owner' || myRole === 'admin'

  // Profile form
  const [name, setName] = useState(profile?.name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [savingProfile, setSavingProfile] = useState(false)

  // Company form
  const [companyName, setCompanyName] = useState(company?.name ?? '')
  const [savingCompany, setSavingCompany] = useState(false)

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('coordinator')
  const [inviting, setInviting] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)

  // Members list (local state for role changes)
  const [membersList, setMembersList] = useState<MemberRow[]>(members)
  const [invitesList, setInvitesList] = useState(pendingInvites)

  async function handleSaveProfile() {
    setSavingProfile(true)
    const r = await updateProfile({ name, phone: phone || undefined })
    setSavingProfile(false)
    if ('error' in r) toast.error(r.error)
    else toast.success('Profile updated')
  }

  async function handleSaveCompany() {
    setSavingCompany(true)
    const r = await updateCompany({ name: companyName })
    setSavingCompany(false)
    if ('error' in r) toast.error(r.error)
    else toast.success('Company updated')
  }

  async function handleInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true)
    const r = await inviteTeamMember(inviteEmail, inviteRole)
    setInviting(false)
    if ('error' in r) { toast.error(r.error); return }
    const link = `${window.location.origin}/invite/${r.token}`
    setInviteLink(link)
    toast.success('Invite created')
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    const r = await updateMemberRole(memberId, newRole)
    if ('error' in r) { toast.error(r.error); return }
    setMembersList(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m))
    toast.success('Role updated')
  }

  async function handleRemove(memberId: string) {
    if (!confirm('Remove this team member?')) return
    const r = await removeMember(memberId)
    if ('error' in r) { toast.error(r.error); return }
    setMembersList(prev => prev.filter(m => m.id !== memberId))
    toast.success('Member removed')
  }

  async function handleRevoke(inviteId: string) {
    const r = await revokeInvite(inviteId)
    if ('error' in r) { toast.error(r.error); return }
    setInvitesList(prev => prev.filter(i => i.id !== inviteId))
    toast.success('Invite revoked')
  }

  function copyLink(link: string) {
    navigator.clipboard.writeText(link)
    toast.success('Link copied')
  }

  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Settings</h1>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="company">Company</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
        </TabsList>

        {/* ── Profile ── */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>Your personal account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14">
                  <AvatarFallback className="text-lg bg-rose-100 text-rose-700">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-stone-900">{profile?.email}</p>
                  <Badge variant="outline" className="mt-1 capitalize">{ROLE_LABELS[myRole] ?? myRole}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={profile?.email ?? ''} disabled className="bg-stone-50" />
                <p className="text-xs text-stone-400">Email cannot be changed here</p>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveProfile} disabled={savingProfile}>
                  {savingProfile ? 'Saving…' : 'Save profile'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Company ── */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
              <CardDescription>Visible across all events and portals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Company name</Label>
                  <Input
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    disabled={!canManage}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <Input value={company?.slug ?? ''} disabled className="bg-stone-50" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Plan</Label>
                <div>
                  <Badge variant="secondary" className="capitalize">
                    {PLAN_LABELS[company?.plan ?? ''] ?? company?.plan ?? '—'}
                  </Badge>
                </div>
              </div>
              {canManage && (
                <div className="flex justify-end">
                  <Button onClick={handleSaveCompany} disabled={savingCompany}>
                    {savingCompany ? 'Saving…' : 'Save company'}
                  </Button>
                </div>
              )}
              {!canManage && (
                <p className="text-sm text-stone-400">Only owner/admin can edit company details.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Team ── */}
        <TabsContent value="team">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <CardDescription>{membersList.length} member{membersList.length !== 1 ? 's' : ''}</CardDescription>
              </div>
              {canManage && (
                <Button size="sm" onClick={() => { setInviteOpen(true); setInviteLink(null); setInviteEmail(''); }}>
                  <UserPlus className="w-4 h-4 mr-2" /> Invite
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {membersList.map(m => (
                <div key={m.id} className="flex items-center gap-3 py-2 border-b border-stone-100 last:border-0">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs bg-stone-100 text-stone-600">
                      {m.users?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{m.users?.name ?? '—'}</p>
                    <p className="text-xs text-stone-400 truncate">{m.users?.email ?? '—'}</p>
                  </div>
                  {canManage ? (
                    <Select value={m.role} onValueChange={v => v && handleRoleChange(m.id, v)}>
                      <SelectTrigger className="w-32 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="coordinator">Coordinator</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge variant="outline" className="capitalize text-xs">{ROLE_LABELS[m.role] ?? m.role}</Badge>
                  )}
                  {canManage && m.role !== 'owner' && (
                    <button onClick={() => handleRemove(m.id)} className="text-stone-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {/* Pending invites */}
              {invitesList.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-2">Pending Invites</p>
                  {invitesList.map(inv => (
                    <div key={inv.id} className="flex items-center gap-3 py-2 border-b border-stone-100 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
                        <Mail className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-700 truncate">{inv.email}</p>
                        <p className="text-xs text-stone-400">
                          {ROLE_LABELS[inv.role] ?? inv.role} · expires {new Date(inv.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <button
                        onClick={() => copyLink(`${window.location.origin}/invite/${inv.token}`)}
                        className="text-stone-300 hover:text-stone-600 transition-colors"
                        title="Copy invite link"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {canManage && (
                        <button onClick={() => handleRevoke(inv.id)} className="text-stone-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
          </DialogHeader>
          {!inviteLink ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email address</Label>
                <Input
                  type="email"
                  placeholder="colleague@example.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={inviteRole} onValueChange={v => v && setInviteRole(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="coordinator">Coordinator</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
                <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
                  {inviting ? 'Sending…' : 'Create invite'}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-stone-600">Share this link with your team member. It expires in 7 days.</p>
              <div className="flex items-center gap-2 bg-stone-50 rounded-lg px-3 py-2 border">
                <p className="flex-1 text-xs text-stone-700 truncate font-mono">{inviteLink}</p>
                <Button size="sm" variant="ghost" onClick={() => copyLink(inviteLink)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={() => setInviteOpen(false)}>Done</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
