'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowRight } from 'lucide-react'
import { agencyPhoneLogin, setupAgencyProfile } from './signup-action'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') || '/dashboard'
  const supabase = createClient()

  const [step, setStep] = useState<'phone' | 'profile'>('phone')
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handlePhone(e: { preventDefault(): void }) {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '').slice(-10)
    if (digits.length !== 10) { toast.error('Enter a valid 10-digit mobile number'); return }
    setLoading(true)

    const res = await agencyPhoneLogin(digits)
    if ('error' in res) { toast.error(res.error); setLoading(false); return }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: res.hashed_token,
      type: 'email',
    })
    if (error) { toast.error('Login failed: ' + error.message); setLoading(false); return }

    if (res.hasProfile) {
      router.push(next)
      router.refresh()
    } else {
      setStep('profile')
    }
    setLoading(false)
  }

  async function handleProfile(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!name.trim()) { toast.error('Enter your name'); return }
    if (!companyName.trim()) { toast.error('Enter your agency name'); return }
    setLoading(true)
    const res = await setupAgencyProfile({ name: name.trim(), companyName: companyName.trim(), phone: phone.replace(/\D/g, '').slice(-10) })
    if ('error' in res) { toast.error(res.error); setLoading(false); return }
    toast.success('Welcome to UtsavOS! 🎉')
    router.push(next)
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-700 mb-4">
            <span className="text-white text-2xl">✦</span>
          </div>
          <h1 className="text-2xl font-semibold text-stone-900">UtsavOS</h1>
          <p className="text-stone-500 text-sm mt-1">
            {step === 'profile' ? 'Set up your agency workspace' : 'Wedding & Event Management'}
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

          {step === 'profile' && (
            <form onSubmit={handleProfile} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1.5 block">Your name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Rahul Sharma"
                  className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-400" autoFocus />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1.5 block">Agency / company name</label>
                <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Dream Weddings Co."
                  className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-400" />
              </div>
              <button type="submit" disabled={loading || !name.trim() || !companyName.trim()}
                className="w-full bg-rose-700 text-white py-2.5 rounded-xl text-sm font-medium hover:bg-rose-800 disabled:opacity-50 transition-colors">
                {loading ? 'Setting up…' : 'Create workspace →'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-stone-400 mt-4">
          Planning your own celebration?{' '}
          <a href="/celebrate" className="text-rose-600 hover:underline">Start here instead →</a>
        </p>
      </div>
    </div>
  )
}
