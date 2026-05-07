'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Sparkles, ArrowRight } from 'lucide-react'
import { phoneLogin, savePhoneProfile } from './action'

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const next = searchParams.get('next') || '/my'

  const [step, setStep] = useState<'phone' | 'name'>('phone')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePhone(e: { preventDefault(): void }) {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '').slice(-10)
    if (digits.length !== 10) { toast.error('Enter a valid 10-digit mobile number'); return }
    setLoading(true)

    const res = await phoneLogin(digits)
    if ('error' in res) { toast.error(res.error); setLoading(false); return }

    // Use server token to create client session
    const { error } = await supabase.auth.verifyOtp({
      token_hash: res.hashed_token,
      type: 'email',
    })
    if (error) { toast.error('Login failed: ' + error.message); setLoading(false); return }

    if (res.hasProfile) {
      router.push(next)
      router.refresh()
    } else {
      setUserId(res.userId)
      setStep('name')
    }
    setLoading(false)
  }

  async function handleName(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Enter your name'); return }
    setLoading(true)
    try {
      const res = await savePhoneProfile({ name: name.trim(), userId, phone: phone.replace(/\D/g, '').slice(-10) })
      if ('error' in res) { toast.error(res.error); return }
      toast.success('Welcome to Utsav! 🎉')
      router.push('/celebrate/new')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-700 mb-4">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-stone-900">
            {step === 'name' ? 'One last thing' : 'Welcome to Utsav'}
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {step === 'phone' ? 'Enter your mobile number to continue' : 'What should we call you?'}
          </p>
        </div>

        <div className="bg-white border border-stone-200 rounded-2xl p-6">

          {step === 'phone' && (
            <form onSubmit={handlePhone} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1.5 block">Mobile number</label>
                <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden focus-within:border-rose-400 transition-colors">
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
              <button
                type="submit"
                disabled={loading || phone.replace(/\D/g, '').length !== 10}
                className="w-full bg-rose-700 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-rose-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? 'Signing in…' : <><span>Continue</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {step === 'name' && (
            <form onSubmit={handleName} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1.5 block">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Priya Sharma"
                  className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-400 transition-colors"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full bg-rose-700 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-rose-800 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Setting up…' : "Let's start planning 🎉"}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-stone-400 mt-4">
          Are you a wedding planner or event company?{' '}
          <a href="/login" className="text-rose-600 hover:underline">Sign in here instead</a>
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
