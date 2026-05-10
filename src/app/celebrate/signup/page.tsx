'use client'

import { useState, useMemo, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { ArrowRight, ArrowLeft, Check, Loader2, Sparkles, Users, Building2, ShoppingBag, Clock, X } from 'lucide-react'
import { phoneLogin, savePhoneProfile } from './action'
import { createCelebration } from './createAction'

// ── Constants ──────────────────────────────────────────────────

const ALL_FUNCTIONS = [
  'Haldi', 'Mehandi', 'Sagai', 'Sangeet', 'Mayra',
  'Tilak', 'Baraat', 'Pheras', 'Vidaai', 'Reception',
  'Cocktail', 'Hawan', 'Lunch', 'Dinner', 'Other',
]

// ── Utilities ──────────────────────────────────────────────────

type SelFn = { day: string; name: string; time: string }

function getDaysInRange(start: string, end: string): string[] {
  if (!start) return []
  const days: string[] = []
  const cur = new Date(start + 'T00:00:00')
  const endD = new Date((end || start) + 'T00:00:00')
  while (cur <= endD && days.length < 10) {
    days.push(cur.toISOString().slice(0, 10))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function fmtDay(d: string, idx: number) {
  return `Day ${idx + 1} · ${new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`
}

// ── Step bar ───────────────────────────────────────────────────

type Step = 'phone' | 'name' | 'wedding' | 'functions' | 'choose'
const STEPS: Step[] = ['phone', 'name', 'wedding', 'functions', 'choose']
const STEP_LABELS = ['Login', 'You', 'Wedding', 'Functions', 'Plan']

function StepBar({ current }: { current: Step }) {
  const idx = STEPS.indexOf(current)
  return (
    <div className="flex items-center mb-8">
      {STEP_LABELS.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
              i < idx ? 'bg-rose-700 text-white' :
              i === idx ? 'bg-rose-700 text-white ring-4 ring-rose-100' :
              'bg-stone-100 text-stone-400'
            }`}>
              {i < idx ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            <span className={`text-[8px] font-semibold uppercase tracking-wide ${i === idx ? 'text-rose-700' : 'text-stone-400'}`}>
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div className="flex-1 h-0.5 mx-1.5 mb-4" style={{ backgroundColor: i < idx ? '#be123c' : '#e7e5e4' }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────

function SignupFlow() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState<Step>('phone')
  const [loading, setLoading] = useState(false)

  // Step 1 — phone
  const [phone, setPhone] = useState('')
  // Step 2 — name
  const [name, setName] = useState('')
  const [userId, setUserId] = useState('')
  // Step 3 — wedding basics
  const [brideName, setBrideName] = useState('')
  const [groomName, setGroomName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [city, setCity] = useState('')
  const [venue, setVenue] = useState('')
  // Step 4 — functions
  const [selectedFunctions, setSelectedFunctions] = useState<SelFn[]>([])
  const [guestCountPerDay, setGuestCountPerDay] = useState<Record<string, number>>({})

  const days = useMemo(() => getDaysInRange(startDate, endDate), [startDate, endDate])

  function toggleFn(day: string, fnName: string) {
    const exists = selectedFunctions.some(f => f.day === day && f.name === fnName)
    setSelectedFunctions(exists
      ? selectedFunctions.filter(f => !(f.day === day && f.name === fnName))
      : [...selectedFunctions, { day, name: fnName, time: '' }]
    )
  }

  function setFnTime(day: string, fnName: string, time: string) {
    setSelectedFunctions(selectedFunctions.map(f =>
      f.day === day && f.name === fnName ? { ...f, time } : f
    ))
  }

  // ── Handlers ──────────────────────────────────────────────────

  async function handlePhone(e: { preventDefault(): void }) {
    e.preventDefault()
    const digits = phone.replace(/\D/g, '').slice(-10)
    if (digits.length !== 10) { toast.error('Enter a valid 10-digit mobile number'); return }
    setLoading(true)
    const res = await phoneLogin(digits)
    if ('error' in res) { toast.error(res.error); setLoading(false); return }
    const { error } = await supabase.auth.verifyOtp({ token_hash: res.hashed_token, type: 'email' })
    if (error) { toast.error('Login failed: ' + error.message); setLoading(false); return }
    if (res.hasProfile) { router.push('/my'); router.refresh() }
    else { setUserId(res.userId); setStep('name') }
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

  function handleWedding(e: { preventDefault(): void }) {
    e.preventDefault()
    if (!brideName.trim() && !groomName.trim()) { toast.error('Enter at least one name'); return }
    if (!startDate) { toast.error('Select your wedding date'); return }
    setStep('functions')
  }

  async function handleChoice(choice: 'self' | 'agency' | 'marketplace') {
    setLoading(true)
    const res = await createCelebration({
      userId,
      brideName: brideName.trim(),
      groomName: groomName.trim(),
      startDate,
      endDate: endDate || startDate,
      city: city.trim(),
      venue: venue.trim(),
      functions: selectedFunctions,
      guestCountPerDay,
      managedBy: choice,
    })
    if ('error' in res) { toast.error(res.error); setLoading(false); return }
    if (choice === 'agency') router.push(`/my/${res.id}/connect`)
    else if (choice === 'marketplace') router.push('/vendors')
    else router.push(`/my/${res.id}`)
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="border-b border-stone-100 bg-white px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <div className="w-7 h-7 rounded-lg bg-rose-700 flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="font-semibold text-stone-900 text-sm">Utsav</span>
      </div>

      <div className="max-w-sm mx-auto px-4 py-8">
        <StepBar current={step} />

        {/* ── Step 1: Phone ── */}
        {step === 'phone' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-stone-900">Welcome!</h2>
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
                    type="tel" value={phone}
                    onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="98765 43210"
                    className="flex-1 px-3 py-3 text-sm bg-white focus:outline-none"
                    autoFocus inputMode="numeric" maxLength={10}
                  />
                </div>
              </div>
              <button type="submit" disabled={loading || phone.replace(/\D/g, '').length !== 10}
                className="w-full bg-rose-700 text-white py-3 rounded-xl text-sm font-semibold hover:bg-rose-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
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
              <h2 className="text-xl font-bold text-stone-900">What should we call you?</h2>
              <p className="text-stone-500 text-sm mt-0.5">Just your first name is fine</p>
            </div>
            <form onSubmit={handleName} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1.5 block">Your name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Priya"
                  className="w-full px-3 py-3 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-400 transition-colors bg-white"
                  autoFocus />
              </div>
              <button type="submit" disabled={loading || !name.trim()}
                className="w-full bg-rose-700 text-white py-3 rounded-xl text-sm font-semibold hover:bg-rose-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span>Continue</span><ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          </div>
        )}

        {/* ── Step 3: Wedding basics ── */}
        {step === 'wedding' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-stone-900">About your wedding</h2>
              <p className="text-stone-500 text-sm mt-0.5">Just the basics — fill in the rest later</p>
            </div>
            <form onSubmit={handleWedding} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1.5 block">Bride&apos;s name</label>
                  <input type="text" value={brideName} onChange={e => setBrideName(e.target.value)}
                    placeholder="Priya"
                    className="w-full px-3 py-3 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-400 transition-colors bg-white"
                    autoFocus />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1.5 block">Groom&apos;s name</label>
                  <input type="text" value={groomName} onChange={e => setGroomName(e.target.value)}
                    placeholder="Rahul"
                    className="w-full px-3 py-3 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-400 transition-colors bg-white" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1.5 block">Start date <span className="text-rose-500">*</span></label>
                  <input type="date" value={startDate}
                    onChange={e => { setStartDate(e.target.value); if (!endDate || endDate < e.target.value) setEndDate(e.target.value) }}
                    min={new Date().toISOString().slice(0, 10)}
                    className="w-full px-3 py-3 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-400 transition-colors bg-white" />
                </div>
                <div>
                  <label className="text-xs font-medium text-stone-600 mb-1.5 block">End date</label>
                  <input type="date" value={endDate} min={startDate}
                    onChange={e => setEndDate(e.target.value)}
                    className="w-full px-3 py-3 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-400 transition-colors bg-white" />
                </div>
              </div>
              {days.length > 1 && (
                <p className="text-xs text-rose-600 font-medium">{days.length}-day wedding ✦</p>
              )}
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1.5 block">City</label>
                <input type="text" value={city} onChange={e => setCity(e.target.value)}
                  placeholder="Jaipur, Delhi, Mumbai…"
                  className="w-full px-3 py-3 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-400 transition-colors bg-white" />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 mb-1.5 block">Venue (if booked)</label>
                <input type="text" value={venue} onChange={e => setVenue(e.target.value)}
                  placeholder="Venue name"
                  className="w-full px-3 py-3 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-rose-400 transition-colors bg-white" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setStep('name')}
                  className="px-4 py-3 rounded-xl text-sm font-medium text-stone-500 border border-stone-200 hover:bg-stone-100 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <button type="submit" disabled={(!brideName.trim() && !groomName.trim()) || !startDate}
                  className="flex-1 bg-rose-700 text-white py-3 rounded-xl text-sm font-semibold hover:bg-rose-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                  <span>Continue</span><ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Step 4: Functions ── */}
        {step === 'functions' && (
          <div>
            <div className="mb-5">
              <h2 className="text-xl font-bold text-stone-900">Functions & guests</h2>
              <p className="text-stone-500 text-sm mt-0.5">Select functions for each day and add guest counts</p>
            </div>
            <div className="space-y-4">
              {days.map((day, idx) => {
                const dayFns = selectedFunctions.filter(f => f.day === day)
                return (
                  <div key={day} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 bg-stone-50 border-b border-stone-100">
                      <p className="text-sm font-semibold text-stone-800">{fmtDay(day, idx)}</p>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-stone-400" />
                        <input type="number" min="0" max="9999"
                          value={guestCountPerDay[day] || ''}
                          onChange={e => setGuestCountPerDay({ ...guestCountPerDay, [day]: parseInt(e.target.value) || 0 })}
                          placeholder="Guests"
                          className="w-20 text-xs border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-rose-400 text-right bg-white" />
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {ALL_FUNCTIONS.map(fn => {
                          const active = dayFns.some(f => f.name === fn)
                          return (
                            <button key={fn} type="button" onClick={() => toggleFn(day, fn)}
                              className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                                active ? 'bg-rose-700 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                              }`}>
                              {active && '✓ '}{fn}
                            </button>
                          )
                        })}
                      </div>
                      {dayFns.length > 0 && (
                        <div className="space-y-1.5 pt-2 border-t border-stone-100">
                          {dayFns.map(fn => (
                            <div key={fn.name} className="flex items-center gap-2">
                              <span className="text-xs font-medium text-stone-700 w-24 flex-shrink-0 truncate">{fn.name}</span>
                              <Clock className="w-3 h-3 text-stone-400 flex-shrink-0" />
                              <input type="time" value={fn.time}
                                onChange={e => setFnTime(day, fn.name, e.target.value)}
                                className="text-xs border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:border-rose-400 flex-1 min-w-0 bg-white" />
                              <button type="button" onClick={() => toggleFn(day, fn.name)}
                                className="text-stone-300 hover:text-red-400 flex-shrink-0">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setStep('wedding')}
                className="px-4 py-3 rounded-xl text-sm font-medium text-stone-500 border border-stone-200 hover:bg-stone-100 transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setStep('choose')}
                disabled={selectedFunctions.length === 0}
                className="flex-1 bg-rose-700 text-white py-3 rounded-xl text-sm font-semibold hover:bg-rose-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors">
                <span>Continue</span><ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <p className="text-center text-xs text-stone-400 mt-3">Select at least one function to continue</p>
          </div>
        )}

        {/* ── Step 5: Choose path ── */}
        {step === 'choose' && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-bold text-stone-900">How do you want to plan?</h2>
              <p className="text-stone-500 text-sm mt-0.5">You can always change this later</p>
            </div>
            <div className="space-y-3">

              <button onClick={() => handleChoice('self')} disabled={loading}
                className="w-full text-left bg-white border-2 border-stone-200 hover:border-rose-500 rounded-2xl p-4 transition-all group disabled:opacity-60">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center flex-shrink-0 group-hover:bg-rose-100 transition-colors">
                    <Users className="w-5 h-5 text-rose-700" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-stone-900 text-sm">Plan it myself</p>
                      <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">RECOMMENDED</span>
                    </div>
                    <p className="text-stone-500 text-xs mt-0.5">Full dashboard — guests, tasks, vendors, budget</p>
                    <p className="text-rose-500 text-[10px] mt-1 font-medium">Invite a planner anytime later →</p>
                  </div>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin text-stone-300 flex-shrink-0 mt-0.5" /> : <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-rose-500 flex-shrink-0 mt-0.5 transition-colors" />}
                </div>
              </button>

              <button onClick={() => handleChoice('agency')} disabled={loading}
                className="w-full text-left bg-white border-2 border-stone-200 hover:border-purple-400 rounded-2xl p-4 transition-all group disabled:opacity-60">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-100 transition-colors">
                    <Building2 className="w-5 h-5 text-purple-700" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-stone-900 text-sm">Invite my planner</p>
                    <p className="text-stone-500 text-xs mt-0.5">Already working with an agency? Send them an invite</p>
                    <p className="text-purple-500 text-[10px] mt-1 font-medium">Dashboard + agency collaboration →</p>
                  </div>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin text-stone-300 flex-shrink-0 mt-0.5" /> : <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-purple-400 flex-shrink-0 mt-0.5 transition-colors" />}
                </div>
              </button>

              <button onClick={() => handleChoice('marketplace')} disabled={loading}
                className="w-full text-left bg-white border-2 border-stone-200 hover:border-amber-400 rounded-2xl p-4 transition-all group disabled:opacity-60">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-100 transition-colors">
                    <ShoppingBag className="w-5 h-5 text-amber-700" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-stone-900 text-sm">Explore marketplace</p>
                    <p className="text-stone-500 text-xs mt-0.5">Planners · Venues · Catering · Decorators · Artists</p>
                    <p className="text-amber-600 text-[10px] mt-1 font-medium">Browse → shortlist → connect →</p>
                  </div>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin text-stone-300 flex-shrink-0 mt-0.5" /> : <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-amber-500 flex-shrink-0 mt-0.5 transition-colors" />}
                </div>
              </button>

            </div>
            <button type="button" onClick={() => setStep('functions')}
              className="flex items-center gap-1.5 text-stone-400 hover:text-stone-600 text-xs mt-4 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <p className="text-center text-[10px] text-stone-400 mt-3">Your data always belongs to you — no lock-in</p>
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
