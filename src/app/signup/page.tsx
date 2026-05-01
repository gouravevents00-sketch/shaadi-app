'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { signupWithCompany } from '@/app/(auth)/login/signup-action'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react'

const PERKS = [
  'Unlimited weddings & events',
  'Team management with role-based access',
  'AI assistant in Hinglish',
  'Guest, vendor, finance, ground control',
  'Client portal & documents',
]

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Enter your name'); return }
    if (!company.trim()) { toast.error('Enter your agency / company name'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }

    setLoading(true)
    const res = await signupWithCompany({ name, email, password, companyName: company })
    if ('error' in res) { toast.error(res.error); setLoading(false); return }

    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
    if (signInErr) {
      toast.error('Account created — please sign in')
      router.push('/login')
    } else {
      router.push('/dashboard?welcome=1')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-rose-700 flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <span className="text-white text-sm font-bold">✦</span>
          </div>
          <span className="text-white font-semibold">Creative Era OS</span>
        </div>

        <div>
          <h1 className="text-3xl font-bold text-white leading-tight mb-4">
            The OS for event<br />management agencies
          </h1>
          <p className="text-rose-200 text-sm mb-8">
            Everything you need to manage weddings, corporate events, and your entire team — in one platform.
          </p>
          <ul className="space-y-3">
            {PERKS.map(p => (
              <li key={p} className="flex items-center gap-2.5 text-sm text-rose-100">
                <CheckCircle2 className="w-4 h-4 text-rose-300 flex-shrink-0" />
                {p}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-rose-300 text-xs">
          Trusted by event agencies across India
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-rose-700 flex items-center justify-center">
              <span className="text-white text-xs font-bold">✦</span>
            </div>
            <span className="font-semibold text-stone-900 text-sm">Creative Era OS</span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-stone-900">Create your account</h2>
            <p className="text-stone-500 text-sm mt-1">Start your free trial — no credit card needed</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1">Your name</label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Rahul Sharma"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1">Agency / Company name</label>
              <Input
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="EventCraft Pvt Ltd"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1">Work email</label>
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="rahul@eventcraft.in"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 block mb-1">Password</label>
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-700 hover:bg-rose-800 h-11"
            >
              {loading
                ? <><Sparkles className="w-4 h-4 mr-2 animate-spin" /> Setting up…</>
                : <>Create account <ArrowRight className="w-4 h-4 ml-2" /></>
              }
            </Button>
          </form>

          <p className="text-xs text-stone-400 text-center mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-rose-700 font-medium hover:underline">Sign in</Link>
          </p>

          <div className="mt-6 pt-5 border-t border-stone-200">
            <p className="text-xs text-stone-400 text-center">
              Planning your own wedding?{' '}
              <Link href="/celebrate/signup" className="text-rose-700 font-medium hover:underline">
                Personal planning →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
