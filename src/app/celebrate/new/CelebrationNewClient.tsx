'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowRight, ArrowLeft, Check, Loader2, Clock, Users, X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { createCelebration, type FunctionEntry } from './actions'

// ── Constants ──────────────────────────────────────────────────
const WEDDING_STYLES = [
  { value: 'intimate', label: 'Intimate & Elegant', emoji: '🌸', desc: 'Close family, fine details, personal touch' },
  { value: 'traditional', label: 'Traditional Grand', emoji: '🎊', desc: 'Full Indian shaadi, big fat wedding vibes' },
  { value: 'destination', label: 'Destination', emoji: '🏰', desc: 'Palace, resort, hill station — somewhere special' },
  { value: 'simple', label: 'Simple & Sweet', emoji: '🤍', desc: 'Meaningful, no fuss, just family & love' },
]

const ALL_FUNCTIONS = [
  'Haldi', 'Mehandi', 'Sagai', 'Sangeet', 'Mayra',
  'Tilak', 'Baraat', 'Pheras', 'Vidaai', 'Reception',
  'Cocktail', 'Hawan', 'Lunch', 'Dinner', 'Other',
]

// ── Types ──────────────────────────────────────────────────────
type SelFn = { day: string; name: string; time: string }
type FormData = {
  brideName: string; groomName: string; weddingStyle: string
  city: string; venue: string; startDate: string; endDate: string
  guestCountPerDay: Record<string, number>
  selectedFunctions: SelFn[]
}

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

// ── Step indicator ─────────────────────────────────────────────
function Steps({ current }: { current: number }) {
  const labels = ['Couple', 'Functions', 'Plan']
  return (
    <div className="flex items-center gap-0 mb-8">
      {labels.map((l, i) => (
        <div key={l} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < current ? 'bg-rose-700 text-white' :
              i === current ? 'bg-rose-700 text-white ring-4 ring-rose-100' :
              'bg-stone-100 text-stone-400'
            }`}>
              {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-[9px] font-semibold uppercase tracking-wide ${i === current ? 'text-rose-700' : 'text-stone-300'}`}>{l}</span>
          </div>
          {i < labels.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-4 ${i < current ? 'bg-rose-400' : 'bg-stone-150'}`} style={{ backgroundColor: i < current ? '#f87171' : '#e7e5e4' }} />
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function CelebrationNewClient({ userId }: { userId: string }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FormData>({
    brideName: '', groomName: '', weddingStyle: '', city: '', venue: '',
    startDate: '', endDate: '', guestCountPerDay: {}, selectedFunctions: [],
  })

  const days = useMemo(() => getDaysInRange(form.startDate, form.endDate), [form.startDate, form.endDate])

  function set<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function toggleFn(day: string, name: string) {
    const exists = form.selectedFunctions.some(f => f.day === day && f.name === name)
    set('selectedFunctions', exists
      ? form.selectedFunctions.filter(f => !(f.day === day && f.name === name))
      : [...form.selectedFunctions, { day, name, time: '' }]
    )
  }

  function setFnTime(day: string, name: string, time: string) {
    set('selectedFunctions', form.selectedFunctions.map(f =>
      f.day === day && f.name === name ? { ...f, time } : f
    ))
  }

  function canNext() {
    if (step === 0) return !!form.brideName.trim() && !!form.weddingStyle
    if (step === 1) return !!form.startDate && form.selectedFunctions.length > 0
    return true
  }

  async function handleSubmit(managedBy: 'self' | 'agency' | 'marketplace') {
    setLoading(true)
    const fns: FunctionEntry[] = form.selectedFunctions.map(f => ({
      name: f.name, date: f.day, start_time: f.time || undefined,
    }))
    const res = await createCelebration({
      userId,
      brideName: form.brideName.trim(),
      groomName: form.groomName.trim(),
      weddingStyle: form.weddingStyle,
      startDate: form.startDate,
      endDate: form.endDate || form.startDate,
      functions: fns,
      guestCountPerDay: form.guestCountPerDay,
      requirements: [],
      venue: form.venue || undefined,
      city: form.city || undefined,
      managedBy,
    })
    setLoading(false)
    if ('error' in res) { toast.error(res.error); return }
    toast.success('Celebration ready! 🎉')
    if (managedBy === 'marketplace') router.push(`/marketplace?from=${res.id}`)
    else if (managedBy === 'agency') router.push(`/my/${res.id}?invite=agency`)
    else router.push(`/my/${res.id}`)
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="border-b border-stone-100 bg-white px-5 py-3.5 flex items-center gap-3 sticky top-0 z-10">
        <div className="w-7 h-7 rounded-lg bg-rose-700 flex items-center justify-center">
          <span className="text-white text-xs font-bold">✦</span>
        </div>
        <span className="font-semibold text-stone-900 text-sm flex-1">Utsav</span>
        <span className="text-xs text-stone-400">Step {step + 1} of 3</span>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        <Steps current={step} />

        {/* ── Step 0: Couple ── */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">About the couple</h1>
              <p className="text-stone-500 text-sm mt-1">Names and wedding style — just 1 minute</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">Bride's name <span className="text-rose-500">*</span></label>
                <Input value={form.brideName} onChange={e => set('brideName', e.target.value)} placeholder="Priya" autoFocus />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">Groom's name</label>
                <Input value={form.groomName} onChange={e => set('groomName', e.target.value)} placeholder="Arjun" />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">City</label>
                <Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Jaipur, Delhi..." />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">Venue (if booked)</label>
                <Input value={form.venue} onChange={e => set('venue', e.target.value)} placeholder="Venue name" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-2.5">Wedding style <span className="text-rose-500">*</span></label>
              <div className="grid grid-cols-2 gap-2.5">
                {WEDDING_STYLES.map(ws => (
                  <button key={ws.value} onClick={() => set('weddingStyle', ws.value)}
                    className={`text-left p-3.5 rounded-xl border-2 transition-all ${
                      form.weddingStyle === ws.value ? 'border-rose-600 bg-rose-50' : 'border-stone-100 bg-white hover:border-stone-200'
                    }`}>
                    <div className="text-xl mb-1">{ws.emoji}</div>
                    <p className={`text-sm font-semibold leading-tight ${form.weddingStyle === ws.value ? 'text-rose-800' : 'text-stone-800'}`}>{ws.label}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5 leading-tight">{ws.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 1: Dates & Functions ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">Dates & functions</h1>
              <p className="text-stone-500 text-sm mt-1">How many days and which functions</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-4 grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">Start date <span className="text-rose-500">*</span></label>
                <Input type="date" value={form.startDate}
                  onChange={e => { set('startDate', e.target.value); if (!form.endDate || form.endDate < e.target.value) set('endDate', e.target.value) }} />
              </div>
              <div>
                <label className="text-xs font-medium text-stone-600 block mb-1.5">End date</label>
                <Input type="date" value={form.endDate} min={form.startDate} onChange={e => set('endDate', e.target.value)} />
              </div>
              {days.length > 1 && (
                <p className="col-span-2 text-xs text-rose-600 font-medium">{days.length} day event ✦</p>
              )}
            </div>

            {days.length === 0 && (
              <div className="text-center py-10 border-2 border-dashed border-stone-200 rounded-xl">
                <p className="text-stone-400 text-sm">Select dates above ⬆</p>
              </div>
            )}

            {days.map((day, idx) => {
              const dayFns = form.selectedFunctions.filter(f => f.day === day)
              return (
                <div key={day} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-stone-50 border-b border-stone-100">
                    <p className="text-sm font-semibold text-stone-800">{fmtDay(day, idx)}</p>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-stone-400" />
                      <input type="number" min="0" max="9999"
                        value={form.guestCountPerDay[day] || ''}
                        onChange={e => set('guestCountPerDay', { ...form.guestCountPerDay, [day]: parseInt(e.target.value) || 0 })}
                        placeholder="Guests"
                        className="w-20 text-xs border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-rose-400 text-right" />
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {ALL_FUNCTIONS.map(fn => {
                        const active = dayFns.some(f => f.name === fn)
                        return (
                          <button key={fn} onClick={() => toggleFn(day, fn)}
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
                              className="text-xs border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:border-rose-400 flex-1 min-w-0" />
                            <button onClick={() => toggleFn(day, fn.name)} className="text-stone-300 hover:text-red-400 flex-shrink-0">
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
        )}

        {/* ── Step 2: Path selection ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-bold text-stone-900">How would you like to plan?</h1>
              <p className="text-stone-500 text-sm mt-1">You can change this later</p>
            </div>

            <button onClick={() => !loading && handleSubmit('self')} disabled={loading}
              className="w-full text-left p-5 bg-white border-2 border-stone-200 rounded-2xl hover:border-rose-500 hover:shadow-sm transition-all group disabled:opacity-60">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-2xl flex-shrink-0">✦</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-stone-900">Manage it yourself</p>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">RECOMMENDED</span>
                  </div>
                  <p className="text-sm text-stone-500 mt-1">Full dashboard — guests, budget, vendors, rooms, timeline</p>
                  <p className="text-xs text-rose-500 mt-1.5 font-medium">Invite an agency anytime later →</p>
                </div>
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-stone-300 mt-1 flex-shrink-0" /> : <ArrowRight className="w-5 h-5 text-stone-200 group-hover:text-rose-500 mt-1 flex-shrink-0 transition-colors" />}
              </div>
            </button>

            <button onClick={() => !loading && handleSubmit('agency')} disabled={loading}
              className="w-full text-left p-5 bg-white border-2 border-stone-200 rounded-2xl hover:border-purple-400 hover:shadow-sm transition-all group disabled:opacity-60">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-2xl flex-shrink-0">🤝</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-900">Invite your agency</p>
                  <p className="text-sm text-stone-500 mt-1">Already working with an agency? Send them an invite link</p>
                  <p className="text-xs text-purple-500 mt-1.5 font-medium">Dashboard + agency collaboration tools →</p>
                </div>
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-stone-300 mt-1 flex-shrink-0" /> : <ArrowRight className="w-5 h-5 text-stone-200 group-hover:text-purple-400 mt-1 flex-shrink-0 transition-colors" />}
              </div>
            </button>

            <button onClick={() => !loading && handleSubmit('marketplace')} disabled={loading}
              className="w-full text-left p-5 bg-white border-2 border-stone-200 rounded-2xl hover:border-amber-400 hover:shadow-sm transition-all group disabled:opacity-60">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-2xl flex-shrink-0">🏪</div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-stone-900">Browse the marketplace</p>
                  <p className="text-sm text-stone-500 mt-1">Verified agencies, venues, decorators — with ratings</p>
                  <p className="text-xs text-amber-500 mt-1.5 font-medium">Browse → shortlist → connect →</p>
                </div>
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-stone-300 mt-1 flex-shrink-0" /> : <ArrowRight className="w-5 h-5 text-stone-200 group-hover:text-amber-400 mt-1 flex-shrink-0 transition-colors" />}
              </div>
            </button>

            <p className="text-xs text-stone-400 text-center pt-1">Your data always belongs to you — no lock-in</p>
          </div>
        )}

        {/* Nav */}
        {step < 2 && (
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-stone-100">
            {step > 0
              ? <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1.5 text-stone-500 hover:text-stone-800 text-sm font-medium transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              : <div />
            }
            <button onClick={() => setStep(s => s + 1)} disabled={!canNext()}
              className="flex items-center gap-2 bg-rose-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95">
              Next <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
