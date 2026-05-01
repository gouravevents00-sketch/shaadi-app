'use client'

import { useState, useTransition } from 'react'
import { Sparkles, ChevronRight, ChevronLeft, Check, Loader2, Users, IndianRupee, Utensils, Palette, Star, FileText, X, ShoppingBag, CheckSquare } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { AiSetupPlan } from '@/app/api/ai/wedding-setup/[weddingId]/route'
import { applyAiPlan } from './aiSetupActions'

const ALL_CEREMONIES = [
  'Ganesh Poojan', 'Mehandi', 'Haldi', 'Sagai', 'Mayera',
  'Sham-e-Mehfil', 'Sangeet', 'Cocktail', 'Baraat', 'Pheras', 'Vidai',
  'Reception', 'Lunch', 'Dinner', 'Grah Pravesh',
]

const THEMES = [
  { value: 'Traditional Indian',  emoji: '🪔', desc: 'Classic, heritage, marigold & temple decor' },
  { value: 'Modern Luxury',       emoji: '✨', desc: 'Premium venues, contemporary, minimal' },
  { value: 'Destination Wedding', emoji: '🏰', desc: 'Palace / resort / outdoor setting' },
  { value: 'Garden & Floral',     emoji: '🌸', desc: 'Outdoor, floral, romantic, pastel' },
  { value: 'Fusion',              emoji: '🎨', desc: 'Mix of styles, creative & personalized' },
]

const PRIORITIES = [
  { value: 'Photography & Video', icon: '📸', desc: 'Memories that last forever' },
  { value: 'Food & Catering',     icon: '🍽️', desc: 'Guests remember the food' },
  { value: 'Decoration & Decor',  icon: '🌺', desc: 'Stunning visual experience' },
  { value: 'Music & Entertainment', icon: '🎵', desc: 'Energy and vibe of the event' },
  { value: 'Budget Discipline',   icon: '💰', desc: 'Stay on target, no surprises' },
]

const VENDOR_CATEGORIES = [
  'Photography', 'Videography', 'Catering', 'Decoration', 'Venue',
  'Music & DJ', 'Mehandi Artist', 'Makeup & Hair', 'Pandit', 'Transportation',
]

interface Props {
  weddingId: string
  weddingName: string
  ceremonies: string[]      // existing ceremony names from DB
  weddingDate: string | null
  daysLeft: number | null
}

const TOTAL_STEPS = 7

function StepDots({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mt-6">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div key={i} className={`rounded-full transition-all ${i === current ? 'w-5 h-2 bg-rose-500' : i < current ? 'w-2 h-2 bg-rose-200' : 'w-2 h-2 bg-stone-200'}`} />
      ))}
    </div>
  )
}

function StatPill({ label, value, color = 'stone' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg bg-${color}-50 border border-${color}-100`}>
      <span className={`text-xs font-medium text-${color}-500`}>{label}</span>
      <span className={`text-sm font-semibold text-${color}-800`}>{value}</span>
    </div>
  )
}

export default function AiSetupWizard({ weddingId, weddingName, ceremonies, weddingDate, daysLeft }: Props) {
  const [open, setOpen]       = useState(false)
  const [step, setStep]       = useState(0)

  // Form state
  const [selectedCeremonies, setSelectedCeremonies] = useState<string[]>(ceremonies)
  const [guestCount, setGuestCount]     = useState(150)
  const [brideSide, setBrideSide]       = useState(70)
  const [groomSide, setGroomSide]       = useState(80)
  const [budget, setBudget]             = useState(2000000)
  const [vegPct, setVegPct]             = useState(60)
  const [nonVegPct, setNonVegPct]       = useState(30)
  const [jainPct, setJainPct]           = useState(10)
  const [theme, setTheme]               = useState('')
  const [priority, setPriority]         = useState('')
  const [accommodation, setAccommodation] = useState(0)
  const [bookedCategories, setBookedCategories] = useState<string[]>([])
  const [notes, setNotes]               = useState('')

  // AI state
  const [generating, setGenerating]   = useState(false)
  const [plan, setPlan]               = useState<AiSetupPlan | null>(null)
  const [genError, setGenError]       = useState('')
  const [applying, startApply]        = useTransition()
  const [applied, setApplied]         = useState<{ vendors: number; budget: number; checklist: number } | null>(null)

  function reset() {
    setStep(0); setPlan(null); setGenError(''); setApplied(null)
    setSelectedCeremonies(ceremonies); setGuestCount(150); setBrideSide(70); setGroomSide(80)
    setBudget(2000000); setVegPct(60); setNonVegPct(30); setJainPct(10)
    setTheme(''); setPriority(''); setAccommodation(0); setBookedCategories([]); setNotes('')
  }

  function handleOpen() { reset(); setOpen(true) }

  function toggleCeremony(c: string) {
    setSelectedCeremonies(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }
  function toggleBooked(cat: string) {
    setBookedCategories(prev => prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat])
  }

  function fmtBudget(n: number) {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
    if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`
    return `₹${n.toLocaleString('en-IN')}`
  }

  async function handleGenerate() {
    setGenerating(true); setGenError('')
    try {
      const res = await fetch(`/api/ai/wedding-setup/${weddingId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ceremonies: selectedCeremonies, guestCount, brideSide, groomSide,
          budget, vegPct, nonVegPct, jainPct,
          bookedCategories, theme, accommodation, priority, notes,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Generation failed')
      setPlan(data.plan)
      setStep(6)
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setGenerating(false)
    }
  }

  function handleApply() {
    if (!plan) return
    startApply(async () => {
      const result = await applyAiPlan(weddingId, plan, weddingDate)
      if (result.error) { setGenError(result.error); return }
      setApplied(result)
    })
  }

  const canNext = [
    selectedCeremonies.length > 0,          // step 0
    guestCount > 0,                          // step 1
    budget > 0,                              // step 2
    vegPct + nonVegPct + jainPct <= 100,     // step 3
    theme !== '',                            // step 4
    priority !== '',                         // step 5
    true,                                    // step 6 (notes, optional)
  ][step]

  // ── Render steps ────────────────────────────────────────────────────────────

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border border-rose-200"
      >
        <Sparkles className="w-3.5 h-3.5" />
        Setup with AI
      </button>

      <Dialog open={open} onOpenChange={v => { if (!v) setOpen(false) }}>
        <DialogContent className="max-w-lg w-full overflow-hidden p-0">
          {/* Header */}
          <div className="bg-gradient-to-br from-rose-600 to-rose-700 px-6 pt-6 pb-5 text-white">
            <DialogHeader>
              <DialogTitle className="text-white text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                AI Wedding Setup
              </DialogTitle>
            </DialogHeader>
            <p className="text-rose-100 text-sm mt-1">
              {applied ? `${weddingName} — setup complete!` : `${weddingName} · ${daysLeft !== null && daysLeft > 0 ? `${daysLeft} days to go` : 'Plan your big day'}`}
            </p>
            {step < TOTAL_STEPS && !applied && !generating && (
              <div className="mt-3 bg-rose-800/30 rounded-lg px-3 py-1.5 text-xs text-rose-100 font-medium">
                Question {step + 1} of {TOTAL_STEPS}
              </div>
            )}
          </div>

          <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">

            {/* ── SUCCESS ── */}
            {applied && (
              <div className="text-center py-4 space-y-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-8 h-8 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-stone-900">Your plan is live!</p>
                  <p className="text-sm text-stone-500 mt-1">AI has set up {weddingName}. Review and refine from each section.</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <ShoppingBag className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-blue-700">{applied.vendors}</p>
                    <p className="text-xs text-blue-500">Vendors</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <IndianRupee className="w-5 h-5 text-green-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-green-700">{applied.budget}</p>
                    <p className="text-xs text-green-500">Budget items</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3 text-center">
                    <CheckSquare className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-purple-700">{applied.checklist}</p>
                    <p className="text-xs text-purple-500">Tasks</p>
                  </div>
                </div>
                {plan?.insights && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800 text-left">
                    <p className="font-medium text-amber-900 text-xs uppercase tracking-wide mb-1">AI Insights</p>
                    {plan.insights}
                  </div>
                )}
                <Button onClick={() => setOpen(false)} className="w-full bg-rose-600 hover:bg-rose-700">
                  View my wedding
                </Button>
              </div>
            )}

            {/* ── GENERATING ── */}
            {generating && !applied && (
              <div className="text-center py-8 space-y-4">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 bg-rose-100 rounded-full animate-ping opacity-40" />
                  <div className="relative w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-rose-500 animate-pulse" />
                  </div>
                </div>
                <div>
                  <p className="text-base font-semibold text-stone-800">Generating your plan...</p>
                  <p className="text-sm text-stone-400 mt-1">AI is building vendors, budget & checklist tailored to {weddingName}</p>
                </div>
              </div>
            )}

            {/* ── PLAN PREVIEW (step 6) ── */}
            {plan && !generating && !applied && (
              <div className="space-y-4">
                <p className="text-sm text-stone-600">Review your AI-generated plan below. Apply it to instantly populate vendors, budget, and checklist.</p>

                {genError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{genError}</p>}

                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-blue-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{plan.vendors?.length ?? 0}</p>
                    <p className="text-xs text-blue-500 mt-0.5">Vendors</p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{plan.budget?.length ?? 0}</p>
                    <p className="text-xs text-green-500 mt-0.5">Budget items</p>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-purple-700">{plan.checklist?.length ?? 0}</p>
                    <p className="text-xs text-purple-500 mt-0.5">Tasks</p>
                  </div>
                </div>

                {/* Must-have vendors */}
                {plan.vendors?.filter(v => v.priority === 'must').length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Critical vendors to book</p>
                    <div className="space-y-1.5">
                      {plan.vendors.filter(v => v.priority === 'must').slice(0, 5).map((v, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-stone-700">
                          <span className="w-1.5 h-1.5 bg-rose-400 rounded-full flex-shrink-0" />
                          <span className="font-medium">{v.category}</span>
                          {v.estimated > 0 && <span className="text-stone-400 text-xs ml-auto">~₹{(v.estimated / 1000).toFixed(0)}K</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top budget items */}
                {plan.budget?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Top budget allocations</p>
                    <div className="space-y-1">
                      {[...plan.budget].sort((a, b) => b.estimated - a.estimated).slice(0, 4).map((b, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-stone-600 truncate max-w-[60%]">{b.item}</span>
                          <span className="text-stone-800 font-medium text-xs">₹{b.estimated >= 100000 ? `${(b.estimated / 100000).toFixed(1)}L` : b.estimated.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {plan.insights && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
                    <p className="font-medium text-amber-900 text-xs uppercase tracking-wide mb-1">AI Insights</p>
                    {plan.insights}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" onClick={() => { setPlan(null); setStep(5) }} className="flex-1 text-sm">
                    Re-answer
                  </Button>
                  <Button onClick={handleApply} disabled={applying} className="flex-2 bg-rose-600 hover:bg-rose-700 text-white px-6">
                    {applying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                    Apply to wedding
                  </Button>
                </div>
              </div>
            )}

            {/* ── QUESTIONS ── */}
            {!generating && !plan && !applied && (
              <>
                {/* Step 0: Ceremonies */}
                {step === 0 && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-base font-semibold text-stone-900">Which ceremonies are you planning?</p>
                      <p className="text-sm text-stone-400 mt-0.5">Select all that apply</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ALL_CEREMONIES.map(c => (
                        <button
                          key={c}
                          onClick={() => toggleCeremony(c)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                            selectedCeremonies.includes(c)
                              ? 'bg-rose-600 text-white border-rose-600'
                              : 'bg-white text-stone-600 border-stone-200 hover:border-rose-300'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    {selectedCeremonies.length > 0 && (
                      <p className="text-xs text-stone-400">{selectedCeremonies.length} ceremonies selected</p>
                    )}
                  </div>
                )}

                {/* Step 1: Guest count */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-base font-semibold text-stone-900 flex items-center gap-2">
                        <Users className="w-4 h-4 text-rose-500" />
                        How many guests are you expecting?
                      </p>
                      <p className="text-sm text-stone-400 mt-0.5">Total headcount for the main wedding</p>
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 font-medium">Total guests</label>
                      <div className="flex items-center gap-3 mt-1">
                        <button onClick={() => setGuestCount(Math.max(10, guestCount - 10))} className="w-8 h-8 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-50 font-bold">−</button>
                        <input
                          type="number" value={guestCount} min={10} max={5000}
                          onChange={e => setGuestCount(Number(e.target.value))}
                          className="w-24 text-2xl font-bold text-center text-stone-900 border-b-2 border-rose-300 focus:border-rose-500 outline-none bg-transparent"
                        />
                        <button onClick={() => setGuestCount(guestCount + 10)} className="w-8 h-8 rounded-full border border-stone-200 text-stone-600 hover:bg-stone-50 font-bold">+</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-stone-500 font-medium">Bride&apos;s side</label>
                        <input
                          type="number" value={brideSide} min={0}
                          onChange={e => setBrideSide(Number(e.target.value))}
                          className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-rose-400"
                          placeholder="70"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-stone-500 font-medium">Groom&apos;s side</label>
                        <input
                          type="number" value={groomSide} min={0}
                          onChange={e => setGroomSide(Number(e.target.value))}
                          className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-rose-400"
                          placeholder="80"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Budget */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-base font-semibold text-stone-900 flex items-center gap-2">
                        <IndianRupee className="w-4 h-4 text-rose-500" />
                        What&apos;s the total wedding budget?
                      </p>
                      <p className="text-sm text-stone-400 mt-0.5">Including all ceremonies, venues, vendors</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 border-b-2 border-rose-300 pb-2">
                        <span className="text-2xl font-bold text-stone-400">₹</span>
                        <input
                          type="number" value={budget} min={100000}
                          onChange={e => setBudget(Number(e.target.value))}
                          className="flex-1 text-2xl font-bold text-stone-900 outline-none bg-transparent"
                        />
                      </div>
                      <p className="text-sm text-rose-600 font-semibold mt-2">{fmtBudget(budget)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[500000, 1000000, 2000000, 3500000, 5000000, 10000000].map(b => (
                        <button key={b} onClick={() => setBudget(b)}
                          className={`px-3 py-1 rounded-lg text-sm border transition-colors ${budget === b ? 'bg-rose-600 text-white border-rose-600' : 'border-stone-200 text-stone-600 hover:border-rose-300'}`}>
                          {fmtBudget(b)}
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="text-xs text-stone-500 font-medium">Outstation guests needing accommodation</label>
                      <input
                        type="number" value={accommodation} min={0}
                        onChange={e => setAccommodation(Number(e.target.value))}
                        className="mt-1 w-full px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-rose-400"
                        placeholder="0 if not applicable"
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Dietary */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-base font-semibold text-stone-900 flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-rose-500" />
                        Approximate dietary breakdown of guests?
                      </p>
                      <p className="text-sm text-stone-400 mt-0.5">Helps plan catering quantities accurately</p>
                    </div>
                    {[
                      { label: 'Veg',     value: vegPct,    set: setVegPct,    color: 'emerald' },
                      { label: 'Non-Veg', value: nonVegPct, set: setNonVegPct, color: 'rose' },
                      { label: 'Jain',    value: jainPct,   set: setJainPct,   color: 'amber' },
                    ].map(({ label, value, set, color }) => (
                      <div key={label}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-sm font-medium text-stone-700">{label}</label>
                          <div className="flex items-center gap-1">
                            <input type="number" value={value} min={0} max={100}
                              onChange={e => set(Number(e.target.value))}
                              className="w-14 text-center border border-stone-200 rounded px-1 py-0.5 text-sm font-semibold" />
                            <span className="text-stone-400 text-sm">%</span>
                          </div>
                        </div>
                        <div className="h-2 bg-stone-100 rounded-full">
                          <div className={`h-full bg-${color}-400 rounded-full transition-all`} style={{ width: `${Math.min(100, value)}%` }} />
                        </div>
                      </div>
                    ))}
                    {vegPct + nonVegPct + jainPct > 100 && (
                      <p className="text-xs text-red-500">Total exceeds 100% — please adjust</p>
                    )}
                    <p className="text-xs text-stone-400">Total: {vegPct + nonVegPct + jainPct}% ({100 - vegPct - nonVegPct - jainPct}% other)</p>
                  </div>
                )}

                {/* Step 4: Theme */}
                {step === 4 && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-base font-semibold text-stone-900 flex items-center gap-2">
                        <Palette className="w-4 h-4 text-rose-500" />
                        What&apos;s the wedding vibe?
                      </p>
                      <p className="text-sm text-stone-400 mt-0.5">Choose the overall theme and style</p>
                    </div>
                    <div className="space-y-2">
                      {THEMES.map(t => (
                        <button key={t.value} onClick={() => setTheme(t.value)}
                          className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors flex items-center gap-3 ${
                            theme === t.value ? 'border-rose-500 bg-rose-50' : 'border-stone-100 hover:border-stone-200 bg-white'
                          }`}>
                          <span className="text-xl">{t.emoji}</span>
                          <div>
                            <p className={`text-sm font-semibold ${theme === t.value ? 'text-rose-800' : 'text-stone-800'}`}>{t.value}</p>
                            <p className="text-xs text-stone-400">{t.desc}</p>
                          </div>
                          {theme === t.value && <Check className="w-4 h-4 text-rose-500 ml-auto" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 5: Priority + Already booked */}
                {step === 5 && (
                  <div className="space-y-5">
                    <div>
                      <p className="text-base font-semibold text-stone-900 flex items-center gap-2">
                        <Star className="w-4 h-4 text-rose-500" />
                        What&apos;s your top priority?
                      </p>
                      <p className="text-sm text-stone-400 mt-0.5">AI will weight budget suggestions around this</p>
                    </div>
                    <div className="space-y-2">
                      {PRIORITIES.map(p => (
                        <button key={p.value} onClick={() => setPriority(p.value)}
                          className={`w-full text-left px-4 py-2.5 rounded-xl border-2 transition-colors flex items-center gap-3 ${
                            priority === p.value ? 'border-rose-500 bg-rose-50' : 'border-stone-100 hover:border-stone-200 bg-white'
                          }`}>
                          <span className="text-lg">{p.icon}</span>
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${priority === p.value ? 'text-rose-800' : 'text-stone-700'}`}>{p.value}</p>
                            <p className="text-xs text-stone-400">{p.desc}</p>
                          </div>
                          {priority === p.value && <Check className="w-4 h-4 text-rose-500" />}
                        </button>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-2">Already confirmed vendors (skip in suggestions)</p>
                      <div className="flex flex-wrap gap-2">
                        {VENDOR_CATEGORIES.map(cat => (
                          <button key={cat} onClick={() => toggleBooked(cat)}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                              bookedCategories.includes(cat) ? 'bg-emerald-600 text-white border-emerald-600' : 'border-stone-200 text-stone-600 hover:border-emerald-300'
                            }`}>
                            {bookedCategories.includes(cat) && '✓ '}{cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 6: Notes */}
                {step === 6 && !plan && !generating && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-base font-semibold text-stone-900 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-rose-500" />
                        Any special requirements?
                      </p>
                      <p className="text-sm text-stone-400 mt-0.5">Optional — anything AI should know about this wedding</p>
                    </div>
                    <textarea
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      rows={4}
                      placeholder="e.g. No alcohol, client is very budget-conscious, bride's family is Jain, outdoor ceremonies preferred..."
                      className="w-full px-3 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-700 placeholder:text-stone-300 focus:outline-none focus:border-rose-400 resize-none"
                    />
                    <div className="bg-rose-50 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-semibold text-rose-800">Your plan summary</p>
                      <div className="flex flex-wrap gap-1.5">
                        <StatPill label="Ceremonies" value={selectedCeremonies.length} color="rose" />
                        <StatPill label="Guests" value={guestCount} color="stone" />
                        <StatPill label="Budget" value={fmtBudget(budget)} color="stone" />
                        <StatPill label="Theme" value={theme} color="stone" />
                      </div>
                    </div>
                    {genError && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{genError}</p>}
                  </div>
                )}

                <StepDots current={step} />
              </>
            )}
          </div>

          {/* Footer nav */}
          {!generating && !applied && (
            <div className="px-6 pb-5 flex items-center gap-3 border-t border-stone-100 pt-4">
              {step > 0 && !plan && (
                <button onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-1 text-sm text-stone-400 hover:text-stone-600">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>
              )}
              {!plan && (
                <div className="ml-auto">
                  {step < 6 ? (
                    <Button onClick={() => setStep(s => s + 1)} disabled={!canNext}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-5">
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  ) : (
                    <Button onClick={handleGenerate} disabled={!canNext || generating}
                      className="bg-rose-600 hover:bg-rose-700 text-white px-5">
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate my plan
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
