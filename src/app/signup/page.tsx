'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { agencyPhoneLogin, setupAgencyProfile } from '@/app/(auth)/login/signup-action'
import { Button } from '@/components/ui/button'
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

  const [step, setStep] = useState<'phone' | 'profile'>('phone')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handlePhone(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!agreed) { toast.error('Please agree to Terms of Service and Privacy Policy'); return }
    const digits = phone.replace(/\D/g, '').slice(-10)
    if (digits.length !== 10) { toast.error('Enter a valid 10-digit mobile number'); return }
    setLoading(true)

    const res = await agencyPhoneLogin(digits)
    if ('error' in res) { toast.error(res.error); setLoading(false); return }

    const { error } = await supabase.auth.verifyOtp({ token_hash: res.hashed_token, type: 'email' })
    if (error) { toast.error('Login failed: ' + error.message); setLoading(false); return }

    if (res.hasProfile) {
      router.push('/dashboard')
      router.refresh()
    } else {
      setStep('profile')
    }
    setLoading(false)
  }

  async function handleProfile(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Enter your name'); return }
    if (!company.trim()) { toast.error('Enter your agency name'); return }
    setLoading(true)
    const res = await setupAgencyProfile({ name: name.trim(), companyName: company.trim(), phone: phone.replace(/\D/g, '').slice(-10) })
    if ('error' in res) { toast.error(res.error); setLoading(false); return }
    toast.success('Welcome to UtsavOS! 🎉')
    router.push('/dashboard?welcome=1')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-rose-700 flex-col justify-between p-12">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <span className="text-white text-sm font-bold">✦</span>
          </div>
          <span className="text-white font-semibold">UtsavOS</span>
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
                <CheckCircle2 className="w-4 h-4 text-rose-300 flex-shrink-0" />{p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-rose-300 text-xs">Trusted by event agencies across India</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-7 h-7 rounded-lg bg-rose-700 flex items-center justify-center">
              <span className="text-white text-xs font-bold">✦</span>
            </div>
            <span className="font-semibold text-stone-900 text-sm">UtsavOS</span>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-bold text-stone-900">
              {step === 'profile' ? 'Set up your workspace' : 'Create your account'}
            </h2>
            <p className="text-stone-500 text-sm mt-1">
              {step === 'profile' ? 'Almost done!' : 'Start your free trial — no credit card needed'}
            </p>
          </div>

          {step === 'phone' && (
            <form onSubmit={handlePhone} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1">Mobile number</label>
                <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden focus-within:border-rose-400 transition-colors bg-white">
                  <div className="flex items-center gap-1.5 px-3 py-2.5 bg-stone-50 border-r border-stone-200 flex-shrink-0">
                    <span className="text-sm">🇮🇳</span>
                    <span className="text-sm font-medium text-stone-600">+91</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98765 43210"
                    className="flex-1 px-3 py-2.5 text-sm bg-white focus:outline-none"
                    autoFocus
                    inputMode="numeric"
                    maxLength={10}
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                  className="mt-0.5 rounded border-stone-300 text-rose-700 focus:ring-rose-500" />
                <span className="text-xs text-stone-500 leading-relaxed">
                  I agree to Utsav's{' '}
                  <Link href="/terms" target="_blank" className="text-rose-700 hover:underline font-medium">Terms</Link>
                  {' '}and{' '}
                  <Link href="/privacy" target="_blank" className="text-rose-700 hover:underline font-medium">Privacy Policy</Link>.
                </span>
              </label>

              <Button type="submit" disabled={loading || !agreed || phone.replace(/\D/g, '').length !== 10}
                className="w-full bg-rose-700 hover:bg-rose-800 h-11 disabled:opacity-50">
                {loading
                  ? <><Sparkles className="w-4 h-4 mr-2 animate-spin" /> Signing in…</>
                  : <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </form>
          )}

          {step === 'profile' && (
            <form onSubmit={handleProfile} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1">Your name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Rahul Sharma"
                  className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-400" autoFocus />
              </div>
              <div>
                <label className="text-sm font-medium text-stone-700 block mb-1">Agency / Company name</label>
                <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="EventCraft Pvt Ltd"
                  className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-400" />
              </div>
              <Button type="submit" disabled={loading || !name.trim() || !company.trim()}
                className="w-full bg-rose-700 hover:bg-rose-800 h-11 disabled:opacity-50">
                {loading
                  ? <><Sparkles className="w-4 h-4 mr-2 animate-spin" /> Setting up…</>
                  : <>Create workspace <ArrowRight className="w-4 h-4 ml-2" /></>}
              </Button>
            </form>
          )}

          <p className="text-xs text-stone-400 text-center mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-rose-700 font-medium hover:underline">Sign in</Link>
          </p>
          <div className="mt-6 pt-5 border-t border-stone-200">
            <p className="text-xs text-stone-400 text-center">
              Planning your own wedding?{' '}
              <Link href="/celebrate/signup" className="text-rose-700 font-medium hover:underline">Personal planning →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
