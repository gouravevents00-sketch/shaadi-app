'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { createCelebrationUser } from './action'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [mode, setMode] = useState<'signin' | 'signup'>(
    searchParams.get('mode') === 'signin' ? 'signin' : 'signup'
  )
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Enter your name'); return }
    setLoading(true)
    // Use server action — admin API auto-confirms email, no confirmation needed
    const res = await createCelebrationUser({ name, email, password })
    if ('error' in res) { toast.error(res.error); setLoading(false); return }
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signInErr) {
      toast.error('Account created but sign-in failed: ' + signInErr.message)
      setMode('signin')
    } else {
      toast.success('Welcome! Account created.')
      router.push('/celebrate/new')
    }
    setLoading(false)
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { toast.error(error.message); setLoading(false); return }
    router.push('/celebrate/new')
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-700 mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-stone-900">
            {mode === 'signup' ? 'Create your free account' : 'Welcome back'}
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {mode === 'signup' ? 'Start planning your celebration' : 'Continue planning your celebration'}
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-6">
          {mode === 'signup' ? (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <Label>Your name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Priya Sharma" className="mt-1" required autoFocus />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" className="mt-1" required />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 6 characters" className="mt-1" required minLength={6} />
              </div>
              <Button type="submit" className="w-full bg-rose-700 hover:bg-rose-800" disabled={loading}>
                {loading ? 'Creating account…' : "Create account — it's free"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" className="mt-1" required autoFocus />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="mt-1" required />
              </div>
              <Button type="submit" className="w-full bg-rose-700 hover:bg-rose-800" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </Button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-stone-500 mt-4">
          {mode === 'signup' ? (
            <>Already have an account?{' '}
              <button onClick={() => setMode('signin')} className="text-rose-700 font-medium hover:underline">Sign in</button>
            </>
          ) : (
            <>New here?{' '}
              <button onClick={() => setMode('signup')} className="text-rose-700 font-medium hover:underline">Create account</button>
            </>
          )}
        </p>

        <p className="text-center text-xs text-stone-400 mt-4">
          Are you a wedding planner or event company?{' '}
          <Link href="/login" className="text-rose-600 hover:underline">Sign in here instead</Link>
        </p>
      </div>
    </div>
  )
}

export default function CelebrationSignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
