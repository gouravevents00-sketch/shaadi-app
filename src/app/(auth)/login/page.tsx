'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { signupWithCompany } from './signup-action'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'signin' | 'signup' | 'magic'>('signin')

  // signup extras
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')

  const supabase = createClient()

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error(error.message)
    } else {
      router.push(next)
      router.refresh()
    }
    setLoading(false)
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Enter your name'); return }
    if (!companyName.trim()) { toast.error('Enter your company / agency name'); return }
    setLoading(true)
    const res = await signupWithCompany({ name, email, password, companyName })
    if ('error' in res) {
      toast.error(res.error)
      setLoading(false)
      return
    }
    // Sign in immediately after signup
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('Account created — please sign in')
      setMode('signin')
    } else {
      toast.success('Welcome! Account created.')
      router.push(next)
      router.refresh()
    }
    setLoading(false)
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${next}` },
    })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Check your email for a login link')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-700 mb-4">
            <span className="text-white text-2xl">✦</span>
          </div>
          <h1 className="text-2xl font-semibold text-stone-900">Creative Era OS</h1>
          <p className="text-stone-500 text-sm mt-1">Wedding & Event Management for Professionals</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {mode === 'signup' ? 'Create account' : 'Sign in'}
            </CardTitle>
            <CardDescription>
              {mode === 'signup'
                ? 'Set up your agency workspace'
                : 'Sign in to your agency dashboard'}
            </CardDescription>
          </CardHeader>
          <CardContent>

            {/* ── Sign In ── */}
            {mode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@company.com"
                    value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="••••••••"
                    value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
                </div>
                <Button type="submit" className="w-full bg-rose-700 hover:bg-rose-800" disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
                <div className="flex flex-col gap-2 pt-1">
                  <button type="button" onClick={() => setMode('magic')}
                    className="text-center text-sm text-stone-500 hover:text-stone-700">
                    Sign in with magic link instead →
                  </button>
                </div>
              </form>
            )}

            {/* ── Sign Up ── */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Your name</Label>
                  <Input placeholder="Rahul Sharma" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Agency / company name</Label>
                  <Input placeholder="Dream Weddings Co." value={companyName} onChange={e => setCompanyName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input type="email" placeholder="you@company.com"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Password</Label>
                  <Input type="password" placeholder="Min. 6 characters"
                    value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                </div>
                <Button type="submit" className="w-full bg-rose-700 hover:bg-rose-800" disabled={loading}>
                  {loading ? 'Creating account…' : 'Create account'}
                </Button>
              </form>
            )}

            {/* ── Magic Link ── */}
            {mode === 'magic' && (
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@company.com"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full bg-rose-700 hover:bg-rose-800" disabled={loading}>
                  {loading ? 'Sending…' : 'Send magic link'}
                </Button>
                <button type="button" onClick={() => setMode('signin')}
                  className="w-full text-center text-sm text-stone-500 hover:text-stone-700">
                  ← Back to password sign in
                </button>
              </form>
            )}

          </CardContent>
        </Card>

        {/* Toggle sign in / sign up */}
        <p className="text-center text-sm text-stone-500 mt-4">
          {mode === 'signup' ? (
            <>Already have an account?{' '}
              <button onClick={() => setMode('signin')} className="text-rose-700 font-medium hover:underline">Sign in</button>
            </>
          ) : (
            <>New agency?{' '}
              <button onClick={() => setMode('signup')} className="text-rose-700 font-medium hover:underline">Create account</button>
            </>
          )}
        </p>
        <p className="text-center text-xs text-stone-400 mt-3">
          Planning your own celebration?{' '}
          <a href="/celebrate" className="text-rose-600 hover:underline">Start here instead →</a>
        </p>
      </div>
    </div>
  )
}
