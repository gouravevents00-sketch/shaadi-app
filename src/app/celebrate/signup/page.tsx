'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowRight, ArrowLeft, Check, Loader2, Sparkles, Users, Building2, ShoppingBag } from 'lucide-react'
import { phoneLogin, savePhoneProfile } from './action'
import { createCelebration } from './createAction'

type Step = 'phone' | 'name' | 'wedding' | 'choose'

const STEPS: Step[] = ['phone', 'name', 'wedding', 'choose']
const STEP_LABELS = ['Login', 'About you', 'Your wedding', 'Get started']

function StepBar({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current)
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < idx ? 'bg-rose-700 text-white' :
              i === idx ? 'bg-rose-700 text-white ring-4 ring-rose-100' :
              'bg-stone-100 text-stone-400'
            }`}>
              {i < idx ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-[9px] font-semibold uppercase tracking-wide ${i === idx ? 'text-rose-700' : 'text-stone-400'}`}>
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div className="flex-1 h-0.5 mx-2 mb-4" style={{ backgroundColor: i < idx ? '#be123c' : '#e7e5e4' }} />
          )}
        </div>
      ))}
    </div>
  )
}

function SignupFlow() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('phone')
  const [loading, setLoading] = useState(false)

  // Step 1
  const [phone, setPhone] = useState('')
  // Step 2
  const [name, setName] = useState('')
  const [userId, setUserId] = useState('')
  // Step 3
  const [brideName, setBrideName] = useState('')
  const [groomName, setGroomName] = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [city, setCity] = useState('')
  async function handlePhone(e: { preventDefault(): void }) {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '').slice(-10)
    if (digits.length !== 10) { toast.error('Enter a valid 10-digit mobile number'); return }
    setLoading(true)
    const res = await phoneLogin(digits)
    if ('error' in res) { toast.error(res.error); setLoading(false); return }

    const { error } = await supabase.auth.verifyOtp({ token_hash: res.hashed_token, type: 'email' })
    if (error) { toast.error('Login failed: ' + error.message); setLoading(false); return }

    if (res.hasProfile) {
      router.push('/my')
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
    const res = await savePhoneProfile({ name: name.trim(), userId, phone: phone.replace(/\D/g, '').slice(-10) })
    if ('error' in res) { toast.error(res.error); setLoading(false); return }
    setLoading(false)
    setStep('wedding')
  }

  async function handleWedding(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!brideName.trim() && !groomName.trim()) { toast.error('Enter at least one name'); return }
    if (!weddingDate) { toast.error('Select your wedding date'); return }
    setStep('choose')
  }

  async function handleChoice(choice: 'self' | 'agency' | 'marketplace') {
    setLoading(true)
    const res = await createCelebration({
      userId,
      brideName: brideName.trim(),
      groomName: groomName.trim(),
      weddingDate,
      city: city.trim(),
      managedBy: choice,
    })
    if ('error' in res) { toast.error(res.error); setLoading(false); return }
    if (choice === 'self') router.push(`/my/${res.id}`)
    else if (choice === 'agency') router.push(`/my/${res.id}/connect`)
    else router.push('/vendors')
  }

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-700 mb-3">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-stone-900">Utsav</h1>
        </div>

        <StepBar current={step} />

        {/* ── Step 1: Phone ── */}
        {step === 'phone' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-stone-900">Welcome!</h2>
              <p className="text-stone-500 text-sm mt-0.5">Enter your mobile number to get started</p>
            </div>
            <form onSubmit={handlePhone} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1.5 block">Mobile number</label>
                <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden focus-within:border-rose-400 transition-colors bg-white">
                  <div className="flex items-center gap-1.5 px-3 py-3 bg-stone-50 border-r border-stone-200 flex-shrink-0">
                    <span className="text-sm">🇮🇳</span>
                    <span className="text-sm font-medium text-stone-600">+91</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98765 43210"
                    className="flex-1 px-3 py-3 text-sm bg-white focus:outline-none"
                    autoFocus
                    inputMode="numeric"
                    maxLength={10}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || phone.replace(/\D/g, '').length !== 10}
                className="w-full bg-rose-700 text-white py-3 rounded-xl text-sm font-semibold hover:bg-rose-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Continue</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
            <p className="text-center text-xs text-stone-400 mt-4">
              Wedding planner?{' '}
              <a href="/login" className="text-rose-600 hover:underline">Sign in here</a>
            </p>
          </div>
        )}

        {/* ── Step 2: Name ── */}
        {step === 'name' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-stone-900">What should we call you?</h2>
              <p className="text-stone-500 text-sm mt-0.5">Just your first name is fine</p>
            </div>
            <form onSubmit={handleName} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1.5 block">Your name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Priya"
                  className="w-full px-3 py-3 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-400 transition-colors bg-white"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || !name.trim()}
                className="w-full bg-rose-700 text-white py-3 rounded-xl text-sm font-semibold hover:bg-rose-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Continue</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>
        )}

        {/* ── Step 3: Wedding basics ── */}
        {step === 'wedding' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-stone-900">Tell us about your wedding</h2>
              <p className="text-stone-500 text-sm mt-0.5">Just the basics — you can fill in the rest later</p>
            </div>
            <form onSubmit={handleWedding} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1.5 block">Bride&apos;s name</label>
                  <input
                    type="text"
                    value={brideName}
                    onChange={e => setBrideName(e.target.value)}
                    placeholder="Priya"
                    className="w-full px-3 py-3 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-400 transition-colors bg-white"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1.5 block">Groom&apos;s name</label>
                  <input
                    type="text"
                    value={groomName}
                    onChange={e => setGroomName(e.target.value)}
                    placeholder="Rahul"
                    className="w-full px-3 py-3 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-400 transition-colors bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1.5 block">Wedding date</label>
                <input
                  type="date"
                  value={weddingDate}
                  onChange={e => setWeddingDate(e.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                  className="w-full px-3 py-3 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-400 transition-colors bg-white"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1.5 block">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder="Jaipur, Delhi, Mumbai…"
                  className="w-full px-3 py-3 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-400 transition-colors bg-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep('name')}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-sm font-medium text-stone-500 border border-stone-200 hover:bg-stone-100 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  disabled={loading || (!brideName.trim() && !groomName.trim()) || !weddingDate}
                  className="flex-1 bg-rose-700 text-white py-3 rounded-xl text-sm font-semibold hover:bg-rose-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Continue</span><ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Step 4: Choose ── */}
        {step === 'choose' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-stone-900">How do you want to plan?</h2>
              <p className="text-stone-500 text-sm mt-0.5">You can change this later</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => handleChoice('self')}
                disabled={loading}
                className="w-full text-left bg-white border border-stone-200 hover:border-rose-300 hover:bg-rose-50/50 rounded-2xl p-4 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-200 transition-colors">
                    <Users className="w-5 h-5 text-rose-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900 text-sm">Plan it myself</p>
                    <p className="text-stone-500 text-xs mt-0.5">I&apos;ll manage my own checklist, guests, vendors and budget</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-rose-400 ml-auto mt-0.5 transition-colors flex-shrink-0" />
                </div>
              </button>

              <button
                onClick={() => handleChoice('agency')}
                disabled={loading}
                className="w-full text-left bg-white border border-stone-200 hover:border-rose-300 hover:bg-rose-50/50 rounded-2xl p-4 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                    <Building2 className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900 text-sm">Invite my planner</p>
                    <p className="text-stone-500 text-xs mt-0.5">My wedding planner / agency will manage everything for me</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-rose-400 ml-auto mt-0.5 transition-colors flex-shrink-0" />
                </div>
              </button>

              <button
                onClick={() => handleChoice('marketplace')}
                disabled={loading}
                className="w-full text-left bg-white border border-stone-200 hover:border-rose-300 hover:bg-rose-50/50 rounded-2xl p-4 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
                    <ShoppingBag className="w-5 h-5 text-green-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-stone-900 text-sm">Find a planner</p>
                    <p className="text-stone-500 text-xs mt-0.5">Browse verified wedding planners and agencies near me</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-rose-400 ml-auto mt-0.5 transition-colors flex-shrink-0" />
                </div>
              </button>
            </div>
            {loading && (
              <div className="flex items-center justify-center gap-2 mt-4 text-stone-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Setting up your wedding…</span>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export default function CelebrationSignupPage() {
  return (
    <Suspense>
      <SignupFlow />
    </Suspense>
  )
}
