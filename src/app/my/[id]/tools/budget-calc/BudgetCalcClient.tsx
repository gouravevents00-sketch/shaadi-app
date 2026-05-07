'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calculator, Copy, Check } from 'lucide-react'

type Celebration = {
  id: string; bride_name: string | null; groom_name: string | null
  guest_count: number | null; city: string | null; wedding_style: string | null
}

const CITY_TIERS = [
  { value: 'metro', label: 'Metro', desc: 'Delhi, Mumbai, Bangalore, Chennai' },
  { value: 'tier2', label: 'Tier 2', desc: 'Jaipur, Pune, Hyderabad, Chandigarh' },
  { value: 'tier3', label: 'Tier 3', desc: 'Smaller cities & towns' },
]

const STYLES = [
  { value: 'simple', label: 'Simple', emoji: '🤍' },
  { value: 'intimate', label: 'Intimate', emoji: '🌸' },
  { value: 'traditional', label: 'Traditional Grand', emoji: '🎊' },
  { value: 'destination', label: 'Destination', emoji: '🏰' },
]

// Per-plate & per-event cost estimates in INR
// [metro_min, metro_max, tier2_min, tier2_max, tier3_min, tier3_max]
// Multiplied by style factor
const STYLE_FACTOR: Record<string, number> = { simple: 0.6, intimate: 0.8, traditional: 1.0, destination: 1.4 }

type CategoryData = {
  label: string
  perPlate?: boolean  // per guest
  fixed?: boolean     // fixed cost
  metro: [number, number]
  tier2: [number, number]
  tier3: [number, number]
  emoji: string
}

const CATEGORIES: CategoryData[] = [
  { label: 'Venue', fixed: true, emoji: '🏛️', metro: [300000, 1200000], tier2: [150000, 600000], tier3: [60000, 250000] },
  { label: 'Catering', perPlate: true, emoji: '🍽️', metro: [1000, 2000], tier2: [700, 1400], tier3: [450, 900] },
  { label: 'Decoration', fixed: true, emoji: '🌸', metro: [200000, 800000], tier2: [100000, 400000], tier3: [50000, 200000] },
  { label: 'Photography & Video', fixed: true, emoji: '📷', metro: [100000, 400000], tier2: [60000, 200000], tier3: [30000, 100000] },
  { label: 'Music & Entertainment', fixed: true, emoji: '🎵', metro: [80000, 300000], tier2: [50000, 150000], tier3: [25000, 80000] },
  { label: 'Mehandi', fixed: true, emoji: '🪷', metro: [25000, 80000], tier2: [15000, 50000], tier3: [8000, 25000] },
  { label: 'Makeup & Hair', fixed: true, emoji: '💄', metro: [30000, 100000], tier2: [20000, 60000], tier3: [10000, 30000] },
  { label: 'Pandit & Ceremonies', fixed: true, emoji: '🪔', metro: [15000, 50000], tier2: [10000, 35000], tier3: [5000, 20000] },
  { label: 'Invitation Cards', fixed: true, emoji: '💌', metro: [20000, 80000], tier2: [12000, 50000], tier3: [6000, 25000] },
  { label: 'Transport & Logistics', fixed: true, emoji: '🚌', metro: [50000, 200000], tier2: [30000, 120000], tier3: [15000, 60000] },
  { label: 'Accommodation', perPlate: true, emoji: '🏨', metro: [3000, 8000], tier2: [1500, 4000], tier3: [800, 2500] },
  { label: 'Gifts & Favours', perPlate: true, emoji: '🎁', metro: [300, 800], tier2: [200, 600], tier3: [100, 400] },
]

function fmt(n: number) {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}K`
  return `₹${n}`
}

export default function BudgetCalcClient({ celebrationId, celebration }: { celebrationId: string; celebration: Celebration }) {
  const [guests, setGuests] = useState(celebration.guest_count ?? 150)
  const [cityTier, setCityTier] = useState<'metro' | 'tier2' | 'tier3'>('tier2')
  const [style, setStyle] = useState(celebration.wedding_style ?? 'traditional')
  const [outstation, setOutstation] = useState(20) // % outstation guests needing accommodation
  const [copied, setCopied] = useState(false)

  const factor = STYLE_FACTOR[style] ?? 1.0

  const estimates = useMemo(() => {
    return CATEGORIES.map(cat => {
      const [rawMin, rawMax] = cat[cityTier]
      let min = rawMin * factor
      let max = rawMax * factor
      if (cat.perPlate) {
        const count = cat.label === 'Accommodation' ? Math.round(guests * outstation / 100) : guests
        min = min * count
        max = max * count
      }
      return { ...cat, min: Math.round(min), max: Math.round(max) }
    })
  }, [guests, cityTier, style, outstation, factor])

  const totalMin = estimates.reduce((s, e) => s + e.min, 0)
  const totalMax = estimates.reduce((s, e) => s + e.max, 0)

  function copyEstimate() {
    const lines = [
      `Wedding Budget Estimate`,
      `${guests} guests · ${CITY_TIERS.find(c => c.value === cityTier)?.label} city · ${STYLES.find(s => s.value === style)?.label}`,
      `Total: ${fmt(totalMin)} – ${fmt(totalMax)}`,
      '',
      ...estimates.map(e => `${e.emoji} ${e.label}: ${fmt(e.min)} – ${fmt(e.max)}`),
    ]
    navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-5 pb-12 space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/my/${celebrationId}/tools`} className="text-stone-400 hover:text-stone-700">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-stone-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-600" /> Budget Calculator
          </h1>
          <p className="text-xs text-stone-400">Estimated ranges based on Indian wedding data</p>
        </div>
      </div>

      {/* Inputs */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-5">
        {/* Guest count */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-stone-700">Guest count</label>
            <span className="text-sm font-bold text-rose-700">{guests}</span>
          </div>
          <input type="range" min={50} max={2000} step={25} value={guests}
            onChange={e => setGuests(Number(e.target.value))}
            className="w-full accent-rose-600" />
          <div className="flex justify-between text-[10px] text-stone-400 mt-1">
            <span>50</span><span>500</span><span>1000</span><span>2000</span>
          </div>
        </div>

        {/* Outstation % */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-semibold text-stone-700">Outstation guests (need accommodation)</label>
            <span className="text-sm font-bold text-rose-700">{outstation}%</span>
          </div>
          <input type="range" min={0} max={100} step={5} value={outstation}
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
                <p className="text-lg">{s.emoji}</p>
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
          className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-2 rounded-xl transition-colors">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Category breakdown */}
      <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider px-5 py-3 border-b border-stone-100">Category breakdown</p>
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
                  <span className="text-sm font-semibold text-stone-800">{fmt(e.min)} – {fmt(e.max)}</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-1">
                  <div className="bg-rose-400 h-1 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-[11px] text-stone-400 text-center leading-relaxed px-4">
        These are rough estimates based on average Indian wedding costs. Actual costs vary significantly by vendor, season, and specific requirements.
      </p>
    </div>
  )
}
