'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calculator, Copy, Check } from 'lucide-react'

type Celebration = {
  id: string; bride_name: string | null; groom_name: string | null
  guest_count: number | null; city: string | null; wedding_style: string | null
}

const CITY_TIERS = [
  { value: 'metro', label: 'Metro', desc: 'Delhi, Mumbai, Bengaluru' },
  { value: 'tier2', label: 'Tier 2', desc: 'Jaipur, Pune, Chandigarh' },
  { value: 'tier3', label: 'Tier 3', desc: 'Smaller cities & towns' },
]

const STYLES = [
  { value: 'simple', label: 'Simple', emoji: '🤍', factor: 0.6 },
  { value: 'intimate', label: 'Intimate', emoji: '🌸', factor: 0.8 },
  { value: 'traditional', label: 'Traditional', emoji: '🎊', factor: 1.0 },
  { value: 'destination', label: 'Destination', emoji: '🏰', factor: 1.35 },
]

// [metro_min, metro_max, tier2_min, tier2_max, tier3_min, tier3_max]
// Tightened ranges — realistic 2024-25 Indian wedding costs
type CatData = {
  label: string; emoji: string
  perPlate?: boolean; accommodation?: boolean
  metro: [number, number]; tier2: [number, number]; tier3: [number, number]
  // % share for budget-allocation mode
  share: number
}

const CATEGORIES: CatData[] = [
  { label: 'Venue',                emoji: '🏛️', share: 18, metro: [250000, 700000],  tier2: [120000, 400000],  tier3: [50000, 180000] },
  { label: 'Catering',             emoji: '🍽️', share: 27, perPlate: true, metro: [900, 1600],      tier2: [600, 1100],      tier3: [400, 750] },
  { label: 'Decoration',           emoji: '🌸', share: 14, metro: [150000, 500000],  tier2: [80000, 280000],   tier3: [35000, 130000] },
  { label: 'Photography & Video',  emoji: '📷', share: 10, metro: [80000, 280000],   tier2: [45000, 160000],   tier3: [20000, 80000] },
  { label: 'Music & Entertainment',emoji: '🎵', share: 6,  metro: [60000, 200000],   tier2: [35000, 110000],   tier3: [15000, 55000] },
  { label: 'Mehandi',              emoji: '🪷', share: 2,  metro: [15000, 55000],    tier2: [8000, 35000],     tier3: [4000, 18000] },
  { label: 'Makeup & Hair',        emoji: '💄', share: 3,  metro: [20000, 70000],    tier2: [12000, 45000],    tier3: [6000, 22000] },
  { label: 'Pandit & Ceremonies',  emoji: '🪔', share: 2,  metro: [10000, 35000],    tier2: [6000, 22000],     tier3: [3000, 12000] },
  { label: 'Invitations',          emoji: '💌', share: 2,  metro: [12000, 50000],    tier2: [7000, 30000],     tier3: [3000, 15000] },
  { label: 'Transport',            emoji: '🚌', share: 4,  metro: [35000, 130000],   tier2: [20000, 75000],    tier3: [10000, 35000] },
  { label: 'Accommodation',        emoji: '🏨', share: 8,  accommodation: true, perPlate: true, metro: [2500, 6000], tier2: [1200, 3200], tier3: [600, 1800] },
  { label: 'Gifts & Favours',      emoji: '🎁', share: 4,  perPlate: true, metro: [200, 600],      tier2: [150, 450],      tier3: [80, 250] },
]

function fmt(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

type Mode = 'estimate' | 'allocate'

export default function BudgetCalcClient({ celebrationId, celebration }: { celebrationId: string; celebration: Celebration }) {
  const [mode, setMode] = useState<Mode>('estimate')

  // Estimate mode state
  const [guests, setGuests] = useState(celebration.guest_count ?? 150)
  const [guestInput, setGuestInput] = useState(String(celebration.guest_count ?? 150))
  const [cityTier, setCityTier] = useState<'metro' | 'tier2' | 'tier3'>('tier2')
  const [style, setStyle] = useState(celebration.wedding_style ?? 'traditional')
  const [outstation, setOutstation] = useState(20)
  const [copied, setCopied] = useState(false)

  // Allocate mode state
  const [budget, setBudget] = useState('')
  const [allocGuests, setAllocGuests] = useState(String(celebration.guest_count ?? 150))
  const [allocOutstation, setAllocOutstation] = useState(20)

  const factor = STYLES.find(s => s.value === style)?.factor ?? 1.0

  // Estimate mode calculation
  const estimates = useMemo(() => {
    return CATEGORIES.map(cat => {
      const [rawMin, rawMax] = cat[cityTier]
      let min = rawMin * factor
      let max = rawMax * factor
      if (cat.perPlate) {
        const count = cat.accommodation ? Math.round(guests * outstation / 100) : guests
        min = min * count
        max = max * count
      }
      return { ...cat, min: Math.round(min), max: Math.round(max) }
    })
  }, [guests, cityTier, style, outstation, factor])

  const totalMin = estimates.reduce((s, e) => s + e.min, 0)
  const totalMax = estimates.reduce((s, e) => s + e.max, 0)

  // Allocate mode calculation
  const allocations = useMemo(() => {
    const total = parseInt(budget.replace(/,/g, '')) || 0
    const ag = parseInt(allocGuests) || 150
    return CATEGORIES.map(cat => ({
      ...cat,
      allocated: Math.round(total * cat.share / 100),
      perPerson: cat.perPlate
        ? Math.round((total * cat.share / 100) / (cat.accommodation ? Math.round(ag * allocOutstation / 100) || 1 : ag))
        : null,
    }))
  }, [budget, allocGuests, allocOutstation])

  function handleGuestInput(val: string) {
    setGuestInput(val)
    const n = parseInt(val)
    if (!isNaN(n) && n >= 1 && n <= 5000) setGuests(n)
  }

  function copyEstimate() {
    const lines = [
      `Wedding Budget Estimate`,
      `${guests} guests · ${CITY_TIERS.find(c => c.value === cityTier)?.label} · ${STYLES.find(s => s.value === style)?.label}`,
      `Total: ${fmt(totalMin)} – ${fmt(totalMax)}`,
      '',
      ...estimates.map(e => `${e.emoji} ${e.label}: ${fmt(e.min)} – ${fmt(e.max)}`),
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const budgetNum = parseInt(budget.replace(/,/g, '')) || 0

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-12 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/my/${celebrationId}/tools`} className="text-stone-400 hover:text-stone-700">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-600" /> Budget Calculator
          </h1>
          <p className="text-xs text-stone-400">Realistic estimates based on 2024–25 Indian wedding data</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
        <button onClick={() => setMode('estimate')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'estimate' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
          Estimate for me
        </button>
        <button onClick={() => setMode('allocate')}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${mode === 'allocate' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
          I have a budget
        </button>
      </div>

      {/* ── ESTIMATE MODE ── */}
      {mode === 'estimate' && (
        <>
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-5">
            {/* Guest count — slider + input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-stone-700">Guest count</label>
                <input
                  type="number" min={1} max={5000} value={guestInput}
                  onChange={e => handleGuestInput(e.target.value)}
                  className="w-20 text-sm font-bold text-rose-700 text-right border border-stone-200 rounded-lg px-2 py-1 focus:outline-none focus:border-rose-400"
                />
              </div>
              <input type="range" min={25} max={2000} step={25} value={guests}
                onChange={e => { setGuests(Number(e.target.value)); setGuestInput(String(e.target.value)) }}
                className="w-full accent-rose-600" />
              <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                <span>25</span><span>500</span><span>1000</span><span>2000</span>
              </div>
            </div>

            {/* Outstation % */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-stone-700">Outstation guests <span className="text-stone-400 font-normal">(need accommodation)</span></label>
                <span className="text-sm font-bold text-rose-700">{outstation}% · {Math.round(guests * outstation / 100)} pax</span>
              </div>
              <input type="range" min={0} max={80} step={5} value={outstation}
                onChange={e => setOutstation(Number(e.target.value))}
                className="w-full accent-rose-600" />
            </div>

            {/* City tier */}
            <div>
              <label className="text-sm font-semibold text-stone-700 block mb-2">City</label>
              <div className="grid grid-cols-3 gap-2">
                {CITY_TIERS.map(c => (
                  <button key={c.value} onClick={() => setCityTier(c.value as 'metro' | 'tier2' | 'tier3')}
                    className={`text-left p-2.5 rounded-xl border-2 transition-all ${cityTier === c.value ? 'border-rose-600 bg-rose-50' : 'border-stone-100 hover:border-stone-200'}`}>
                    <p className={`text-xs font-bold ${cityTier === c.value ? 'text-rose-700' : 'text-stone-700'}`}>{c.label}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5 leading-tight">{c.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Style */}
            <div>
              <label className="text-sm font-semibold text-stone-700 block mb-2">Wedding style</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {STYLES.map(s => (
                  <button key={s.value} onClick={() => setStyle(s.value)}
                    className={`p-2.5 rounded-xl border-2 text-center transition-all ${style === s.value ? 'border-rose-600 bg-rose-50' : 'border-stone-100 hover:border-stone-200'}`}>
                    <p className="text-xl">{s.emoji}</p>
                    <p className={`text-[11px] font-semibold mt-0.5 ${style === s.value ? 'text-rose-700' : 'text-stone-600'}`}>{s.label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="bg-rose-700 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-rose-200 text-xs font-medium">Estimated total</p>
              <p className="text-white text-2xl font-bold mt-0.5">{fmt(totalMin)} – {fmt(totalMax)}</p>
              <p className="text-rose-300 text-xs mt-1">{guests} guests · {CITY_TIERS.find(c => c.value === cityTier)?.label} · {STYLES.find(s => s.value === style)?.label}</p>
            </div>
            <button onClick={copyEstimate}
              className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors flex-shrink-0">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Category breakdown */}
          <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-5 py-3 border-b border-stone-100">Breakdown</p>
            <div className="divide-y divide-stone-50">
              {estimates.map(e => {
                const pct = totalMax > 0 ? (e.max / totalMax) * 100 : 0
                return (
                  <div key={e.label} className="px-5 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{e.emoji}</span>
                        <span className="text-sm font-medium text-stone-700">{e.label}</span>
                        {e.perPlate && <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">per guest</span>}
                      </div>
                      <span className="text-sm font-semibold text-stone-800 text-right">{fmt(e.min)} – {fmt(e.max)}</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-1">
                      <div className="bg-rose-400 h-1 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ── ALLOCATE MODE ── */}
      {mode === 'allocate' && (
        <>
          <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-sm font-semibold text-stone-700 block mb-1.5">My total budget (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm font-medium">₹</span>
                <input
                  type="number" value={budget} onChange={e => setBudget(e.target.value)}
                  placeholder="e.g. 2500000"
                  className="w-full pl-7 pr-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-emerald-400 font-medium"
                />
              </div>
              {budgetNum > 0 && (
                <p className="text-xs text-emerald-600 font-medium mt-1">{fmt(budgetNum)} total budget</p>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold text-stone-700 block mb-1.5">Guest count</label>
              <input
                type="number" min={1} max={5000} value={allocGuests}
                onChange={e => setAllocGuests(e.target.value)}
                placeholder="150"
                className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-stone-700">Outstation guests</label>
                <span className="text-sm font-bold text-emerald-600">{allocOutstation}%</span>
              </div>
              <input type="range" min={0} max={80} step={5} value={allocOutstation}
                onChange={e => setAllocOutstation(Number(e.target.value))}
                className="w-full accent-emerald-600" />
            </div>
          </div>

          {budgetNum > 0 ? (
            <>
              <div className="bg-emerald-700 rounded-2xl p-5">
                <p className="text-emerald-200 text-xs font-medium">Your budget</p>
                <p className="text-white text-2xl font-bold mt-0.5">{fmt(budgetNum)}</p>
                <p className="text-emerald-300 text-xs mt-1">
                  ≈ {fmt(Math.round(budgetNum / (parseInt(allocGuests) || 1)))} per guest · {allocGuests} guests
                </p>
              </div>

              <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-5 py-3 border-b border-stone-100">Recommended allocation</p>
                <div className="divide-y divide-stone-50">
                  {allocations.map(a => {
                    const pct = a.share
                    const ag = parseInt(allocGuests) || 150
                    const outstationCount = Math.round(ag * allocOutstation / 100)
                    const perPersonCount = a.accommodation ? outstationCount || 1 : ag
                    return (
                      <div key={a.label} className="px-5 py-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{a.emoji}</span>
                            <span className="text-sm font-medium text-stone-700">{a.label}</span>
                            <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">{a.share}%</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-stone-800">{fmt(a.allocated)}</p>
                            {a.perPlate && a.allocated > 0 && (
                              <p className="text-[10px] text-stone-400">{fmt(Math.round(a.allocated / perPersonCount))}/person</p>
                            )}
                          </div>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-1">
                          <div className="bg-emerald-400 h-1 rounded-full" style={{ width: `${pct * 3}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <p className="text-[11px] text-stone-400 text-center leading-relaxed px-4">
                Allocation based on typical Indian wedding spending patterns. Adjust per your priorities.
              </p>
            </>
          ) : (
            <div className="text-center py-10 border-2 border-dashed border-stone-200 rounded-2xl">
              <p className="text-stone-400 text-sm">Enter your budget above to see category allocation</p>
            </div>
          )}
        </>
      )}

      <p className="text-[11px] text-stone-400 text-center leading-relaxed px-4">
        Estimates are indicative. Actual costs depend on vendor, season & specific requirements.
      </p>
    </div>
  )
}
