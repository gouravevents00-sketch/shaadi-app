'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

interface InviteInfo {
  email: string
  role: string
  wedding_id?: string
  already_accepted?: boolean
  company: { name: string } | null
  wedding?: { bride_name: string; groom_name: string } | null
}

const ROLE_LABEL: Record<string, string> = {
  client: 'Client (Bride / Groom)',
  coordinator: 'Coordinator',
  bride_family: "Bride's Family",
  groom_family: "Groom's Family",
  hospitality: 'Hospitality Team',
  logistics: 'Logistics Team',
  fb_team: 'F&B Team',
  decor_team: 'Decor Team',
  photography: 'Photography',
  admin: 'Admin',
}

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(data => { setInvite(data); setPageLoading(false) })
      .catch(() => { setPageError('This invite link is invalid or has expired.'); setPageLoading(false) })
  }, [token])

  function dest(inv: InviteInfo) {
    return inv.role === 'client' && inv.wedding_id ? `/portal/${inv.wedding_id}` : '/dashboard'
  }

  async function acceptInvite(userId: string) {
    await fetch(`/api/invites/${token}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!invite) return
    setSubmitting(true)
    setStatusMsg('Signing in…')

    // Always try sign-in first
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: invite.email,
      password,
    })

    if (!signInError && signInData.user) {
      setStatusMsg('Redirecting…')
      await acceptInvite(signInData.user.id)
      window.location.href = dest(invite)
      return
    }

    // Account doesn't exist → try creating it
    setStatusMsg('Account not found — creating one…')
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: invite.email,
      password,
      options: {
        data: { name: name || invite.email.split('@')[0] },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(dest(invite))}`,
      },
    })

    if (signUpError) {
      // Account exists but wrong password
      setStatusMsg('')
      setSubmitting(false)
      if (signUpError.message.toLowerCase().includes('already')) {
        toast.error('Wrong password. Please try the correct password.')
      } else {
        toast.error(signUpError.message)
      }
      return
    }

    if (signUpData?.session) {
      setStatusMsg('Redirecting…')
      await acceptInvite(signUpData.user!.id)
      window.location.href = dest(invite)
      return
    }

    // signUp returned no session and no error → email confirmation still required
    setSubmitting(false)
    setStatusMsg('✉️ We sent a confirmation email. Confirm it then come back and sign in.')
  }

  if (pageLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <p className="text-stone-500 animate-pulse">Loading invite…</p>
    </div>
  )

  if (pageError) return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Invalid invite</CardTitle>
          <CardDescription>{pageError}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )

  const isClient = invite?.role === 'client'

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-700 mb-4">
            <span className="text-white text-2xl">✦</span>
          </div>
          <h1 className="text-2xl font-semibold text-stone-900">You're invited</h1>
          <p className="text-stone-500 text-sm mt-1">{invite?.company?.name}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {invite?.wedding
                ? `${invite.wedding.bride_name} & ${invite.wedding.groom_name}'s Wedding`
                : invite?.company?.name}
            </CardTitle>
            <CardDescription>
              Invited as <strong>{ROLE_LABEL[invite?.role ?? ''] ?? invite?.role}</strong>.
              {isClient
                ? ' Set a password to access your wedding portal.'
                : ' Set a password to get started.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input value={invite?.email ?? ''} disabled className="bg-stone-50" />
              </div>
              {!invite?.already_accepted && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Your name</Label>
                  <Input
                    id="name"
                    placeholder="Full name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoFocus
                />
              </div>

              {statusMsg && (
                <p className="text-sm text-stone-600 bg-stone-100 rounded-lg px-3 py-2">{statusMsg}</p>
              )}

              <Button
                type="submit"
                className="w-full bg-rose-700 hover:bg-rose-800"
                disabled={submitting}
              >
                {submitting ? 'Please wait…' : invite?.already_accepted ? 'Sign in' : 'Accept & get started'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
