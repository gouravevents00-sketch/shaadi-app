'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRight, ArrowLeft, Check, Loader2, Clock, Users, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { createCelebrationFromAgencyInvite } from './actions'
import type { FunctionEntry } from '@/app/celebrate/new/actions'

const WEDDING_STYLES = [
  { value: 'intimate', label: 'Intimate & Elegant', emoji: '🌸' },
  { value: 'traditional', label: 'Traditional Grand', emoji: '🎊' },
  { value: 'destination', label: 'Destination', emoji: '🏰' },
  { value: 'simple', label: 'Simple & Sweet', emoji: '🤍' },
]

const ALL_FUNCTIONS = ['Haldi', 'Mehandi', 'Sagai', 'Sangeet', 'Mayra', 'Tilak', 'Baraat', 'Pheras', 'Vidaai', 'Reception', 'Cocktail', 'Hawan', 'Lunch', 'Dinner', 'Other']
const REQUIREMENTS = ['Photography', 'Videography', 'Décor & Florals', 'Catering', 'Mehandi Artist', 'Makeup & Hair', 'Pandit / Priest', 'DJ & Music', 'Live Band', 'Transportation', 'Accommodation', 'Digital Invites', 'Tent & Furniture', 'Lighting', 'Gifting', 'Choreographer']

type SelFn = { day: string; name: string; time: string }
type FormData = {
  brideName: string; groomName: string; weddingStyle: string
  startDate: string; endDate: string; city: string; venue: string
  guestCountPerDay: Record<string, number>; selectedFunctions: SelFn[]; requirements: string[]
}

function getDaysInRange(start: string, end: string) {
  if (!start) return []
  const days: string[] = []
  const cur = new Date(start + 'T00:00:00')
  const endD = new Date((end || start) + 'T00:00:00')
  while (cur <= endD && days.length < 10) { days.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1) }
  return days
}

function fmtDay(d: string, idx: number) {
  return `Day ${idx + 1} · ${new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`
}

function Steps({ current }: { current: number }) {
  const labels = ['Couple', 'Functions', 'Requirements']
  return (
    <div className="flex items-center gap-0 mb-8">
      {labels.map((l, i) => (
        <div key={l} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${i < current ? 'bg-rose-700 text-white' : i === current ? 'bg-rose-700 text-white ring-4 ring-rose-100' : 'bg-stone-100 text-stone-400'}`}>
              {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-[9px] font-semibold uppercase tracking-wide ${i === current ? 'text-rose-700' : 'text-stone-300'}`}>{l}</span>
          </div>
          {i < labels.length - 1 && <div className="flex-1 h-0.5 mx-2 mb-4" style={{ backgroundColor: i < current ? '#f87171' : '#e7e5e4' }} />}
        </div>
      ))}
    </div>
  )
}

export default function ClientOnboardClient({ weddingId, inviteToken, userId, agencyWedding }: {
  weddingId: string; inviteToken: string; userId: string
  agencyWedding: { brideName: string | null; groomName: string | null; weddingDate: string | null; venue: string | null; city: string | null }
}) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FormData>({
    brideName: agencyWedding.brideName || '', groomName: agencyWedding.groomName || '',
    weddingStyle: '', startDate: agencyWedding.weddingDate || '', endDate: agencyWedding.weddingDate || '',
    city: agencyWedding.city || '', venue: agencyWedding.venue || '',
    guestCountPerDay: {}, selectedFunctions: [], requirements: [],
  })

  const days = useMemo(() => getDaysInRange(form.startDate, form.endDate), [form.startDate, form.endDate])

  function set<K extends keyof FormData>(k: K, v: FormData[K]) { setForm(f => ({ ...f, [k]: v })) }

  function toggleFn(day: string, name: string) {
    const exists = form.selectedFunctions.some(f => f.day === day && f.name === name)
    set('selectedFunctions', exists ? form.selectedFunctions.filter(f => !(f.day === day && f.name === name)) : [...form.selectedFunctions, { day, name, time: '' }])
  }

  function canNext() {
    if (step === 0) return !!form.brideName.trim() && !!form.weddingStyle
    if (step === 1) return !!form.startDate && form.selectedFunctions.length > 0
    return form.requirements.length > 0
  }

  async function handleSubmit() {
    setLoading(true)
    const fns: FunctionEntry[] = form.selectedFunctions.map(f => ({ name: f.name, date: f.day, start_time: f.time || undefined }))
    const res = await createCelebrationFromAgencyInvite({
      userId, weddingId, inviteToken,
      payload: {
        userId, brideName: form.brideName, groomName: form.groomName, weddingStyle: form.weddingStyle,
        startDate: form.startDate, endDate: form.endDate || form.startDate,
        functions: fns, guestCountPerDay: form.guestCountPerDay,
        requirements: form.requirements, venue: form.venue, city: form.city,
        managedBy: 'agency',
      },
    })
    setLoading(false)
    if ('error' in res) { toast.error(res.error); return }
    toast.success('Your wedding dashboard is ready! 🎉')
    router.push(`/my/${res.id}`)
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="border-b border-stone-100 bg-white px-5 py-3.5 flex items-center gap-3 sticky top-0 z-10">
        <div className="w-7 h-7 rounded-lg bg-rose-700 flex items-center justify-center">
          <span className="text-white text-xs font-bold">✦</span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="font-semibold text-stone-900 text-sm">Utsav</span>
          <span className="text-xs text-stone-400 ml-2">Agency invite</span>
        </div>
        <span className="text-xs text-stone-400">Step {step + 1} of 3</span>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        <Steps current={step} />

        {/* Agency invite banner */}
        <div className="bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 mb-6 flex items-center gap-3">
          <span className="text-2xl">🤝</span>
          <div>
            <p className="text-sm font-semibold text-purple-800">You've been invited by your agency</p>
            <p className="text-xs text-purple-600">Fill in your details — you'll get a personal dashboard and shared agency view</p>
          </div>
        </div>

        {/* Step 0: Couple */}
        {step === 0 && (
          <div className="space-y-5">
            <h1 className="text-2xl font-bold text-stone-900">Confirm your details</h1>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-stone-600 block mb-1.5">Bride's name *</label><Input value={form.brideName} onChange={e => set('brideName', e.target.value)} placeholder="Priya" autoFocus /></div>
              <div><label className="text-xs font-medium text-stone-600 block mb-1.5">Groom's name</label><Input value={form.groomName} onChange={e => set('groomName', e.target.value)} placeholder="Arjun" /></div>
              <div><label className="text-xs font-medium text-stone-600 block mb-1.5">City</label><Input value={form.city} onChange={e => set('city', e.target.value)} placeholder="Jaipur..." /></div>
              <div><label className="text-xs font-medium text-stone-600 block mb-1.5">Venue</label><Input value={form.venue} onChange={e => set('venue', e.target.value)} placeholder="Venue name" /></div>
            </div>
            <div>
              <label className="text-xs font-medium text-stone-600 block mb-2.5">Wedding style *</label>
              <div className="grid grid-cols-2 gap-2.5">
                {WEDDING_STYLES.map(ws => (
                  <button key={ws.value} onClick={() => set('weddingStyle', ws.value)}
                    className={`text-left p-3 rounded-xl border-2 transition-all ${form.weddingStyle === ws.value ? 'border-rose-600 bg-rose-50' : 'border-stone-100 bg-white hover:border-stone-200'}`}>
                    <div className="text-xl mb-1">{ws.emoji}</div>
                    <p className={`text-sm font-semibold ${form.weddingStyle === ws.value ? 'text-rose-800' : 'text-stone-800'}`}>{ws.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Functions */}
        {step === 1 && (
          <div className="space-y-5">
            <h1 className="text-2xl font-bold text-stone-900">Event dates & functions</h1>
            <div className="bg-white border border-stone-200 rounded-xl p-4 grid grid-cols-2 gap-3">
              <div><label className="text-xs font-medium text-stone-600 block mb-1.5">Start date *</label>
                <Input type="date" value={form.startDate} onChange={e => { set('startDate', e.target.value); if (!form.endDate || form.endDate < e.target.value) set('endDate', e.target.value) }} /></div>
              <div><label className="text-xs font-medium text-stone-600 block mb-1.5">End date</label>
                <Input type="date" value={form.endDate} min={form.startDate} onChange={e => set('endDate', e.target.value)} /></div>
            </div>
            {days.map((day, idx) => {
              const dayFns = form.selectedFunctions.filter(f => f.day === day)
              return (
                <div key={day} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-stone-50 border-b border-stone-100">
                    <p className="text-sm font-semibold text-stone-800">{fmtDay(day, idx)}</p>
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-stone-400" />
                      <input type="number" min="0" value={form.guestCountPerDay[day] || ''} onChange={e => set('guestCountPerDay', { ...form.guestCountPerDay, [day]: parseInt(e.target.value) || 0 })} placeholder="Guests" className="w-20 text-xs border border-stone-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-rose-400 text-right" />
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {ALL_FUNCTIONS.map(fn => { const active = dayFns.some(f => f.name === fn); return (<button key={fn} onClick={() => toggleFn(day, fn)} className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${active ? 'bg-rose-700 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>{active && '✓ '}{fn}</button>) })}
                    </div>
                    {dayFns.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-stone-100">
                        {dayFns.map(fn => (
                          <div key={fn.name} className="flex items-center gap-2">
                            <span className="text-xs font-medium text-stone-700 w-24 flex-shrink-0 truncate">{fn.name}</span>
                            <Clock className="w-3 h-3 text-stone-400 flex-shrink-0" />
                            <input type="time" value={fn.time} onChange={e => set('selectedFunctions', form.selectedFunctions.map(f => f.day === day && f.name === fn.name ? { ...f, time: e.target.value } : f))} className="text-xs border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:border-rose-400 flex-1 min-w-0" />
                            <button onClick={() => toggleFn(day, fn.name)} className="text-stone-300 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
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

        {/* Step 2: Requirements */}
        {step === 2 && (
          <div className="space-y-5">
            <h1 className="text-2xl font-bold text-stone-900">What do you need?</h1>
            <div className="bg-white border border-stone-100 rounded-xl p-4">
              <div className="flex flex-wrap gap-2">
                {REQUIREMENTS.map(req => { const active = form.requirements.includes(req); return (<button key={req} onClick={() => set('requirements', active ? form.requirements.filter(r => r !== req) : [...form.requirements, req])} className={`text-sm px-3.5 py-2 rounded-full font-medium transition-all ${active ? 'bg-rose-700 text-white shadow-sm' : 'bg-stone-50 border border-stone-200 text-stone-600 hover:border-rose-200 hover:text-rose-700'}`}>{active && '✓ '}{req}</button>) })}
              </div>
            </div>
            {form.requirements.length > 0 && <p className="text-xs text-rose-600 font-medium text-center">{form.requirements.length} selected ✦</p>}
          </div>
        )}

        {/* Nav */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-stone-100">
          {step > 0
            ? <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1.5 text-stone-500 hover:text-stone-800 text-sm font-medium transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
            : <div />
          }
          {step < 2
            ? <button onClick={() => setStep(s => s + 1)} disabled={!canNext()} className="flex items-center gap-2 bg-rose-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-800 disabled:opacity-40 transition-all active:scale-95">Aage badhein <ArrowRight className="w-4 h-4" /></button>
            : <button onClick={handleSubmit} disabled={!canNext() || loading} className="flex items-center gap-2 bg-rose-700 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-rose-800 disabled:opacity-40 transition-all active:scale-95">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Create dashboard 🎉
              </button>
          }
        </div>
      </div>
    </div>
  )
}
